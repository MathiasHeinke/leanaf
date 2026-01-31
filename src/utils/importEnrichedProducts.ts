import { supabase } from '@/integrations/supabase/client';

interface ImportResult {
  success: boolean;
  batch_name?: string;
  results?: {
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  database_totals?: {
    products: number;
    with_big8_scores: number;
    with_amazon_data: number;
    with_supplement_link: number;
  };
  error?: string;
}

interface ImportStats {
  totalProducts: number;
  totalImported: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: string[];
  batchResults: ImportResult[];
  databaseTotals?: {
    products: number;
    with_big8_scores: number;
    with_amazon_data: number;
    with_supplement_link: number;
  };
}

/**
 * Import enriched products from JSON data
 * Handles Big8 scores, Amazon data, supplement_id links
 */
export async function importEnrichedProducts(
  products: any[],
  onProgress?: (current: number, total: number, batchResult?: ImportResult) => void
): Promise<ImportStats> {
  const batchSize = 50;
  const batches = Math.ceil(products.length / batchSize);
  
  const stats: ImportStats = {
    totalProducts: products.length,
    totalImported: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: [],
    batchResults: [],
  };

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, products.length);
    const batch = products.slice(start, end);
    const batchName = `batch-${i + 1}-of-${batches}`;

    try {
      const { data, error } = await supabase.functions.invoke<ImportResult>('import-enriched-products', {
        body: { products: batch, batch_name: batchName },
      });

      if (error) {
        const errorResult: ImportResult = {
          success: false,
          batch_name: batchName,
          error: error.message,
        };
        stats.batchResults.push(errorResult);
        stats.totalErrors.push(`Batch ${i + 1}: ${error.message}`);
      } else if (data) {
        stats.batchResults.push(data);
        
        if (data.results) {
          stats.totalImported += data.results.imported;
          stats.totalUpdated += data.results.updated;
          stats.totalSkipped += data.results.skipped;
          stats.totalErrors.push(...data.results.errors);
        }
        
        // Keep latest DB totals
        if (data.database_totals) {
          stats.databaseTotals = data.database_totals;
        }
      }

      onProgress?.(i + 1, batches, data || undefined);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      stats.totalErrors.push(`Batch ${i + 1}: ${errorMsg}`);
    }

    // Small delay between batches
    if (i < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return stats;
}

/**
 * Parse JSON file content and import products
 */
export async function importEnrichedProductsFromFile(
  jsonContent: string,
  onProgress?: (current: number, total: number, batchResult?: ImportResult) => void
): Promise<ImportStats> {
  // Parse JSON
  let products: any[];
  try {
    products = JSON.parse(jsonContent);
    if (!Array.isArray(products)) {
      throw new Error('JSON must be an array of products');
    }
  } catch (err) {
    return {
      totalProducts: 0,
      totalImported: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: [`JSON parse error: ${err instanceof Error ? err.message : 'Invalid JSON'}`],
      batchResults: [],
    };
  }

  return importEnrichedProducts(products, onProgress);
}

/**
 * Validate product data before import
 */
export function validateEnrichedProducts(products: any[]): {
  valid: any[];
  invalid: { product: any; reason: string }[];
} {
  const valid: any[] = [];
  const invalid: { product: any; reason: string }[] = [];

  for (const product of products) {
    if (!product.product_name) {
      invalid.push({ product, reason: 'Missing product_name' });
      continue;
    }
    if (!product.brand_slug) {
      invalid.push({ product, reason: 'Missing brand_slug' });
      continue;
    }
    valid.push(product);
  }

  return { valid, invalid };
}
