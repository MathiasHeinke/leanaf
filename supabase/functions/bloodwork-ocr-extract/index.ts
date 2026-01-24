import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All known marker keys matching BloodworkEntry types
const KNOWN_MARKERS = [
  // Hormones
  "total_testosterone", "free_testosterone", "estradiol", "shbg", "lh", "fsh",
  "prolactin", "dhea_s", "cortisol", "igf1",
  // Thyroid
  "tsh", "ft3", "ft4",
  // Metabolic
  "fasting_glucose", "fasting_insulin", "hba1c", "homa_ir",
  // Lipids
  "total_cholesterol", "ldl", "hdl", "triglycerides",
  // Vitamins & Minerals
  "vitamin_d", "vitamin_b12", "ferritin", "iron", "magnesium", "zinc",
  "calcium", "potassium", "sodium", "phosphate",
  // Blood Count
  "hemoglobin", "hematocrit", "rbc", "wbc", "platelets",
  // Organs
  "alt", "ast", "ggt", "creatinine", "egfr", "albumin", "crp", "homocysteine",
  "uric_acid", "psa"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("[bloodwork-ocr] Processing image extraction");

    // System prompt for German lab report OCR extraction
    const systemPrompt = `Du bist ein spezialisierter OCR-Assistent für deutsche Laborberichte (Blutuntersuchungen).

DEINE AUFGABE:
Analysiere das Bild eines Bluttest-Befunds und extrahiere ALLE erkennbaren Laborwerte.

WICHTIGE REGELN:
1. Erkenne sowohl gedruckte als auch handschriftliche Werte
2. Beachte deutsche Zahlenformate (Komma als Dezimaltrenner → in Punkt umwandeln)
3. Extrahiere NUR die MESSWERTE, NICHT die Referenzbereiche
4. Wenn ein Wert nicht eindeutig lesbar ist, überspringe ihn
5. Erkenne gängige Marker-Varianten:
   - "Testosteron gesamt" / "Gesamt-Testosteron" → total_testosterone
   - "Freies Testosteron" → free_testosterone  
   - "Östradiol" / "E2" → estradiol
   - "TSH basal" → tsh
   - "Nüchtern-Glucose" / "Glucose nüchtern" → fasting_glucose
   - "HbA1c" → hba1c
   - "Vitamin D" / "25-OH-Vitamin D" → vitamin_d
   - "CRP" / "C-reaktives Protein" → crp
   - "GOT" / "AST" → ast
   - "GPT" / "ALT" → alt
   - "γ-GT" / "Gamma-GT" → ggt

METADATEN extrahieren:
- Laborname (wenn sichtbar)
- Testdatum (Format: YYYY-MM-DD)
- Nüchtern-Blutabnahme (wenn angegeben)

Antworte NUR mit dem Tool-Call, keine zusätzliche Erklärung.`;

    // Tool definition for structured extraction
    const extractionTool = {
      type: "function",
      function: {
        name: "extract_bloodwork_values",
        description: "Extrahiert Blutwerte aus einem Laborbericht-Bild",
        parameters: {
          type: "object",
          properties: {
            lab_name: { 
              type: "string", 
              description: "Name des Labors (z.B. 'MVZ Berlin', 'Labor Dr. Schmidt')" 
            },
            test_date: { 
              type: "string", 
              description: "Datum der Blutabnahme im Format YYYY-MM-DD" 
            },
            is_fasted: { 
              type: "boolean", 
              description: "War es eine Nüchtern-Blutabnahme?" 
            },
            markers: {
              type: "object",
              description: "Extrahierte Marker-Werte (numerisch, Punkt als Dezimaltrenner)",
              properties: Object.fromEntries(
                KNOWN_MARKERS.map(m => [m, { 
                  type: "number", 
                  description: `Messwert für ${m}` 
                }])
              )
            },
            unrecognized: {
              type: "array",
              items: { 
                type: "object", 
                properties: { 
                  name: { type: "string", description: "Originalname des Markers" }, 
                  value: { type: "number", description: "Gemessener Wert" },
                  unit: { type: "string", description: "Einheit (falls erkennbar)" }
                },
                required: ["name", "value"]
              },
              description: "Werte die keinem bekannten Marker zugeordnet werden konnten"
            },
            confidence: { 
              type: "number", 
              description: "Konfidenz der Extraktion (0.0 bis 1.0)" 
            },
            notes: { 
              type: "string", 
              description: "Hinweise zur Extraktion (z.B. 'Teile des Dokuments unleserlich')" 
            }
          },
          required: ["markers", "confidence"]
        }
      }
    };

    // Call Lovable AI Gateway with Vision
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro", // Best OCR/Vision capabilities
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Bitte extrahiere alle Blutwerte aus diesem Laborbericht:" },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_bloodwork_values" } },
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.error(`[bloodwork-ocr] AI Gateway error: ${status}`);
      
      if (status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "Rate limit erreicht. Bitte in einer Minute erneut versuchen." 
        }), {
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      if (status === 402) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "AI-Credits aufgebraucht. Bitte Credits aufladen." 
        }), {
          status: 402, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      throw new Error(`AI Gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("[bloodwork-ocr] No tool call in response:", JSON.stringify(data));
      throw new Error("Keine Werte extrahiert - Bild möglicherweise unleserlich");
    }

    let extracted;
    try {
      extracted = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("[bloodwork-ocr] Failed to parse tool arguments:", toolCall.function.arguments);
      throw new Error("Fehler beim Parsen der extrahierten Daten");
    }
    
    // Count extracted markers
    const markerCount = Object.keys(extracted.markers || {}).filter(
      k => extracted.markers[k] !== null && extracted.markers[k] !== undefined
    ).length;
    
    console.log("[bloodwork-ocr] Extraction complete:", {
      markers_count: markerCount,
      unrecognized_count: extracted.unrecognized?.length || 0,
      confidence: extracted.confidence,
      has_metadata: !!(extracted.lab_name || extracted.test_date)
    });

    return new Response(JSON.stringify({
      success: true,
      ...extracted
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[bloodwork-ocr] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Extraktion fehlgeschlagen"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
