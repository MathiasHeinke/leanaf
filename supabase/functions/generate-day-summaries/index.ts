import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { TASK_CONFIGS, callOpenAIWithRetry, logPerformanceMetrics } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting daily summaries generation...");

    // Check for force header
    const force = req.headers.get("x-force") === "true";
    console.log(`🔧 Force mode: ${force}`);

    // Get all missing summaries from the last 30 days
    const { data: missingDays, error: fetchError } = await supabase
      .from("v_missing_summaries")
      .select("*");

    if (fetchError) {
      console.error("❌ Error fetching missing summaries:", fetchError);
      throw fetchError;
    }

    console.log(`📅 Found ${missingDays?.length || 0} missing summary days`);

    let processed = 0;
    let errors = 0;

    for (const row of missingDays ?? []) {
      try {
        console.log(`⏳ Processing ${row.date} for user ${row.user_id}...`);

        // Check if summary already exists and has complete data (unless force mode)
        if (!force) {
          const { data: existing, error: existingError } = await supabase
            .from("daily_summaries")
            .select("summary_struct_json")
            .eq("user_id", row.user_id)
            .eq("date", row.date)
            .maybeSingle();

          if (existingError) {
            console.error(`❌ Error checking existing summary for ${row.date}:`, existingError);
            errors++;
            continue;
          }

          if (existing?.summary_struct_json) {
            console.log(`🔄 Skip – already complete: ${row.date}`);
            continue;
          }
        }

        // Get complete day context using our new RPC function
        const { data: dayContext, error: contextError } = await supabase
          .rpc("get_day_context", { 
            p_user: row.user_id, 
            p_day: row.date 
          });

        if (contextError) {
          console.error(`❌ Context error for ${row.date}:`, contextError);
          errors++;
          continue;
        }

        if (!dayContext || Object.keys(dayContext).length === 0) {
          console.log(`⚠️ No data for ${row.date}, skipping...`);
          continue;
        }

        // Generate AI summary with optimized config
        const startTime = Date.now();
        const config = TASK_CONFIGS['generate-day-summaries'];
        console.log(`🤖 Using ${config.model} for day summary generation`);

        const aiResponse = await callOpenAIWithRetry(async () => {
          return await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: config.model,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system", 
                  content: `Erstelle eine maschinenlesbare Tageszusammenfassung im JSON-Format. 
                  Struktur: {
                    "nutrition": {"kcal": number, "protein_g": number, "carbs_g": number, "fats_g": number, "quality_note": "string"},
                    "training": {"volume_kg": number, "sessions": number, "type": "string", "intensity_note": "string"},
                    "sleep": {"score": number, "hours": number, "quality": "string"},
                    "hydration": {"score": number, "ml": number, "adequate": boolean},
                    "supplements": {"compliance_pct": number, "note": "string"},
                    "meta": {
                      "gpt_summary": "Kurze deutsche Zusammenfassung in 2-3 Sätzen über die wichtigsten Erkenntnisse des Tages"
                    }
                  }
                  Alle Werte in deutschen Begriffen, realistische Scores von 1-10.`
                },
                {
                  role: "user", 
                  content: JSON.stringify(dayContext)
                }
              ],
              temperature: config.temperature,
              top_p: config.top_p,
              frequency_penalty: config.frequency_penalty,
              stream: config.stream,
              max_tokens: 800
            })
          });
        });

        if (!aiResponse.ok) {
          console.error(`❌ OpenAI API error: ${aiResponse.status}`);
          errors++;
          continue;
        }

        const aiData = await aiResponse.json();
        const structuredSummary = JSON.parse(aiData.choices[0].message.content);
        
        // Log performance metrics
        logPerformanceMetrics('generate-day-summaries', config.model, startTime, aiData.usage?.total_tokens);
        
        // Extract text summaries of different lengths
        const fullText = structuredSummary.meta?.gpt_summary || "";
        const xlText = fullText.split(/\s+/).slice(0, 240).join(" ");
        const standardText = fullText.split(/\s+/).slice(0, 120).join(" ");

        // Upsert into daily_summaries
        const { error: upsertError } = await supabase
          .from("daily_summaries")
          .upsert({
            user_id: row.user_id,
            date: row.date,
            summary_struct_json: structuredSummary,
            summary_xxl_md: fullText || null,
            summary_xl_md: xlText || null,
            summary_md: standardText || null,
            total_calories: structuredSummary.nutrition?.kcal || null,
            total_protein: structuredSummary.nutrition?.protein_g || null,
            total_carbs: structuredSummary.nutrition?.carbs_g || null,
            total_fats: structuredSummary.nutrition?.fats_g || null,
            workout_volume: structuredSummary.training?.volume_kg || null,
            sleep_score: structuredSummary.sleep?.score || null,
            hydration_score: structuredSummary.hydration?.score || null,
          }, { 
            onConflict: "user_id,date" 
          });

        if (upsertError) {
          console.error(`❌ Upsert error for ${row.date}:`, upsertError);
          errors++;
          continue;
        }

        console.log(`✅ Summary created for ${row.date}`);
        processed++;

        // Small delay to be respectful to OpenAI API
        await new Promise(resolve => setTimeout(resolve, 1200));

      } catch (error) {
        console.error(`❌ Error processing ${row.date}:`, error);
        errors++;
      }
    }

    const result = {
      success: true,
      processed,
      errors,
      total: missingDays?.length || 0,
      message: `Processed ${processed} summaries, ${errors} errors`
    };

    console.log("🎯 Generation complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("❌ Fatal error in generate-day-summaries:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});