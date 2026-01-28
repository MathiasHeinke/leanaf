// Admin-Utility zum Seeding der Supplement-Datenbank
// Wird nur für einmalige Datenimporte verwendet

import { supabase } from '@/integrations/supabase/client';
import { COMPLETE_PRODUCT_SEED, COMPLETE_SEED_STATS } from '@/data/seeds';
import { ProductSeed } from '@/data/supplementProductsSeed';

interface SeedResult {
  success: boolean;
  results: {
    batch_name: string;
    products_added: number;
    products_skipped: number;
    products_errors: string[];
    supplements_added: number;
    supplements_skipped: number;
    supplements_errors: string[];
  };
  database_totals: {
    products: number;
    supplements: number;
    brands: number;
  };
}

/**
 * Sendet Produkte in Batches an die seed-products Edge Function
 */
export async function seedProductsInBatches(
  batchSize: number = 50
): Promise<{
  totalAdded: number;
  totalSkipped: number;
  totalErrors: string[];
  batches: number;
  finalTotals: { products: number; supplements: number; brands: number };
}> {
  const products = COMPLETE_PRODUCT_SEED;
  const totalProducts = products.length;
  const batches = Math.ceil(totalProducts / batchSize);
  
  let totalAdded = 0;
  let totalSkipped = 0;
  const totalErrors: string[] = [];
  let finalTotals = { products: 0, supplements: 0, brands: 0 };

  console.log(`🚀 Starting seed: ${totalProducts} products in ${batches} batches`);
  console.log(`📊 Seed stats:`, COMPLETE_SEED_STATS);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, totalProducts);
    const batch = products.slice(start, end);
    
    console.log(`📦 Batch ${i + 1}/${batches}: Products ${start + 1}-${end}`);

    try {
      const { data, error } = await supabase.functions.invoke<SeedResult>('seed-products', {
        body: {
          products: batch,
          batch_name: `batch-${i + 1}`,
        },
      });

      if (error) {
        console.error(`❌ Batch ${i + 1} error:`, error);
        totalErrors.push(`Batch ${i + 1}: ${error.message}`);
        continue;
      }

      if (data?.results) {
        totalAdded += data.results.products_added;
        totalSkipped += data.results.products_skipped;
        totalErrors.push(...data.results.products_errors);
        finalTotals = data.database_totals;
        
        console.log(`✅ Batch ${i + 1}: +${data.results.products_added} added, ${data.results.products_skipped} skipped`);
      }
    } catch (err) {
      console.error(`❌ Batch ${i + 1} exception:`, err);
      totalErrors.push(`Batch ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Kleine Pause zwischen Batches um Rate Limits zu vermeiden
    if (i < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Added: ${totalAdded}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors.length}`);
  console.log(`   Final DB: ${finalTotals.products} products, ${finalTotals.supplements} supplements, ${finalTotals.brands} brands`);

  return {
    totalAdded,
    totalSkipped,
    totalErrors,
    batches,
    finalTotals,
  };
}

/**
 * Quick-Check des aktuellen DB-Stands
 */
export async function checkDatabaseStatus(): Promise<SeedResult> {
  const { data, error } = await supabase.functions.invoke<SeedResult>('seed-products', {
    body: {},
  });

  if (error) {
    throw new Error(`Status check failed: ${error.message}`);
  }

  return data!;
}

/**
 * Startet das vollständige Seeding
 * Aufruf: await runFullSeed()
 */
export async function runFullSeed() {
  console.log('🔍 Checking current database status...');
  const status = await checkDatabaseStatus();
  console.log(`📊 Current: ${status.database_totals.products} products, ${status.database_totals.supplements} supplements`);
  
  console.log('\n📥 Starting full seed from TypeScript seed files...');
  const result = await seedProductsInBatches(30);
  
  return result;
}
