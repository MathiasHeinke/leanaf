import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRAINING_AREAS = [
  {
    category: "Periodization",
    topics: ["Linear Periodization", "Undulating Periodization", "Block Periodization", "Conjugate Method"]
  },
  {
    category: "VO2max Training", 
    topics: ["4x4 Norwegian Method", "Polarized Training", "Threshold Training", "HIIT Protocols"]
  },
  {
    category: "Military Conditioning",
    topics: ["HIFT Training", "Tactical Strength", "Combat Conditioning", "Functional Fitness"]
  },
  {
    category: "Biomechanics",
    topics: ["Movement Quality", "FMS Analysis", "Injury Prevention", "Mobility Screening"]
  },
  {
    category: "Strength Training",
    topics: ["Westside Method", "5/3/1", "Starting Strength", "Olympic Lifting"]
  },
  {
    category: "Recovery",
    topics: ["HRV Monitoring", "Sleep Optimization", "Active Recovery", "Stress Management"]
  },
  {
    category: "Metabolic Conditioning",
    topics: ["EPOC Training", "Afterburn Effect", "CrossFit Protocols", "Energy Systems"]
  },
  {
    category: "Special Operations",
    topics: ["Military Fitness", "Tactical Training", "Combat Readiness", "Operator Conditioning"]
  },
  {
    category: "Sports Psychology",
    topics: ["Mental Toughness", "Performance Psychology", "Flow State", "Confidence Building"]
  },
  {
    category: "Injury Prevention",
    topics: ["Prehabilitation", "Movement Screening", "Corrective Exercise", "Risk Assessment"]
  }
];

serve(async (req) => {
  const startTime = Date.now();
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { area, batchSize = 2 } = await req.json();
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    console.log(`Starting knowledge pipeline for area: ${area || 'ALL'}`);

    const areasToProcess = area ? 
      TRAINING_AREAS.filter(a => a.category === area) : 
      TRAINING_AREAS.slice(0, batchSize);

    const results = [];

    for (const trainingArea of areasToProcess) {
      console.log(`Processing category: ${trainingArea.category}`);
      
      for (const topic of trainingArea.topics) {
        try {
          const query = `Latest scientific research on ${topic} in strength and conditioning. Include effect sizes, study populations, practical applications, and evidence quality. Focus on peer-reviewed studies from 2020-2024.`;
          
          console.log(`🔍 Researching: ${topic} (Area: ${trainingArea.category})`);
          
          // Test multiple models in fallback order
          const models = ['sonar', 'sonar-reasoning'];
          let perplexityResponse = null;
          let modelUsed = null;
          
          for (const model of models) {
            try {
              console.log(`🧪 Trying model: ${model} for topic: ${topic}`);
              
              perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${perplexityApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: model,
                  messages: [
                    {
                      role: 'system',
                      content: `You are a sports science researcher. Provide structured, evidence-based information about training methods. Format responses as JSON with: id, category, topic, evidence_level, population, finding, effect_size, application, coach_prompt, and sources.`
                    },
                    {
                      role: 'user',
                      content: query
                    }
                  ],
                  temperature: 0.2,
                  top_p: 0.9,
                  max_tokens: 2000,
                  search_domain_filter: ['pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'researchgate.net'],
                  search_recency_filter: 'month'
                }),
              });
              
              if (perplexityResponse.ok) {
                modelUsed = model;
                console.log(`✅ Successfully using model: ${model} for topic: ${topic}`);
                break;
              } else {
                const errorData = await perplexityResponse.text();
                console.error(`❌ Model ${model} failed for ${topic}:`, errorData);
                if (model === models[models.length - 1]) {
                  console.error(`🚨 All models failed for ${topic}, skipping...`);
                  continue;
                }
              }
            } catch (modelError) {
              console.error(`🔥 Exception with model ${model} for ${topic}:`, modelError);
              if (model === models[models.length - 1]) {
                throw modelError;
              }
            }
          }
          
          if (!perplexityResponse || !perplexityResponse.ok) {
            console.error(`💥 All Perplexity models failed for ${topic}, skipping...`);
            continue;
          }

          const perplexityData = await perplexityResponse.json();
          const content = perplexityData.choices[0].message.content;
          console.log(`✅ Research completed for: ${topic} using model: ${modelUsed}`);

          // Try to extract structured data or create it
          let structuredData;
          try {
            structuredData = JSON.parse(content);
          } catch {
            // Create structured data from unstructured content
            structuredData = {
              id: `RAG_${trainingArea.category.toUpperCase()}_${Date.now()}`,
              category: trainingArea.category,
              topic: topic,
              evidence_level: "Current Research",
              population: "Athletes and trained individuals",
              finding: content.substring(0, 500) + "...",
              application: `Apply ${topic} principles in training programs`,
              coach_prompt: `Integrate ${topic} research into coaching recommendations`,
              source: "Perplexity AI Research - Latest Studies",
              model_used: modelUsed,
              processing_timestamp: new Date().toISOString()
            };
          }

          // Insert into knowledge base
          const { data: insertData, error: insertError } = await supabaseClient
            .from('coach_knowledge_base')
            .insert({
              coach_id: 'sascha',
              title: `${topic} - Latest Research`,
              content: typeof structuredData === 'object' ? JSON.stringify(structuredData, null, 2) : content,
              expertise_area: trainingArea.category,
              knowledge_type: 'scientific_research',
              tags: [topic.toLowerCase().replace(/\s+/g, '_'), trainingArea.category.toLowerCase()],
              priority_level: 1,
              source_url: 'perplexity_pipeline'
            });

          if (insertError) {
            console.error(`❌ Error inserting ${topic}:`, insertError);
            results.push({
              topic,
              category: trainingArea.category,
              status: 'error',
              error: insertError.message,
              data: structuredData
            });
          } else {
            console.log(`✅ Successfully inserted: ${topic} (ID: ${insertData?.[0]?.id})`);
            results.push({
              topic,
              category: trainingArea.category,
              status: 'success',
              id: insertData?.[0]?.id,
              data: structuredData,
              model_used: modelUsed
            });
          }

          // Rate limiting - wait between requests
          console.log(`⏰ Waiting 2 seconds before next request...`);
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`💥 Error processing ${topic}:`, error);
          results.push({
            topic,
            category: trainingArea.category,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Generate embeddings for new entries
    const successfulInserts = results.filter(r => r.status === 'success' && r.id);
    
    if (successfulInserts.length > 0) {
      try {
        console.log(`🧠 Triggering embedding generation for ${successfulInserts.length} new entries...`);
        
        // Generate embeddings for each new knowledge entry individually
        for (const insert of successfulInserts) {
          try {
            const { data: embeddingData, error: embeddingError } = await supabaseClient.functions.invoke('generate-embeddings', {
              body: { knowledge_id: insert.id }
            });
            
            if (embeddingError) {
              console.error(`❌ Embedding generation error for ${insert.id}:`, embeddingError);
            } else {
              console.log(`✅ Embedding generated for knowledge ID: ${insert.id}`);
            }
          } catch (individualEmbeddingError) {
            console.error(`💥 Error generating embedding for ${insert.id}:`, individualEmbeddingError);
          }
          
          // Small delay between embedding generations
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`🎉 Embedding generation completed for all new entries`);
      } catch (embeddingError) {
        console.error('💥 Failed to trigger embedding generation:', embeddingError);
      }
    } else {
      console.log('📝 No new entries to generate embeddings for');
    }

    // Generate final statistics
    const stats = {
      total_processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      new_knowledge_entries: successfulInserts.length,
      processed_areas: areasToProcess.length
    };

    console.log(`📊 Pipeline Summary:`, stats);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${results.length} topics`,
      results,
      statistics: stats,
      execution_time_ms: Date.now() - startTime,
      nextSteps: 'Knowledge base updated with latest research'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Critical pipeline error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack,
      execution_time_ms: Date.now() - startTime,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});