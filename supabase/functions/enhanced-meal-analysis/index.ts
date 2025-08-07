import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { getTaskModel } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

interface MealAnalysisRequest {
  text: string;
  images?: string[];
  userId: string;
}

interface FoodMatch {
  food_id: string;
  name: string;
  brand?: string;
  similarity: number;
  confidence: number;
  source: 'database' | 'ai_estimation';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  estimated_portion: number; // in grams
}

interface AnalysisResult {
  foods: FoodMatch[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  confidence_score: number;
  analysis_method: 'hybrid_rag' | 'ai_only';
  suggestions?: string[];
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openaiApiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function searchFoodsInDatabase(query: string): Promise<FoodMatch[]> {
  const matches: FoodMatch[] = [];

  try {
    // 1. Try exact text search first
    const { data: textMatches } = await supabase.rpc('search_foods_by_text', {
      search_query: query,
      match_count: 5
    });

    if (textMatches) {
      textMatches.forEach((match: any) => {
        if (match.rank > 0.1) { // Minimum relevance threshold
          matches.push({
            food_id: match.food_id,
            name: match.name,
            brand: match.brand,
            similarity: Math.min(match.rank, 1.0),
            confidence: 0.9,
            source: 'database',
            calories: match.calories || 0,
            protein: match.protein || 0,
            carbs: match.carbs || 0,
            fats: match.fats || 0,
            estimated_portion: 100, // Default to 100g, will be adjusted later
          });
        }
      });
    }

    // 2. Try semantic search if we have embeddings
    if (openaiApiKey && matches.length < 3) {
      const embedding = await generateEmbedding(query);
      if (embedding) {
        const { data: semanticMatches } = await supabase.rpc('search_similar_foods', {
          query_embedding: embedding,
          similarity_threshold: 0.7,
          match_count: 5
        });

        if (semanticMatches) {
          semanticMatches.forEach((match: any) => {
            // Avoid duplicates from text search
            if (!matches.some(m => m.food_id === match.food_id)) {
              matches.push({
                food_id: match.food_id,
                name: match.name,
                brand: match.brand,
                similarity: match.similarity,
                confidence: 0.85,
                source: 'database',
                calories: match.calories || 0,
                protein: match.protein || 0,
                carbs: match.carbs || 0,
                fats: match.fats || 0,
                estimated_portion: 100,
              });
            }
          });
        }
      }
    }

    console.log(`Found ${matches.length} database matches for: ${query}`);
    return matches.slice(0, 3); // Return top 3 matches

  } catch (error) {
    console.error('Error searching foods in database:', error);
    return [];
  }
}

async function analyzeWithOpenAI(text: string, images: string[] = []): Promise<FoodMatch[]> {
  if (!openaiApiKey) return [];

  try {
    const messages = [
      {
        role: 'system',
        content: `Du bist ein hochpräziser Ernährungsexperte mit Zugang zu aktuellen Nährwertdatenbanken. 

SPEZIELL FÜR MULTIPLE BILDER UND KOMPLEXE GERICHTE:
- Analysiere jedes einzelne Lebensmittel/jede Komponente separat
- Schätze Portionsgrößen anhand von Referenzobjekten (Teller ≈ 24-26cm, Besteck, Hände)
- Berücksichtige Zubereitungsart (roh/gekocht/gebraten beeinflusst Kalorien)
- Erkenne versteckte Zutaten (Öl zum Braten, Saucen, Gewürze)

PRÄZISE PORTIONSSCHÄTZUNG:
- Normale Teller: 24-26cm Durchmesser
- Handfläche ohne Finger: ~100g Protein
- Geballte Faust: ~250g Kohlenhydrate 
- Daumen: ~30g Fett
- Bei mehreren Bildern: Nutze verschiedene Winkel für präzisere Schätzung

WICHTIG: Antworte NUR mit einem gültigen JSON-Array von Objekten in diesem Format:
[
  {
    "name": "Lebensmittelname auf Deutsch",
    "calories": Kalorien_pro_100g,
    "protein": Protein_in_Gramm_pro_100g,
    "carbs": Kohlenhydrate_in_Gramm_pro_100g,
    "fats": Fett_in_Gramm_pro_100g,
    "estimated_portion": Geschätzte_Portion_in_Gramm
  }
]

Regeln:
- Alle Nährwerte pro 100g angeben
- estimated_portion ist die geschätzte tatsächliche Menge des Lebensmittels
- Realistische Werte basierend auf visueller Analyse
- Bei Unsicherheit konservativ schätzen, aber nutze alle verfügbaren visuellen Hinweise`
      },
      {
        role: 'user',
        content: images.length > 1 
          ? `Analysiere diese Mahlzeit mit ${images.length} Bildern: ${text}

MULTI-BILD ANALYSE:
- Nutze alle Bilder für eine vollständige Einschätzung
- Verschiedene Winkel helfen bei der Portionsschätzung
- Achte auf Details die in einzelnen Bildern besser erkennbar sind
- Kombiniere Informationen aus allen Bildern für präziseste Ergebnisse`
          : `Analysiere diese Mahlzeit: ${text}`
      }
    ];

    // Add images if provided
    if (images.length > 0) {
      const imageContent = images.map(url => ({
        type: 'image_url',
        image_url: { url }
      }));
      
      messages[1].content = [
        { type: 'text', text: `Analysiere diese Mahlzeit: ${text}` },
        ...imageContent
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('enhanced-meal-analysis'),
        messages,
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const foods = JSON.parse(jsonMatch[0]);
      return foods.map((food: any) => ({
        food_id: `ai_${Date.now()}_${Math.random()}`,
        name: food.name,
        similarity: 0.7,
        confidence: 0.6, // Lower confidence for AI estimates
        source: 'ai_estimation',
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fats: food.fats || 0,
        estimated_portion: food.estimated_portion || 100,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error analyzing with OpenAI:', error);
    return [];
  }
}

function parsePortionFromText(text: string): { portions: string[], cleanText: string } {
  const portions: string[] = [];
  let cleanText = text;

  // Extract portion indicators
  const portionPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:g|gram|gramm)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:ml|milliliter)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:stück|stücke|piece|pieces)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:el|esslöffel|tbsp|tablespoon)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:tl|teelöffel|tsp|teaspoon)/gi,
    /(\d+(?:[.,]\d+)?)\s*(?:tasse|tassen|cup|cups)/gi,
    /(eine|ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\s*(?:portion|portionen)/gi,
  ];

  portionPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      portions.push(...matches);
      cleanText = cleanText.replace(pattern, ' ').replace(/\s+/g, ' ').trim();
    }
  });

  return { portions, cleanText };
}

function estimatePortionSize(foodName: string, portionText: string): number {
  const lowerName = foodName.toLowerCase();
  const lowerPortion = portionText.toLowerCase();

  // Extract numbers from portion text
  const numberMatch = portionText.match(/(\d+(?:[.,]\d+)?)/);
  const amount = numberMatch ? parseFloat(numberMatch[1].replace(',', '.')) : 1;

  // Standard portion sizes for common foods
  if (lowerPortion.includes('esslöffel') || lowerPortion.includes('tbsp')) {
    if (lowerName.includes('öl') || lowerName.includes('butter')) return amount * 10;
    if (lowerName.includes('zucker') || lowerName.includes('mehl')) return amount * 12;
    return amount * 15;
  }

  if (lowerPortion.includes('teelöffel') || lowerPortion.includes('tsp')) {
    return amount * 5;
  }

  if (lowerPortion.includes('tasse') || lowerPortion.includes('cup')) {
    return amount * 240; // ml for liquids, adjust for solids
  }

  if (lowerPortion.includes('g') || lowerPortion.includes('gram')) {
    return amount;
  }

  if (lowerPortion.includes('ml')) {
    return amount; // Assume 1ml ≈ 1g for most foods
  }

  if (lowerPortion.includes('stück') || lowerPortion.includes('piece')) {
    // Estimate based on food type
    if (lowerName.includes('apfel') || lowerName.includes('apple')) return amount * 150;
    if (lowerName.includes('banane') || lowerName.includes('banana')) return amount * 120;
    if (lowerName.includes('ei') || lowerName.includes('egg')) return amount * 50;
    if (lowerName.includes('brot') || lowerName.includes('bread')) return amount * 30;
    return amount * 100; // Default
  }

  // Default portion size
  return 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, images = [], userId }: MealAnalysisRequest = await req.json();

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Analyzing meal for user ${userId}: ${text}`);

    // Parse portion information
    const { portions, cleanText } = parsePortionFromText(text);
    console.log(`Extracted portions: ${portions.join(', ')}`);

    // Split text into individual food items
    const foodItems = cleanText
      .split(/[,;+&]|und|and|with|mit/)
      .map(item => item.trim())
      .filter(item => item.length > 2);

    const allMatches: FoodMatch[] = [];
    let usedDatabase = false;

    // Analyze each food item
    for (const [index, foodItem] of foodItems.entries()) {
      console.log(`Analyzing food item: ${foodItem}`);

      // Try database search first
      const dbMatches = await searchFoodsInDatabase(foodItem);
      
      if (dbMatches.length > 0) {
        usedDatabase = true;
        const bestMatch = dbMatches[0];
        
        // Estimate portion size
        const portionText = portions[index] || portions[0] || '';
        if (portionText) {
          bestMatch.estimated_portion = estimatePortionSize(bestMatch.name, portionText);
        }
        
        allMatches.push(bestMatch);
        console.log(`Found database match: ${bestMatch.name} (${bestMatch.estimated_portion}g)`);
      } else {
        // Fallback to AI analysis
        console.log(`No database match found for: ${foodItem}, using AI analysis`);
        const aiMatches = await analyzeWithOpenAI(foodItem, images);
        if (aiMatches.length > 0) {
          const aiMatch = aiMatches[0];
          
          // Apply portion if available
          const portionText = portions[index] || portions[0] || '';
          if (portionText) {
            aiMatch.estimated_portion = estimatePortionSize(aiMatch.name, portionText);
          }
          
          allMatches.push(aiMatch);
          console.log(`AI analysis result: ${aiMatch.name} (${aiMatch.estimated_portion}g)`);
        }
      }
    }

    // If no matches found, try analyzing the entire text with AI
    if (allMatches.length === 0) {
      console.log('No individual matches found, analyzing entire text with AI');
      const aiMatches = await analyzeWithOpenAI(text, images);
      allMatches.push(...aiMatches);
    }

    // Calculate totals based on actual portions
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalConfidence = 0;

    allMatches.forEach(match => {
      const factor = match.estimated_portion / 100; // Convert from per 100g to actual portion
      totalCalories += (match.calories || 0) * factor;
      totalProtein += (match.protein || 0) * factor;
      totalCarbs += (match.carbs || 0) * factor;
      totalFats += (match.fats || 0) * factor;
      totalConfidence += match.confidence;
    });

    const avgConfidence = allMatches.length > 0 ? totalConfidence / allMatches.length : 0;
    const analysisMethod = usedDatabase ? 'hybrid_rag' : 'ai_only';

    const result: AnalysisResult = {
      foods: allMatches,
      total_calories: Math.round(totalCalories),
      total_protein: Math.round(totalProtein * 10) / 10,
      total_carbs: Math.round(totalCarbs * 10) / 10,
      total_fats: Math.round(totalFats * 10) / 10,
      confidence_score: Math.round(avgConfidence * 100) / 100,
      analysis_method: analysisMethod,
    };

    // Add suggestions based on confidence
    if (avgConfidence < 0.7) {
      result.suggestions = [
        'Für genauere Ergebnisse füge Markenname oder spezifischere Beschreibungen hinzu',
        'Überprüfe die geschätzten Portionsgrößen'
      ];
    }

    console.log(`Analysis complete: ${result.analysis_method}, confidence: ${result.confidence_score}`);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhanced-meal-analysis:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        analysis_method: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});