import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { EMBEDDING_CONFIG, callOpenAIWithRetry, logPerformanceMetrics } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, knowledge_id } = await req.json();
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'regenerate_all') {
      return await regenerateAllEmbeddings(supabase, openaiKey);
    } else if (action === 'regenerate_single' && knowledge_id) {
      return await regenerateSingleEmbedding(supabase, openaiKey, knowledge_id);
    } else {
      throw new Error('Invalid action or missing knowledge_id');
    }

  } catch (error) {
    console.error('❌ Optimized embeddings error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function regenerateAllEmbeddings(supabase: any, openaiKey: string) {
  console.log('🚀 Starting optimized embedding regeneration...');
  const startTime = Date.now();

  // Delete existing embeddings
  await supabase.from('knowledge_base_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Fetch all knowledge entries
  const { data: knowledgeEntries, error } = await supabase
    .from('coach_knowledge_base')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch knowledge entries: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;
  const batchSize = 5; // Process 5 entries in parallel for better throughput

  for (let i = 0; i < knowledgeEntries.length; i += batchSize) {
    const batch = knowledgeEntries.slice(i, i + batchSize);
    
    const promises = batch.map(async (entry) => {
      try {
        await processKnowledgeEntryOptimized(supabase, openaiKey, entry);
        processed++;
        console.log(`✅ Processed ${entry.title} (${processed}/${knowledgeEntries.length})`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to process ${entry.title}:`, error);
      }
    });

    await Promise.all(promises);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < knowledgeEntries.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logPerformanceMetrics('optimized-embeddings-all', EMBEDDING_CONFIG.model, startTime);

  return new Response(JSON.stringify({
    success: true,
    processed,
    failed,
    total: knowledgeEntries.length,
    embedding_model: EMBEDDING_CONFIG.model
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function regenerateSingleEmbedding(supabase: any, openaiKey: string, knowledgeId: string) {
  console.log(`🚀 Regenerating single embedding for: ${knowledgeId}`);
  const startTime = Date.now();

  // Delete existing embeddings for this entry
  await supabase
    .from('knowledge_base_embeddings')
    .delete()
    .eq('knowledge_id', knowledgeId);

  // Fetch the knowledge entry
  const { data: entry, error } = await supabase
    .from('coach_knowledge_base')
    .select('*')
    .eq('id', knowledgeId)
    .single();

  if (error || !entry) {
    throw new Error(`Knowledge entry not found: ${knowledgeId}`);
  }

  await processKnowledgeEntryOptimized(supabase, openaiKey, entry);

  logPerformanceMetrics('optimized-embeddings-single', EMBEDDING_CONFIG.model, startTime);

  return new Response(JSON.stringify({
    success: true,
    processed: 1,
    knowledgeId,
    embedding_model: EMBEDDING_CONFIG.model
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processKnowledgeEntryOptimized(supabase: any, openaiKey: string, entry: any) {
  const content = entry.content || '';
  
  // Optimized chunking: 256 tokens, 32 token overlap
  const chunks = createOptimizedChunks(content, EMBEDDING_CONFIG.chunk_size, EMBEDDING_CONFIG.overlap);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Enhanced text with metadata for better semantic understanding
    const enhancedText = `Title: ${entry.title || 'Untitled'}\nArea: ${entry.expertise_area || 'General'}\nType: ${entry.content_type || 'Information'}\nCoach: ${entry.coach_id || 'General'}\n\nContent: ${chunk}`;

    // Generate embedding with text-embedding-3-small
    const embedding = await generateOptimizedEmbedding(openaiKey, enhancedText);
    
    // Store in database
    const { error: insertError } = await supabase
      .from('knowledge_base_embeddings')
      .insert({
        knowledge_id: entry.id,
        content_chunk: chunk,
        chunk_index: i,
        embedding: embedding,
        metadata: {
          title: entry.title,
          expertise_area: entry.expertise_area,
          content_type: entry.content_type,
          coach_id: entry.coach_id,
          chunk_length: chunk.length,
          enhanced_length: enhancedText.length
        }
      });

    if (insertError) {
      throw new Error(`Failed to insert embedding: ${insertError.message}`);
    }
  }
}

function createOptimizedChunks(text: string, maxLength: number, overlap: number): string[] {
  if (!text || text.length === 0) return [''];
  
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let i = 0;
  
  while (i < sentences.length) {
    const sentence = sentences[i].trim();
    
    // Check if adding this sentence would exceed the limit
    if (currentChunk.length + sentence.length + 1 > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Calculate overlap: keep last 'overlap' characters
      const overlapText = currentChunk.slice(-overlap).trim();
      currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
    
    i++;
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [''];
}

async function generateOptimizedEmbedding(openaiKey: string, text: string): Promise<number[]> {
  const response = await callOpenAIWithRetry(async () => {
    return await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_CONFIG.model, // text-embedding-3-small
        input: text,
        dimensions: EMBEDDING_CONFIG.dimensions
      }),
    });
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
