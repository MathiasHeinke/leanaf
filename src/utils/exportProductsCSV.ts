/**
 * CSV Export für alle Supplement-Produkte mit verknüpften Daten
 * Exportiert Produkte + Marken + Supplement-Master-Daten
 * Version 2.0 - Vollständiger Export mit allen 54+ Feldern
 */

import { supabase } from '@/integrations/supabase/client';

// CSV-Spalten Definition - Vollständig (70+ Spalten)
const CSV_HEADERS = [
  // === IDs ===
  'id',
  'brand_id',
  'supplement_id',
  
  // === Produkt-Basis ===
  'product_name',
  'product_sku',
  'short_description',
  'category',
  
  // === Packung & Dosierung ===
  'pack_size',
  'pack_unit',
  'servings_per_pack',
  'serving_size',
  'servings_per_container',
  'dose_per_serving',
  'dosage_per_serving',
  'dose_unit',
  'form',
  'timing',
  
  // === Preis ===
  'price_eur',
  'price_per_serving',
  
  // === Amazon-Daten ===
  'amazon_asin',
  'amazon_url',
  'amazon_image',
  'amazon_name',
  'match_score',
  
  // === Shop & Links ===
  'product_url',
  
  // === Eigenschaften ===
  'is_vegan',
  'is_organic',
  'is_gluten_free',
  'allergens',
  'origin',
  'country_of_origin',
  'ingredients',
  
  // === Quality-Scores (Big 8) ===
  'quality_purity',
  'quality_bioavailability',
  'quality_dosage',
  'quality_synergy',
  'quality_research',
  'quality_form',
  'quality_value',
  'quality_transparency',
  
  // === Metriken ===
  'bioavailability',
  'potency',
  'purity',
  'value',
  'reviews',
  'lab_tests',
  'impact_score_big8',
  'popularity_score',
  
  // === Status ===
  'is_verified',
  'is_recommended',
  'quality_tags',
  
  // === Timestamps ===
  'created_at',
  'updated_at',
  
  // === Brand-Daten ===
  'brand_name',
  'brand_slug',
  'brand_country',
  'brand_website',
  'brand_price_tier',
  'brand_specialization',
  'brand_quality_certifications',
  
  // === Supplement-Master-Daten ===
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
  // IDs
  id: string;
  brand_id: string | null;
  supplement_id: string | null;
  
  // Produkt-Basis
  product_name: string;
  product_sku: string | null;
  short_description: string | null;
  category: string | null;
  
  // Packung & Dosierung
  pack_size: number;
  pack_unit: string | null;
  servings_per_pack: number | null;
  serving_size: string | null;
  servings_per_container: number | null;
  dose_per_serving: number;
  dosage_per_serving: string | null;
  dose_unit: string;
  form: string | null;
  timing: string | null;
  
  // Preis
  price_eur: number | null;
  price_per_serving: number | null;
  
  // Amazon-Daten
  amazon_asin: string | null;
  amazon_url: string | null;
  amazon_image: string | null;
  amazon_name: string | null;
  match_score: number | null;
  
  // Shop & Links
  product_url: string | null;
  
  // Eigenschaften
  is_vegan: boolean | null;
  is_organic: boolean | null;
  is_gluten_free: boolean | null;
  allergens: string[] | null;
  origin: string | null;
  country_of_origin: string | null;
  ingredients: unknown;
  
  // Quality-Scores
  quality_purity: number | null;
  quality_bioavailability: number | null;
  quality_dosage: number | null;
  quality_synergy: number | null;
  quality_research: number | null;
  quality_form: number | null;
  quality_value: number | null;
  quality_transparency: number | null;
  
  // Metriken
  bioavailability: number | null;
  potency: number | null;
  purity: number | null;
  value: number | null;
  reviews: number | null;
  lab_tests: number | null;
  impact_score_big8: number | null;
  popularity_score: number | null;
  
  // Status
  is_verified: boolean | null;
  is_recommended: boolean | null;
  quality_tags: string[] | null;
  
  // Timestamps
  created_at: string | null;
  updated_at: string | null;
  
  // Relationen
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
    // === IDs ===
    product.id,
    product.brand_id,
    product.supplement_id,
    
    // === Produkt-Basis ===
    product.product_name,
    product.product_sku,
    product.short_description,
    product.category,
    
    // === Packung & Dosierung ===
    product.pack_size,
    product.pack_unit,
    product.servings_per_pack,
    product.serving_size,
    product.servings_per_container,
    product.dose_per_serving,
    product.dosage_per_serving,
    product.dose_unit,
    product.form,
    product.timing,
    
    // === Preis ===
    product.price_eur,
    product.price_per_serving,
    
    // === Amazon-Daten ===
    product.amazon_asin,
    product.amazon_url,
    product.amazon_image,
    product.amazon_name,
    product.match_score,
    
    // === Shop & Links ===
    product.product_url,
    
    // === Eigenschaften ===
    product.is_vegan,
    product.is_organic,
    product.is_gluten_free,
    product.allergens,
    product.origin,
    product.country_of_origin,
    product.ingredients,
    
    // === Quality-Scores ===
    product.quality_purity,
    product.quality_bioavailability,
    product.quality_dosage,
    product.quality_synergy,
    product.quality_research,
    product.quality_form,
    product.quality_value,
    product.quality_transparency,
    
    // === Metriken ===
    product.bioavailability,
    product.potency,
    product.purity,
    product.value,
    product.reviews,
    product.lab_tests,
    product.impact_score_big8,
    product.popularity_score,
    
    // === Status ===
    product.is_verified,
    product.is_recommended,
    product.quality_tags,
    
    // === Timestamps ===
    product.created_at,
    product.updated_at,
    
    // === Brand-Daten ===
    brand?.name,
    brand?.slug,
    brand?.country,
    brand?.website,
    brand?.price_tier,
    brand?.specialization,
    brand?.quality_certifications,
    
    // === Supplement-Master-Daten ===
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
    // Lade alle Produkte mit JOINs - jetzt mit allen Feldern
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

    // Erstelle Dateiname mit Datum - FULL Export
    const today = new Date().toISOString().split('T')[0];
    const filename = `ares_products_FULL_export_${today}.csv`;

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
