import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, job_id, batch_size = 50 } = await req.json();

    if (action === 'start') {
      return await startEmbeddingJob(supabase, openAIApiKey, batch_size);
    } else if (action === 'process_batch' && job_id) {
      return await processBatch(supabase, openAIApiKey, job_id);
    } else if (action === 'status' && job_id) {
      return await getJobStatus(supabase, job_id);
    } else {
      throw new Error('Invalid action or missing parameters');
    }

  } catch (error) {
    console.error('Batch embeddings job error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startEmbeddingJob(supabase: any, openAIApiKey: string, batch_size: number) {
  console.log('Starting embedding job...');

  // Get all knowledge entries without embeddings
  const { data: allKnowledge, error: allError } = await supabase
    .from('coach_knowledge_base')
    .select('id, title, content, coach_id, expertise_area');

  if (allError) {
    console.error('Error fetching all knowledge:', allError);
    throw allError;
  }

  // Get knowledge IDs that already have embeddings
  const { data: existingEmbeddings, error: embError } = await supabase
    .from('knowledge_base_embeddings')
    .select('knowledge_id');

  if (embError) {
    console.error('Error fetching existing embeddings:', embError);
    throw embError;
  }

  const existingIds = new Set(existingEmbeddings?.map(e => e.knowledge_id) || []);
  const missingEmbeddings = allKnowledge?.filter(k => !existingIds.has(k.id)) || [];

  console.log(`Total knowledge entries: ${allKnowledge?.length || 0}`);
  console.log(`Existing embeddings: ${existingIds.size}`);
  console.log(`Missing embeddings: ${missingEmbeddings.length}`);

  if (missingEmbeddings.length === 0) {
    return new Response(JSON.stringify({ 
      success: true,
      message: 'All knowledge entries already have embeddings',
      total_entries: 0,
      job_id: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create a new job
  const { data: job, error: jobError } = await supabase
    .from('embedding_generation_jobs')
    .insert({
      total_entries: missingEmbeddings.length,
      batch_size: batch_size,
      status: 'pending',
      metadata: {
        missing_knowledge_ids: missingEmbeddings.map(k => k.id)
      }
    })
    .select()
    .single();

  if (jobError) {
    console.error('Error creating job:', jobError);
    throw jobError;
  }

  console.log(`Created job ${job.id} for ${missingEmbeddings.length} entries`);

  return new Response(JSON.stringify({ 
    success: true,
    job_id: job.id,
    total_entries: missingEmbeddings.length,
    batch_size: batch_size,
    message: `Job created for ${missingEmbeddings.length} entries`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processBatch(supabase: any, openAIApiKey: string, job_id: string) {
  console.log(`Processing batch for job ${job_id}...`);

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('embedding_generation_jobs')
    .select('*')
    .eq('id', job_id)
    .single();

  if (jobError || !job) {
    throw new Error(`Job ${job_id} not found`);
  }

  if (job.status === 'completed') {
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Job already completed',
      job_status: job
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update job status to running
  await supabase
    .from('embedding_generation_jobs')
    .update({ 
      status: 'running',
      last_batch_at: new Date().toISOString()
    })
    .eq('id', job_id);

  const missingKnowledgeIds = job.metadata.missing_knowledge_ids || [];
  const startIndex = job.current_batch * job.batch_size;
  const endIndex = Math.min(startIndex + job.batch_size, missingKnowledgeIds.length);
  const currentBatchIds = missingKnowledgeIds.slice(startIndex, endIndex);

  if (currentBatchIds.length === 0) {
    // Mark job as completed
    await supabase
      .from('embedding_generation_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job_id);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Job completed - no more batches to process',
      job_status: 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get knowledge entries for this batch
  const { data: knowledgeEntries, error: knowledgeError } = await supabase
    .from('coach_knowledge_base')
    .select('id, title, content, coach_id, expertise_area')
    .in('id', currentBatchIds);

  if (knowledgeError) {
    console.error('Error fetching knowledge entries:', knowledgeError);
    throw knowledgeError;
  }

  let processed = 0;
  let failed = 0;

  // Process each entry in the batch
  for (const entry of knowledgeEntries) {
    try {
      const textContent = `${entry.title}\n\n${entry.content}\n\nExpertise: ${entry.expertise_area}\nCoach: ${entry.coach_id}`;
      const chunks = splitIntoChunks(textContent, 8000);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding using OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk,
            encoding_format: 'float',
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`Failed to generate embedding for ${entry.id} chunk ${i}:`, errorText);
          failed++;
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Insert embedding into database
        const { error: insertError } = await supabase
          .from('knowledge_base_embeddings')
          .insert({
            knowledge_id: entry.id,
            embedding,
            content_chunk: chunk,
            chunk_index: i,
            text_content: chunk
          });

        if (insertError) {
          console.error(`Failed to insert embedding for ${entry.id} chunk ${i}:`, insertError);
          failed++;
        } else {
          processed++;
          console.log(`✅ Generated embedding for ${entry.coach_id}/${entry.title} chunk ${i + 1}/${chunks.length}`);
        }

        // Rate limiting: wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing entry ${entry.id}:`, error);
      failed++;
    }
  }

  // Update job progress
  const newProcessedTotal = job.processed_entries + processed;
  const newFailedTotal = job.failed_entries + failed;
  const newCurrentBatch = job.current_batch + 1;
  const isCompleted = newCurrentBatch * job.batch_size >= job.total_entries;

  await supabase
    .from('embedding_generation_jobs')
    .update({
      processed_entries: newProcessedTotal,
      failed_entries: newFailedTotal,
      current_batch: newCurrentBatch,
      status: isCompleted ? 'completed' : 'running',
      completed_at: isCompleted ? new Date().toISOString() : null,
      last_batch_at: new Date().toISOString()
    })
    .eq('id', job_id);

  console.log(`Batch completed: ${processed} processed, ${failed} failed`);

  return new Response(JSON.stringify({ 
    success: true,
    processed,
    failed,
    batch_completed: true,
    job_completed: isCompleted,
    progress: {
      processed_entries: newProcessedTotal,
      failed_entries: newFailedTotal,
      total_entries: job.total_entries,
      current_batch: newCurrentBatch,
      percentage: Math.round((newProcessedTotal / job.total_entries) * 100)
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getJobStatus(supabase: any, job_id: string) {
  const { data: job, error } = await supabase
    .from('embedding_generation_jobs')
    .select('*')
    .eq('id', job_id)
    .single();

  if (error) {
    throw error;
  }

  const progress = {
    processed_entries: job.processed_entries,
    failed_entries: job.failed_entries,
    total_entries: job.total_entries,
    current_batch: job.current_batch,
    percentage: job.total_entries > 0 ? Math.round((job.processed_entries / job.total_entries) * 100) : 0,
    status: job.status
  };

  return new Response(JSON.stringify({ 
    success: true,
    job_status: job,
    progress
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
        currentChunk = trimmedSentence;
      } else {
        // Single sentence is too long, split it
        chunks.push(trimmedSentence.substring(0, maxLength));
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}