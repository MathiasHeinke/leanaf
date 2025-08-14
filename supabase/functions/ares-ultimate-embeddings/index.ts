import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    const { action, coach_id } = await req.json();
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'regenerate_ares') {
      return await regenerateAresEmbeddings(supabase, openaiKey);
    } else if (action === 'regenerate_coach' && coach_id) {
      return await regenerateCoachEmbeddings(supabase, openaiKey, coach_id);
    } else {
      throw new Error('Invalid action or missing coach_id');
    }

  } catch (error) {
    console.error('❌ ARES embeddings error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function regenerateAresEmbeddings(supabase: any, openaiKey: string) {
  console.log('🚀 ARES: Regenerating embeddings for ultimate intelligence...');
  const startTime = Date.now();

  // Delete existing ARES embeddings
  await supabase
    .from('knowledge_base_embeddings')
    .delete()
    .in('knowledge_id', 
      supabase.from('coach_knowledge_base').select('id').eq('coach_id', 'ares')
    );

  // Fetch all ARES knowledge entries
  const { data: aresEntries, error } = await supabase
    .from('coach_knowledge_base')
    .select('*')
    .eq('coach_id', 'ares')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch ARES knowledge entries: ${error.message}`);
  }

  console.log(`📊 ARES: Processing ${aresEntries.length} knowledge entries for ultimate optimization`);

  let processed = 0;
  let failed = 0;
  const batchSize = 3; // Smaller batches for ARES precision

  for (let i = 0; i < aresEntries.length; i += batchSize) {
    const batch = aresEntries.slice(i, i + batchSize);
    
    const promises = batch.map(async (entry) => {
      try {
        await processAresKnowledgeEntry(supabase, openaiKey, entry);
        processed++;
        console.log(`⚡ ARES: Optimized ${entry.title} (${processed}/${aresEntries.length})`);
      } catch (error) {
        failed++;
        console.error(`❌ ARES: Failed to process ${entry.title}:`, error);
      }
    });

    await Promise.all(promises);
    
    // Small delay for API rate limits
    if (i + batchSize < aresEntries.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  logPerformanceMetrics('ares-ultimate-embeddings', EMBEDDING_CONFIG.model, startTime);

  return new Response(JSON.stringify({
    success: true,
    processed,
    failed,
    total: aresEntries.length,
    message: 'ARES ULTIMATE INTELLIGENCE ACTIVATED',
    embedding_model: EMBEDDING_CONFIG.model
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function regenerateCoachEmbeddings(supabase: any, openaiKey: string, coachId: string) {
  console.log(`🔄 Regenerating embeddings for coach: ${coachId}`);
  const startTime = Date.now();

  // Delete existing embeddings for this coach
  await supabase
    .from('knowledge_base_embeddings')
    .delete()
    .in('knowledge_id', 
      supabase.from('coach_knowledge_base').select('id').eq('coach_id', coachId)
    );

  // Fetch coach knowledge entries
  const { data: entries, error } = await supabase
    .from('coach_knowledge_base')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch ${coachId} knowledge entries: ${error.message}`);
  }

  let processed = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      await processAresKnowledgeEntry(supabase, openaiKey, entry);
      processed++;
      console.log(`✅ Processed ${entry.title} for ${coachId}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to process ${entry.title}:`, error);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    processed,
    failed,
    total: entries.length,
    coach_id: coachId,
    embedding_model: EMBEDDING_CONFIG.model
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processAresKnowledgeEntry(supabase: any, openaiKey: string, entry: any) {
  const content = entry.content || '';
  
  // ARES uses enhanced chunking for maximum semantic understanding
  const chunks = createAresChunks(content, EMBEDDING_CONFIG.chunk_size, EMBEDDING_CONFIG.overlap);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Enhanced metadata for ARES ultimate intelligence
    const aresEnhancedText = `Coach: ${entry.coach_id?.toUpperCase() || 'ARES'}\nDomain: ${entry.expertise_area || 'Ultimate Coaching'}\nType: ${entry.content_type || 'Meta-Knowledge'}\nTitle: ${entry.title || 'ARES Protocol'}\n\nULTIMATE CONTENT: ${chunk}`;

    // Generate embedding with enhanced context
    const embedding = await generateAresEmbedding(openaiKey, aresEnhancedText);
    
    // Store with ARES metadata
    const { error: insertError } = await supabase
      .from('knowledge_base_embeddings')
      .insert({
        knowledge_id: entry.id,
        content_chunk: chunk,
        chunk_index: i,
        embedding: embedding,
        metadata: {
          coach_id: entry.coach_id,
          title: entry.title,
          expertise_area: entry.expertise_area,
          content_type: entry.content_type,
          chunk_length: chunk.length,
          enhanced_length: aresEnhancedText.length,
          ares_enhanced: entry.coach_id === 'ares',
          priority_level: entry.priority_level || 1,
          semantic_boost: entry.coach_id === 'ares' ? 1.2 : 1.0
        }
      });

    if (insertError) {
      throw new Error(`Failed to insert ARES embedding: ${insertError.message}`);
    }
  }
}

function createAresChunks(text: string, maxLength: number, overlap: number): string[] {
  if (!text || text.length === 0) return [''];
  
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let i = 0;
  
  while (i < sentences.length) {
    const sentence = sentences[i].trim();
    
    if (currentChunk.length + sentence.length + 1 > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // ARES enhanced overlap for maximum context retention
      const overlapText = currentChunk.slice(-overlap).trim();
      currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
    
    i++;
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [''];
}

async function generateAresEmbedding(openaiKey: string, text: string): Promise<number[]> {
  const response = await callOpenAIWithRetry(async () => {
    return await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_CONFIG.model,
        input: text,
        dimensions: EMBEDDING_CONFIG.dimensions
      }),
    });
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ARES Embedding API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}