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

    console.log('Starting batch embedding generation...');

    // Get all knowledge entries without embeddings - fixed query
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

    if (!missingEmbeddings || missingEmbeddings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'All knowledge entries already have embeddings',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${missingEmbeddings.length} entries without embeddings`);

    let processed = 0;
    let failed = 0;

    // Process in smaller batches to avoid overwhelming the API
    const batchSize = 10;
    for (let batchStart = 0; batchStart < missingEmbeddings.length; batchStart += batchSize) {
      const batch = missingEmbeddings.slice(batchStart, batchStart + batchSize);
      console.log(`Processing batch ${Math.floor(batchStart / batchSize) + 1}/${Math.ceil(missingEmbeddings.length / batchSize)}`);

      for (const entry of batch) {
        try {
          // Create text content for embedding including all relevant info
          const textContent = `${entry.title}\n\n${entry.content}\n\nExpertise: ${entry.expertise_area}\nCoach: ${entry.coach_id}`;
          const chunks = splitIntoChunks(textContent, 8000); // Split large content

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

      // Wait between batches to avoid rate limits
      if (batchStart + batchSize < missingEmbeddings.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processed,
      failed,
      total: missingEmbeddings.length,
      message: `Generated embeddings for ${processed} chunks, ${failed} failed`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Batch embedding generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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