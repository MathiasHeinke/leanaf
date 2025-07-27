import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      coach_knowledge_base: {
        Row: {
          id: string;
          coach_id: string;
          title: string;
          content: string;
          expertise_area: string;
          knowledge_type: string;
          created_at: string;
          updated_at: string;
        };
      };
      knowledge_base_embeddings: {
        Row: {
          id: string;
          knowledge_id: string;
          content_chunk: string;
          chunk_index: number;
          embedding: number[];
          metadata: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          knowledge_id: string;
          content_chunk: string;
          chunk_index: number;
          embedding: number[];
          metadata?: any;
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { knowledge_id, regenerate_all } = await req.json();

    if (regenerate_all) {
      console.log('Starting full knowledge base embedding generation...');
      return await generateAllEmbeddings(supabaseClient, openAIApiKey);
    } else if (knowledge_id) {
      console.log(`Generating embeddings for knowledge ID: ${knowledge_id}`);
      return await generateSingleEmbedding(supabaseClient, openAIApiKey, knowledge_id);
    } else {
      throw new Error('Either knowledge_id or regenerate_all must be specified');
    }

  } catch (error) {
    console.error('Error in generate-embeddings function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateAllEmbeddings(supabaseClient: any, openAIApiKey: string) {
  // Lösche alle existierenden Embeddings
  await supabaseClient.from('knowledge_base_embeddings').delete().gte('created_at', '1970-01-01');

  // Hole alle Knowledge Base Einträge
  const { data: knowledgeEntries, error } = await supabaseClient
    .from('coach_knowledge_base')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;

  let processed = 0;
  let failed = 0;

  for (const entry of knowledgeEntries) {
    try {
      await processKnowledgeEntry(supabaseClient, openAIApiKey, entry);
      processed++;
      console.log(`Processed ${processed}/${knowledgeEntries.length}: ${entry.title}`);
    } catch (error) {
      console.error(`Failed to process ${entry.title}:`, error);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      processed, 
      failed, 
      total: knowledgeEntries.length 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateSingleEmbedding(supabaseClient: any, openAIApiKey: string, knowledgeId: string) {
  // Lösche existierende Embeddings für diese Knowledge
  await supabaseClient
    .from('knowledge_base_embeddings')
    .delete()
    .eq('knowledge_id', knowledgeId);

  // Hole den Knowledge Entry
  const { data: entry, error } = await supabaseClient
    .from('coach_knowledge_base')
    .select('*')
    .eq('id', knowledgeId)
    .single();

  if (error) throw error;

  await processKnowledgeEntry(supabaseClient, openAIApiKey, entry);

  return new Response(
    JSON.stringify({ success: true, knowledge_id: knowledgeId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processKnowledgeEntry(supabaseClient: any, openAIApiKey: string, entry: any) {
  const chunks = chunkText(entry.content, 500); // 500 Zeichen pro Chunk
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Erstelle Enhanced Text für bessere Embeddings
    const enhancedText = `Titel: ${entry.title}\nBereich: ${entry.expertise_area}\nTyp: ${entry.knowledge_type}\nCoach: ${entry.coach_id}\n\nInhalt: ${chunk}`;
    
    // Generiere Embedding
    const embedding = await generateEmbedding(openAIApiKey, enhancedText);
    
    // Speichere in Datenbank
    const { error } = await supabaseClient
      .from('knowledge_base_embeddings')
      .insert({
        knowledge_id: entry.id,
        content_chunk: chunk,
        chunk_index: i,
        embedding: embedding,
        metadata: {
          title: entry.title,
          expertise_area: entry.expertise_area,
          knowledge_type: entry.knowledge_type,
          coach_id: entry.coach_id,
          enhanced_text: enhancedText
        }
      });

    if (error) throw error;
    
    // Rate Limiting: Warte kurz zwischen API Calls
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }
  
  return chunks.length > 0 ? chunks : [text]; // Fallback für sehr kurze Texte
}

async function generateEmbedding(openAIApiKey: string, text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}