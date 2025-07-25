import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_de?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  ingredients_text?: string;
  allergens?: string;
  nutriments?: {
    energy_100g?: number;
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
    sodium_100g?: number;
    'saturated-fat_100g'?: number;
    'trans-fat_100g'?: number;
    cholesterol_100g?: number;
    'vitamin-c_100g'?: number;
    calcium_100g?: number;
    iron_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openaiApiKey) {
    console.log('No OpenAI API key available, skipping embedding generation');
    return null;
  }

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

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

function extractAllergens(allergensText?: string): string[] {
  if (!allergensText) return [];
  
  // Parse allergens from Open Food Facts format
  return allergensText
    .split(',')
    .map(a => a.trim().replace(/^en:/, ''))
    .filter(a => a.length > 0);
}

function normalizeNutrient(value?: number): number | null {
  if (value === undefined || value === null || isNaN(value)) return null;
  return Math.round(value * 100) / 100; // Round to 2 decimal places
}

async function importProduct(product: OpenFoodFactsProduct): Promise<void> {
  const name = product.product_name || product.product_name_en || product.product_name_de;
  if (!name) {
    console.log(`Skipping product ${product.code} - no name available`);
    return;
  }

  // Check if product already exists
  const { data: existing } = await supabase
    .from('food_database')
    .select('id')
    .eq('source', 'openfoodfacts')
    .eq('source_id', product.code)
    .single();

  if (existing) {
    console.log(`Product ${product.code} already exists, skipping`);
    return;
  }

  const nutriments = product.nutriments || {};
  
  // Convert energy from kJ to kcal if needed
  let calories = nutriments['energy-kcal_100g'];
  if (!calories && nutriments.energy_100g) {
    calories = nutriments.energy_100g * 0.239006; // Convert kJ to kcal
  }

  // Convert salt to sodium (salt = sodium * 2.5)
  let sodium = nutriments.sodium_100g;
  if (!sodium && nutriments.salt_100g) {
    sodium = nutriments.salt_100g / 2.5;
  }

  const foodData = {
    name: name,
    name_de: product.product_name_de,
    name_en: product.product_name_en,
    brand: product.brands?.split(',')[0]?.trim() || null,
    barcode: product.code,
    source: 'openfoodfacts',
    source_id: product.code,
    category: product.categories?.split(',')[0]?.trim() || null,
    
    // Nutritional values per 100g
    calories: normalizeNutrient(calories),
    protein: normalizeNutrient(nutriments.proteins_100g),
    carbs: normalizeNutrient(nutriments.carbohydrates_100g),
    fats: normalizeNutrient(nutriments.fat_100g),
    fiber: normalizeNutrient(nutriments.fiber_100g),
    sugar: normalizeNutrient(nutriments.sugars_100g),
    sodium: normalizeNutrient(sodium),
    
    // Additional nutrients
    saturated_fat: normalizeNutrient(nutriments['saturated-fat_100g']),
    trans_fat: normalizeNutrient(nutriments['trans-fat_100g']),
    cholesterol: normalizeNutrient(nutriments.cholesterol_100g),
    vitamin_c: normalizeNutrient(nutriments['vitamin-c_100g']),
    calcium: normalizeNutrient(nutriments.calcium_100g),
    iron: normalizeNutrient(nutriments.iron_100g),
    
    // Meta information
    serving_size: product.serving_quantity || null,
    serving_description: product.serving_size || null,
    ingredients: product.ingredients_text || null,
    allergens: extractAllergens(product.allergens),
    
    confidence_score: 0.8, // Open Food Facts data quality
    verified: false,
  };

  // Insert food item
  const { data: foodItem, error: foodError } = await supabase
    .from('food_database')
    .insert(foodData)
    .select('id')
    .single();

  if (foodError) {
    console.error(`Error inserting food ${name}:`, foodError);
    return;
  }

  console.log(`Imported food: ${name} (ID: ${foodItem.id})`);

  // Generate embedding
  const embeddingText = [
    name,
    product.product_name_de,
    product.product_name_en,
    product.brands,
    product.categories?.split(',')[0]
  ].filter(Boolean).join(' ');

  const embedding = await generateEmbedding(embeddingText);
  if (embedding) {
    const { error: embeddingError } = await supabase
      .from('food_embeddings')
      .insert({
        food_id: foodItem.id,
        embedding: embedding,
        text_content: embeddingText,
      });

    if (embeddingError) {
      console.error(`Error inserting embedding for ${name}:`, embeddingError);
    } else {
      console.log(`Generated embedding for: ${name}`);
    }
  }

  // Add German aliases if available
  const aliases = [];
  if (product.product_name_de && product.product_name_de !== name) {
    aliases.push({ alias: product.product_name_de, language: 'de', alias_type: 'translation' });
  }
  if (product.product_name_en && product.product_name_en !== name) {
    aliases.push({ alias: product.product_name_en, language: 'en', alias_type: 'translation' });
  }
  if (product.brands) {
    product.brands.split(',').forEach(brand => {
      aliases.push({ 
        alias: `${brand.trim()} ${name}`, 
        language: 'de', 
        alias_type: 'brand' 
      });
    });
  }

  if (aliases.length > 0) {
    const aliasData = aliases.map(alias => ({
      ...alias,
      food_id: foodItem.id,
    }));

    const { error: aliasError } = await supabase
      .from('food_aliases')
      .insert(aliasData);

    if (aliasError) {
      console.error(`Error inserting aliases for ${name}:`, aliasError);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'import', category = 'all', limit = 100, country = 'de' } = await req.json().catch(() => ({}));

    console.log(`Starting Open Food Facts import: ${action}, category: ${category}, limit: ${limit}`);

    if (action === 'import') {
      let url = 'https://world.openfoodfacts.org/cgi/search.pl';
      const params = new URLSearchParams({
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        sort_by: 'popularity',
        countries: country,
      });

      // Add category filter if specified
      if (category !== 'all') {
        params.append('tagtype_0', 'categories');
        params.append('tag_contains_0', 'contains');
        params.append('tag_0', category);
      }

      // Filter for products with nutrition data
      params.append('nutrition_grades', 'a,b,c,d,e');

      url += '?' + params.toString();

      console.log(`Fetching from: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'KaloAI-RAG-System/1.0 (contact@kaloai.com)',
        },
      });

      if (!response.ok) {
        throw new Error(`Open Food Facts API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Found ${data.products?.length || 0} products`);

      if (!data.products || data.products.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No products found',
            imported: 0 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }

      // Import products in batches
      let imported = 0;
      const batchSize = 10;
      
      for (let i = 0; i < data.products.length; i += batchSize) {
        const batch = data.products.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (product: OpenFoodFactsProduct) => {
            try {
              await importProduct(product);
              imported++;
            } catch (error) {
              console.error(`Error importing product ${product.code}:`, error);
            }
          })
        );

        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully imported ${imported} products`,
          imported,
          total: data.products.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get import statistics
    if (action === 'stats') {
      const { data: stats } = await supabase
        .from('food_database')
        .select('source, count(*)')
        .eq('source', 'openfoodfacts');

      const { data: embeddingStats } = await supabase
        .from('food_embeddings')
        .select('count(*)');

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            total_openfoodfacts: stats?.length || 0,
            total_embeddings: embeddingStats?.[0]?.count || 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('Error in import-openfoodfacts function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        imported: 0 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});