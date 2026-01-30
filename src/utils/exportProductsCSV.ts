/**
 * CSV Export für alle Supplement-Produkte mit verknüpften Daten
 * Exportiert Produkte + Marken + Supplement-Master-Daten
 */

import { supabase } from '@/integrations/supabase/client';

// CSV-Spalten Definition
const CSV_HEADERS = [
  // Produkt-Daten
  'id',
  'product_name',
  'product_sku',
  'pack_size',
  'pack_unit',
  'servings_per_pack',
  'dose_per_serving',
  'dose_unit',
  'price_eur',
  'price_per_serving',
  'form',
  'is_vegan',
  'is_organic',
  'allergens',
  'product_url',
  'amazon_asin',
  'is_verified',
  'is_recommended',
  'popularity_score',
  'quality_tags',
  'ingredients',
  'created_at',
  // Marken-Daten
  'brand_name',
  'brand_slug',
  'brand_country',
  'brand_website',
  'brand_price_tier',
  'brand_specialization',
  'brand_quality_certifications',
  // Supplement-Master-Daten
  'supplement_name',
  'supplement_category',
  'default_dosage',
  'default_unit',
  'timing_constraint',
  'protocol_phase',
  'impact_score',
  'priority_score',
  'necessity_tier',
  'evidence_level',
  'hallmarks_addressed',
  'synergies',
  'blockers',
  'cycling_required',
  'cycling_protocol',
  'cost_per_day_eur',
  'form_quality',
];

interface ProductWithRelations {
  id: string;
  product_name: string;
  product_sku: string | null;
  pack_size: number;
  pack_unit: string | null;
  servings_per_pack: number | null;
  dose_per_serving: number;
  dose_unit: string;
  price_eur: number | null;
  price_per_serving: number | null;
  form: string | null;
  is_vegan: boolean | null;
  is_organic: boolean | null;
  allergens: string[] | null;
  product_url: string | null;
  amazon_asin: string | null;
  is_verified: boolean | null;
  is_recommended: boolean | null;
  popularity_score: number | null;
  quality_tags: string[] | null;
  ingredients: unknown;
  created_at: string | null;
  supplement_brands: {
    name: string;
    slug: string;
    country: string | null;
    website: string | null;
    price_tier: string | null;
    specialization: string[] | null;
    quality_certifications: string[] | null;
  } | null;
  supplement_database: {
    name: string;
    category: string;
    default_dosage: string | null;
    default_unit: string;
    timing_constraint: string | null;
    protocol_phase: number | null;
    impact_score: number | null;
    priority_score: number | null;
    necessity_tier: string | null;
    evidence_level: string | null;
    hallmarks_addressed: string[] | null;
    synergies: string[] | null;
    blockers: string[] | null;
    cycling_required: boolean | null;
    cycling_protocol: string | null;
    cost_per_day_eur: number | null;
    form_quality: string | null;
  } | null;
}

/**
 * Konvertiert einen Wert für CSV (escapet Kommas und Anführungszeichen)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Arrays zu Semikolon-getrennten Strings
  if (Array.isArray(value)) {
    return `"${value.join('; ').replace(/"/g, '""')}"`;
  }
  
  // Objekte zu JSON
  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    return `"${json.replace(/"/g, '""')}"`;
  }
  
  // Booleans zu Ja/Nein
  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein';
  }
  
  // Strings mit Kommas oder Anführungszeichen escapen
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  
  return strValue;
}

/**
 * Konvertiert ein Produkt-Objekt zu einer CSV-Zeile
 */
function productToCSVRow(product: ProductWithRelations): string {
  const brand = product.supplement_brands;
  const supp = product.supplement_database;
  
  const values = [
    // Produkt-Daten
    product.id,
    product.product_name,
    product.product_sku,
    product.pack_size,
    product.pack_unit,
    product.servings_per_pack,
    product.dose_per_serving,
    product.dose_unit,
    product.price_eur,
    product.price_per_serving,
    product.form,
    product.is_vegan,
    product.is_organic,
    product.allergens,
    product.product_url,
    product.amazon_asin,
    product.is_verified,
    product.is_recommended,
    product.popularity_score,
    product.quality_tags,
    product.ingredients,
    product.created_at,
    // Marken-Daten
    brand?.name,
    brand?.slug,
    brand?.country,
    brand?.website,
    brand?.price_tier,
    brand?.specialization,
    brand?.quality_certifications,
    // Supplement-Master-Daten
    supp?.name,
    supp?.category,
    supp?.default_dosage,
    supp?.default_unit,
    supp?.timing_constraint,
    supp?.protocol_phase,
    supp?.impact_score,
    supp?.priority_score,
    supp?.necessity_tier,
    supp?.evidence_level,
    supp?.hallmarks_addressed,
    supp?.synergies,
    supp?.blockers,
    supp?.cycling_required,
    supp?.cycling_protocol,
    supp?.cost_per_day_eur,
    supp?.form_quality,
  ];
  
  return values.map(escapeCSV).join(',');
}

/**
 * Lädt alle Produkte mit verknüpften Daten und exportiert als CSV
 */
export async function exportAllProductsToCSV(): Promise<{ 
  success: boolean; 
  productCount?: number; 
  error?: string;
}> {
  try {
    // Lade alle Produkte mit JOINs
    const { data: products, error } = await supabase
      .from('supplement_products')
      .select(`
        *,
        supplement_brands (
          name,
          slug,
          country,
          website,
          price_tier,
          specialization,
          quality_certifications
        ),
        supplement_database (
          name,
          category,
          default_dosage,
          default_unit,
          timing_constraint,
          protocol_phase,
          impact_score,
          priority_score,
          necessity_tier,
          evidence_level,
          hallmarks_addressed,
          synergies,
          blockers,
          cycling_required,
          cycling_protocol,
          cost_per_day_eur,
          form_quality
        )
      `)
      .order('product_name');

    if (error) {
      console.error('Error fetching products:', error);
      return { success: false, error: error.message };
    }

    if (!products || products.length === 0) {
      return { success: false, error: 'Keine Produkte gefunden' };
    }

    // Erstelle CSV-Inhalt
    // UTF-8 BOM für Excel-Kompatibilität
    const BOM = '\uFEFF';
    const headerRow = CSV_HEADERS.join(',');
    const dataRows = (products as ProductWithRelations[]).map(productToCSVRow);
    const csvContent = BOM + headerRow + '\n' + dataRows.join('\n');

    // Erstelle Dateiname mit Datum
    const today = new Date().toISOString().split('T')[0];
    const filename = `ares_products_export_${today}.csv`;

    // Erstelle Blob und triggere Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);

    return { success: true, productCount: products.length };
  } catch (err) {
    console.error('Export error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unbekannter Fehler' 
    };
  }
}
