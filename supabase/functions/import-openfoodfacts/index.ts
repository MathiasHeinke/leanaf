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

// Log cron job statistics
async function logCronJobStats(jobName: string, strategy: string, batchSize: number, imported: number, skipped: number, failed: number, executionTime: number, success: boolean, error?: string, jobParams?: any) {
  try {
    const { error: logError } = await supabase
      .from('cron_job_stats')
      .insert({
        job_name: jobName,
        strategy: strategy,
        batch_size: batchSize,
        products_imported: imported,
        products_skipped: skipped,
        products_failed: failed,
        execution_time_ms: executionTime,
        success: success,
        error_message: error || null,
        job_params: jobParams || {}
      });
    
    if (logError) {
      console.error('❌ Failed to log cron job stats:', logError);
    } else {
      console.log(`📊 Logged stats for ${jobName}: ${imported} imported, ${skipped} skipped, ${failed} failed`);
    }
  } catch (err) {
    console.error('❌ Exception logging cron job stats:', err);
  }
}

// Import ONE product with extensive logging
async function importSingleProduct(product: OpenFoodFactsProduct): Promise<boolean> {
  try {
    // Check if we have minimum required data
    if (!product.product_name) {
      return false;
    }

    // Enhanced duplicate detection: check by source_id AND name+brand combination
    if (product.code) {
      const { data: existing } = await supabase
        .from('food_database')
        .select('id')
        .eq('source_id', product.code)
        .single();
      
      if (existing) {
        console.log('⚠️ Skipping duplicate product (source_id):', product.code);
        return false;
      }
    }

    // Additional duplicate check by name+brand
    if (product.product_name && product.brands) {
      const brandName = product.brands.split(',')[0]?.trim();
      if (brandName) {
        const { data: existing } = await supabase
          .from('food_database')
          .select('id')
          .eq('name', product.product_name)
          .eq('brand', brandName)
          .single();
        
        if (existing) {
          console.log('⚠️ Skipping duplicate product (name+brand):', product.product_name, '-', brandName);
          return false;
        }
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

// Enhanced Open Food Facts API with strategy-based search
async function testOpenFoodFactsAPI(strategy = 'global_popular', limit = 15, batch = 1): Promise<OpenFoodFactsProduct[]> {
  console.log(`🌐 Testing Open Food Facts API with strategy: ${strategy}, limit: ${limit}, batch: ${batch}`);
  
  // Calculate pagination offset based on batch
  const pageOffset = Math.max(1, Math.floor((batch - 1) * 0.5) + 1);
  const randomOffset = Math.floor(Math.random() * 5);
  
  let strategies: any[] = [];

  // Define strategy-specific search patterns
  switch (strategy) {
    case 'global_popular':
      strategies = [
        {
          name: 'Global popular products',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: (pageOffset + randomOffset).toString(),
            sort_by: 'popularity'
          }
        },
        {
          name: 'Global protein rich',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: pageOffset.toString(),
            sort_by: 'popularity',
            categories: 'meats,fish,dairy'
          }
        }
      ];
      break;

    case 'german_focused':
      strategies = [
        {
          name: 'German basic foods',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: pageOffset.toString(),
            sort_by: 'popularity',
            countries: 'de'
          }
        },
        {
          name: 'German meat products',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: pageOffset.toString(),
            sort_by: 'popularity',
            countries: 'de',
            categories: 'meats'
          }
        },
        {
          name: 'German dairy products',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: pageOffset.toString(),
            sort_by: 'popularity',
            countries: 'de',
            categories: 'dairy'
          }
        }
      ];
      break;

    case 'european_focused':
      strategies = [
        {
          name: 'European products',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: pageOffset.toString(),
            sort_by: 'popularity',
            countries: 'de,at,ch,nl,fr'
          }
        },
        {
          name: 'European fruits and vegetables',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: pageOffset.toString(),
            sort_by: 'popularity',
            countries: 'de,at,ch,nl,fr',
            categories: 'plant-based-foods'
          }
        }
      ];
      break;

    default:
      // Fallback to global popular
      strategies = [
        {
          name: 'Global popular products',
          params: {
            action: 'process',
            json: '1',
            page_size: limit.toString(),
            page: (pageOffset + randomOffset).toString(),
            sort_by: 'popularity'
          }
        }
      ];
  }

  for (const strategyConfig of strategies) {
    try {
      console.log(`🎯 Trying strategy: ${strategyConfig.name}`);
      
      const url = 'https://world.openfoodfacts.org/cgi/search.pl';
      const params = new URLSearchParams(strategyConfig.params);
      const fullUrl = `${url}?${params.toString()}`;
      
      console.log('🔗 API URL:', fullUrl);

      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'GetleanAI-FoodImport/1.0 (+https://getleanai.app)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(30000)
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        console.error(`❌ Strategy "${strategyConfig.name}" failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log('📊 API Response:', {
        strategy: strategyConfig.name,
        count: data.count || 0,
        page: data.page || 0,
        page_size: data.page_size || 0,
        products_length: data.products?.length || 0
      });

      if (data.products && data.products.length > 0) {
        console.log('✅ Found products with strategy:', strategyConfig.name);
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
        console.log(`⚠️ No products found with strategy: ${strategyConfig.name}`);
      }

    } catch (error) {
      console.error(`❌ Strategy "${strategyConfig.name}" error:`, error);
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
  const startTime = Date.now();
  console.log(`📨 Received ${req.method} request`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      action = 'import', 
      limit = 15, 
      country = 'de', 
      batch = 1,
      job_name = 'manual',
      strategy = 'global_popular'
    } = body;
    
    console.log(`🎯 Action: ${action}, Limit: ${limit}, Country: ${country}, Batch: ${batch}, Job: ${job_name}, Strategy: ${strategy}`);

    // Always test database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      const executionTime = Date.now() - startTime;
      await logCronJobStats(job_name, strategy, limit, 0, 0, 0, executionTime, false, 'Database connection failed', body);
      
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
      // Test API first with strategy parameter
      const products = await testOpenFoodFactsAPI(strategy, limit, batch);
      
      if (products.length === 0) {
        const executionTime = Date.now() - startTime;
        await logCronJobStats(job_name, strategy, limit, 0, 0, 1, executionTime, false, 'No products found from API', body);
        
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

      // Try to import products with rate limiting
      let imported = 0;
      let skipped = 0;
      let failed = 0;
      
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        try {
          const success = await importSingleProduct(product);
          
          if (success) {
            imported++;
            console.log(`✅ Imported product ${i + 1}/${products.length}: ${product.product_name}`);
          } else {
            skipped++;
          }
        } catch (error) {
          failed++;
          console.error(`❌ Failed to import product ${i + 1}/${products.length}:`, error);
        }
        
        // Add delay between imports to respect rate limits (1 second for cron jobs)
        if (i < products.length - 1 && job_name === 'manual') {
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Faster for cron jobs
        }
      }

      const executionTime = Date.now() - startTime;
      const success = imported > 0;
      
      // Log stats to database
      await logCronJobStats(job_name, strategy, limit, imported, skipped, failed, executionTime, success, null, body);

      return new Response(
        JSON.stringify({ 
          success, 
          message: `Imported ${imported}/${products.length} products (${skipped} skipped, ${failed} failed)`,
          imported,
          skipped,
          failed,
          total: products.length,
          execution_time_ms: executionTime,
          job_name,
          strategy,
          step: 'import_complete'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get stats including cron job performance
    if (action === 'stats') {
      const { data: totalData, error: totalError } = await supabase
        .from('food_database')
        .select('count', { count: 'exact' });

      const { data: offData, error: offError } = await supabase
        .from('food_database')
        .select('count', { count: 'exact' })
        .eq('source', 'openfoodfacts');

      // Get recent cron job stats (last 24 hours)
      const { data: cronStats, error: cronError } = await supabase
        .from('cron_job_stats')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('📊 Stats query results:', { totalData, totalError, offData, offError, cronStats: cronStats?.length });

      // Calculate performance metrics for each job
      const jobPerformance = cronStats?.reduce((acc: any, stat: any) => {
        const jobName = stat.job_name;
        if (!acc[jobName]) {
          acc[jobName] = {
            name: jobName,
            strategy: stat.strategy,
            total_runs: 0,
            successful_runs: 0,
            total_imported: 0,
            total_skipped: 0,
            total_failed: 0,
            avg_execution_time: 0,
            last_run: null
          };
        }
        
        acc[jobName].total_runs++;
        if (stat.success) acc[jobName].successful_runs++;
        acc[jobName].total_imported += stat.products_imported || 0;
        acc[jobName].total_skipped += stat.products_skipped || 0;
        acc[jobName].total_failed += stat.products_failed || 0;
        acc[jobName].avg_execution_time += stat.execution_time_ms || 0;
        
        if (!acc[jobName].last_run || new Date(stat.created_at) > new Date(acc[jobName].last_run)) {
          acc[jobName].last_run = stat.created_at;
        }
        
        return acc;
      }, {}) || {};

      // Calculate averages
      Object.values(jobPerformance).forEach((job: any) => {
        job.avg_execution_time = Math.round(job.avg_execution_time / job.total_runs);
        job.success_rate = Math.round((job.successful_runs / job.total_runs) * 100);
      });

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            total_foods: totalData?.[0]?.count || 0,
            openfoodfacts_foods: offData?.[0]?.count || 0,
          },
          job_performance: Object.values(jobPerformance),
          recent_activity: cronStats?.slice(0, 10) || []
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
    const executionTime = Date.now() - startTime;
    
    // Try to log the error if possible
    try {
      await logCronJobStats('unknown', 'unknown', 0, 0, 0, 1, executionTime, false, error.message, {});
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    
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