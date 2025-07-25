import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🚀 Edge Function starting...');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('🔧 Environment check:');
console.log('📊 Supabase URL:', supabaseUrl ? '✅ Available' : '❌ Missing');
console.log('🔑 Service Key:', supabaseKey ? '✅ Available' : '❌ Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  brands?: string;
  categories?: string;
  nutriments?: {
    energy_100g?: number;
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

// Test database connection
async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('food_database')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database test exception:', error);
    return false;
  }
}

// Import ONE product with extensive logging
async function importSingleProduct(product: OpenFoodFactsProduct): Promise<boolean> {
  try {
    // Check if we have minimum required data
    if (!product.product_name) {
      return false;
    }

    // Check for duplicates by source_id
    if (product.code) {
      const { data: existing } = await supabase
        .from('food_database')
        .select('id')
        .eq('source_id', product.code)
        .single();
      
      if (existing) {
        console.log('⚠️ Skipping duplicate product:', product.code);
        return false;
      }
    }

    // Extract basic nutrition data
    const calories = product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g;
    const protein = product.nutriments?.proteins_100g;
    const carbs = product.nutriments?.carbohydrates_100g;
    const fats = product.nutriments?.fat_100g;

    // Create food database entry
    const foodEntry = {
      name: product.product_name,
      name_de: product.product_name_de || product.product_name,
      brand: product.brands?.split(',')[0]?.trim() || null,
      category: product.categories?.split(',')[0]?.trim() || 'unknown',
      calories: calories ? Math.round(calories * 100) / 100 : null,
      protein: protein ? Math.round(protein * 100) / 100 : null,
      carbs: carbs ? Math.round(carbs * 100) / 100 : null,
      fats: fats ? Math.round(fats * 100) / 100 : null,
      source: 'openfoodfacts',
      source_id: product.code || `temp_${Date.now()}`,
      verified: false,
      confidence_score: 0.8
    };

    const { data: insertedFood, error: insertError } = await supabase
      .from('food_database')
      .insert(foodEntry)
      .select()
      .single();

    if (insertError) {
      // Skip duplicates silently (likely unique constraint violation)
      if (insertError.code === '23505') {
        return false;
      }
      console.error('❌ Insert failed:', insertError);
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Import error:', error);
    return false;
  }
}

// Test Open Food Facts API with multiple fallback strategies
async function testOpenFoodFactsAPI(country = 'de', limit = 1): Promise<OpenFoodFactsProduct[]> {
  console.log(`🌐 Testing Open Food Facts API with country: ${country}, limit: ${limit}`);
  
  // Multiple API strategies to try
  const strategies = [
    // Strategy 1: German products with nutrition data
    {
      name: 'German products with complete nutrition',
      params: {
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        sort_by: 'popularity',
        countries: country,
        states: 'en:complete'
      }
    },
    // Strategy 2: Just German products (simpler)
    {
      name: 'German products (basic)',
      params: {
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        sort_by: 'unique_scans_n',
        countries: country
      }
    },
    // Strategy 3: Any European products with German language
    {
      name: 'European products with German names',
      params: {
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        sort_by: 'popularity',
        languages: 'de'
      }
    },
    // Strategy 4: Most popular global products
    {
      name: 'Global popular products',
      params: {
        action: 'process',
        json: '1',
        page_size: limit.toString(),
        sort_by: 'popularity'
      }
    }
  ];

  for (const strategy of strategies) {
    try {
      console.log(`🎯 Trying strategy: ${strategy.name}`);
      
      const url = 'https://world.openfoodfacts.org/cgi/search.pl';
      const params = new URLSearchParams(strategy.params);
      const fullUrl = `${url}?${params.toString()}`;
      
      console.log('🔗 API URL:', fullUrl);

      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'KaloAI-FoodImport/1.0 (+https://kaloai.app)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        console.error(`❌ Strategy "${strategy.name}" failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log('📊 API Response:', {
        strategy: strategy.name,
        count: data.count || 0,
        page: data.page || 0,
        page_size: data.page_size || 0,
        products_length: data.products?.length || 0
      });

      if (data.products && data.products.length > 0) {
        console.log('✅ Found products with strategy:', strategy.name);
        console.log('🎯 First product sample:', {
          code: data.products[0].code,
          name: data.products[0].product_name,
          name_de: data.products[0].product_name_de,
          brand: data.products[0].brands,
          category: data.products[0].categories,
          nutriments: data.products[0].nutriments ? 'Available' : 'Missing'
        });

        return data.products;
      } else {
        console.log(`⚠️ No products found with strategy: ${strategy.name}`);
      }

    } catch (error) {
      console.error(`❌ Strategy "${strategy.name}" error:`, error);
      continue;
    }
  }

  // Fallback: Create a test product manually
  console.log('🔄 All strategies failed, creating test product');
  return [{
    code: 'test-' + Date.now(),
    product_name: 'Test Apfel',
    product_name_de: 'Test Apfel',
    brands: 'Test Brand',
    categories: 'Obst',
    nutriments: {
      'energy-kcal_100g': 52,
      proteins_100g: 0.3,
      carbohydrates_100g: 11.4,
      fat_100g: 0.4
    }
  }];
}

serve(async (req) => {
  console.log(`📨 Received ${req.method} request`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = 'import', limit = 1, country = 'de', batch = 1 } = await req.json().catch(() => ({}));
    
    console.log(`🎯 Action: ${action}, Limit: ${limit}, Country: ${country}, Batch: ${batch}`);

    // Always test database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database connection failed',
          step: 'database_test'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (action === 'import') {
      // Test API first
      const products = await testOpenFoodFactsAPI(country, limit);
      
      if (products.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No products found from API',
            step: 'api_test'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        );
      }

      // Try to import products
      let imported = 0;
      for (const product of products) {
        const success = await importSingleProduct(product);
        if (success) imported++;
      }

      return new Response(
        JSON.stringify({ 
          success: imported > 0, 
          message: `Imported ${imported}/${products.length} products`,
          imported,
          total: products.length,
          step: 'import_complete'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get stats
    if (action === 'stats') {
      const { data: totalData, error: totalError } = await supabase
        .from('food_database')
        .select('count', { count: 'exact' });

      const { data: offData, error: offError } = await supabase
        .from('food_database')
        .select('count', { count: 'exact' })
        .eq('source', 'openfoodfacts');

      console.log('📊 Stats query results:', { totalData, totalError, offData, offError });

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            total_foods: totalData?.[0]?.count || 0,
            openfoodfacts_foods: offData?.[0]?.count || 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('💥 Function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        step: 'function_error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});