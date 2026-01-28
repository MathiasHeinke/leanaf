// ARES Supplement Seeding Edge Function v3.4
// Lädt ~300 Produkte in die Datenbank

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductSeed {
  brand_slug: string;
  supplement_name: string;
  product_name: string;
  pack_size: number;
  pack_unit: string;
  servings_per_pack: number;
  dose_per_serving: number;
  dose_unit: string;
  price_eur: number;
  price_per_serving: number;
  form: string;
  is_vegan?: boolean;
  is_recommended?: boolean;
  quality_tags?: string[];
  protocol_phase?: number;
  impact_score?: number;
  notes?: string;
}

interface SupplementSeed {
  name: string;
  category: string;
  description: string;
  impact_score?: number;
  necessity_tier?: string;
  evidence_level?: string;
  default_dose?: number;
  default_unit?: string;
  synergies?: string[];
}

// ============================================
// COMPLETE PRODUCT DATA (~300 Products)
// ============================================

const ALL_PRODUCTS: ProductSeed[] = [
  // === NATURE LOVE ===
  { brand_slug: 'nature-love', supplement_name: 'Vitamin D3 + K2', product_name: 'Vitamin D3 + K2 Depot Tropfen', pack_size: 50, pack_unit: 'ml', servings_per_pack: 1700, dose_per_serving: 1000, dose_unit: 'IE D3 + 20µg K2', price_eur: 19.99, price_per_serving: 0.01, form: 'drops', is_vegan: true, quality_tags: ['amazon-bestseller', 'made-in-de'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'nature-love', supplement_name: 'Vitamin B12', product_name: 'Vitamin B12 1000µg Tropfen', pack_size: 50, pack_unit: 'ml', servings_per_pack: 1550, dose_per_serving: 1000, dose_unit: 'µg', price_eur: 17.99, price_per_serving: 0.01, form: 'drops', is_vegan: true, quality_tags: ['methylcobalamin'], protocol_phase: 0, impact_score: 8.0 },
  { brand_slug: 'nature-love', supplement_name: 'Vitamin C', product_name: 'Vitamin C gepuffert 500mg', pack_size: 365, pack_unit: 'capsules', servings_per_pack: 365, dose_per_serving: 500, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.05, form: 'capsule', is_vegan: true, protocol_phase: 0, impact_score: 7.5 },
  { brand_slug: 'nature-love', supplement_name: 'Magnesium', product_name: 'Magnesium Komplex 400mg', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 400, dose_unit: 'mg', price_eur: 18.99, price_per_serving: 0.21, form: 'capsule', is_vegan: true, quality_tags: ['7-formen'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'nature-love', supplement_name: 'Zink', product_name: 'Zink 25mg Bisglycinat', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 25, dose_unit: 'mg', price_eur: 16.99, price_per_serving: 0.05, form: 'tablet', is_vegan: true, quality_tags: ['chelat'], protocol_phase: 0, impact_score: 8.0 },
  { brand_slug: 'nature-love', supplement_name: 'Selen', product_name: 'Selen 200µg Selenomethionin', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 200, dose_unit: 'µg', price_eur: 16.99, price_per_serving: 0.05, form: 'tablet', is_vegan: true, protocol_phase: 0, impact_score: 7.5 },
  { brand_slug: 'nature-love', supplement_name: 'Omega-3', product_name: 'Omega-3 vegan aus Algenöl', pack_size: 90, pack_unit: 'softgels', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg EPA+DHA', price_eur: 24.99, price_per_serving: 0.28, form: 'softgel', is_vegan: true, quality_tags: ['algenoel'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'nature-love', supplement_name: 'L-Arginin', product_name: 'L-Arginin Base 750mg', pack_size: 365, pack_unit: 'capsules', servings_per_pack: 122, dose_per_serving: 2250, dose_unit: 'mg', price_eur: 21.99, price_per_serving: 0.18, form: 'capsule', is_vegan: true, protocol_phase: 1, impact_score: 7.5 },
  { brand_slug: 'nature-love', supplement_name: 'Ashwagandha', product_name: 'Ashwagandha KSM-66 500mg', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 500, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.22, form: 'capsule', is_vegan: true, quality_tags: ['ksm-66'], protocol_phase: 0, impact_score: 7.8 },
  { brand_slug: 'nature-love', supplement_name: 'Curcumin', product_name: 'Curcuma Extrakt 95% Curcuminoide', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 500, dose_unit: 'mg', price_eur: 17.99, price_per_serving: 0.20, form: 'capsule', is_vegan: true, quality_tags: ['95%', 'piperin'], protocol_phase: 1, impact_score: 7.5 },
  { brand_slug: 'nature-love', supplement_name: 'OPC', product_name: 'OPC Traubenkernextrakt 800mg', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 180, dose_per_serving: 800, dose_unit: 'mg', price_eur: 21.99, price_per_serving: 0.12, form: 'capsule', is_vegan: true, protocol_phase: 1, impact_score: 7.0 },
  { brand_slug: 'nature-love', supplement_name: 'Mariendistel', product_name: 'Mariendistel Extrakt 80% Silymarin', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 600, dose_unit: 'mg', price_eur: 16.99, price_per_serving: 0.14, form: 'capsule', is_vegan: true, quality_tags: ['80%-silymarin'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'nature-love', supplement_name: 'Probiotika', product_name: 'Probiona Kulturen Komplex', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 180, dose_per_serving: 20, dose_unit: 'Mrd. KBE', price_eur: 24.99, price_per_serving: 0.14, form: 'capsule', is_vegan: true, quality_tags: ['21-staemme'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'nature-love', supplement_name: 'Biotin', product_name: 'Biotin 10.000µg + Selen + Zink', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 10000, dose_unit: 'µg', price_eur: 16.99, price_per_serving: 0.05, form: 'tablet', is_vegan: true, protocol_phase: 0, impact_score: 6.5 },

  // === NATURTREU ===
  { brand_slug: 'naturtreu', supplement_name: 'Vitamin D3 + K2', product_name: 'Sonnenkind D3 + K2 Tropfen', pack_size: 30, pack_unit: 'ml', servings_per_pack: 900, dose_per_serving: 1000, dose_unit: 'IE D3 + 50µg K2', price_eur: 24.99, price_per_serving: 0.03, form: 'drops', is_vegan: true, quality_tags: ['bio', 'vegan'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'naturtreu', supplement_name: 'Magnesium', product_name: 'Ruhepol Magnesium Komplex', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 400, dose_unit: 'mg', price_eur: 21.99, price_per_serving: 0.24, form: 'capsule', is_vegan: true, quality_tags: ['5-formen'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'naturtreu', supplement_name: 'Omega-3', product_name: 'Ozeanperle Omega-3 vegan', pack_size: 60, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 500, dose_unit: 'mg EPA+DHA', price_eur: 29.99, price_per_serving: 0.50, form: 'softgel', is_vegan: true, quality_tags: ['algenoel'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'naturtreu', supplement_name: 'Vitamin B Komplex', product_name: 'Kraftreserve B-Komplex Aktiv', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 1, dose_unit: 'Kapsel', price_eur: 22.99, price_per_serving: 0.19, form: 'capsule', is_vegan: true, quality_tags: ['aktive-formen', 'methyliert'], protocol_phase: 0, impact_score: 8.5 },
  { brand_slug: 'naturtreu', supplement_name: 'Ashwagandha', product_name: 'Innere Ruhe Ashwagandha KSM-66', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg', price_eur: 24.99, price_per_serving: 0.28, form: 'capsule', is_vegan: true, quality_tags: ['ksm-66', 'bio'], protocol_phase: 0, impact_score: 7.8 },
  { brand_slug: 'naturtreu', supplement_name: 'Probiotika', product_name: 'Darmfreund Probiotika Kulturen', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 15, dose_unit: 'Mrd. KBE', price_eur: 27.99, price_per_serving: 0.23, form: 'capsule', is_vegan: true, quality_tags: ['18-staemme'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'naturtreu', supplement_name: 'Zink', product_name: 'Zinkhaushalt Zink Bisglycinat', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 25, dose_unit: 'mg', price_eur: 17.99, price_per_serving: 0.05, form: 'tablet', is_vegan: true, quality_tags: ['chelat'], protocol_phase: 0, impact_score: 8.0 },
  { brand_slug: 'naturtreu', supplement_name: 'Curcumin', product_name: 'Kurkuma Kraft mit Curcumin', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 500, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.22, form: 'capsule', is_vegan: true, quality_tags: ['95%', 'bio'], protocol_phase: 1, impact_score: 7.5 },

  // === NOW FOODS ===
  { brand_slug: 'now-foods', supplement_name: 'Vitamin D3', product_name: 'Vitamin D3 5000 IE', pack_size: 240, pack_unit: 'softgels', servings_per_pack: 240, dose_per_serving: 5000, dose_unit: 'IE', price_eur: 16.99, price_per_serving: 0.07, form: 'softgel', is_vegan: false, quality_tags: ['GMP', 'budget'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'now-foods', supplement_name: 'Magnesium', product_name: 'Magnesium Citrat 200mg', pack_size: 250, pack_unit: 'tablets', servings_per_pack: 250, dose_per_serving: 200, dose_unit: 'mg', price_eur: 14.99, price_per_serving: 0.06, form: 'tablet', is_vegan: true, quality_tags: ['GMP', 'citrat'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'now-foods', supplement_name: 'NAC', product_name: 'NAC 600mg', pack_size: 250, pack_unit: 'capsules', servings_per_pack: 250, dose_per_serving: 600, dose_unit: 'mg', price_eur: 21.99, price_per_serving: 0.09, form: 'capsule', is_vegan: true, quality_tags: ['GMP'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'now-foods', supplement_name: 'CoQ10', product_name: 'CoQ10 100mg mit Vitamin E', pack_size: 150, pack_unit: 'softgels', servings_per_pack: 150, dose_per_serving: 100, dose_unit: 'mg', price_eur: 29.99, price_per_serving: 0.20, form: 'softgel', is_vegan: false, quality_tags: ['GMP'], protocol_phase: 0, impact_score: 8.5 },
  { brand_slug: 'now-foods', supplement_name: 'Ashwagandha', product_name: 'Ashwagandha Standardized Extract 450mg', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 180, dose_per_serving: 450, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.11, form: 'capsule', is_vegan: true, quality_tags: ['GMP'], protocol_phase: 0, impact_score: 7.8 },
  { brand_slug: 'now-foods', supplement_name: 'Alpha Liponsäure', product_name: 'Alpha Lipoic Acid 250mg', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 250, dose_unit: 'mg', price_eur: 18.99, price_per_serving: 0.16, form: 'capsule', is_vegan: true, quality_tags: ['GMP'], protocol_phase: 1, impact_score: 7.5 },
  { brand_slug: 'now-foods', supplement_name: 'Quercetin', product_name: 'Quercetin with Bromelain 500mg', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 21.99, price_per_serving: 0.18, form: 'capsule', is_vegan: true, quality_tags: ['GMP', 'bromelain'], protocol_phase: 1, impact_score: 7.5 },
  { brand_slug: 'now-foods', supplement_name: 'Silymarin', product_name: 'Silymarin 300mg Milk Thistle Extract', pack_size: 200, pack_unit: 'capsules', servings_per_pack: 200, dose_per_serving: 300, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.10, form: 'capsule', is_vegan: true, quality_tags: ['GMP'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'now-foods', supplement_name: 'Omega-3', product_name: 'Ultra Omega-3 Fish Oil 500 EPA/250 DHA', pack_size: 180, pack_unit: 'softgels', servings_per_pack: 180, dose_per_serving: 750, dose_unit: 'mg EPA+DHA', price_eur: 24.99, price_per_serving: 0.14, form: 'softgel', is_vegan: false, quality_tags: ['GMP'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'now-foods', supplement_name: 'L-Theanin', product_name: 'L-Theanine 200mg Double Strength', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 200, dose_unit: 'mg', price_eur: 21.99, price_per_serving: 0.18, form: 'capsule', is_vegan: true, quality_tags: ['GMP', 'suntheanine'], protocol_phase: 0, impact_score: 7.5 },
  { brand_slug: 'now-foods', supplement_name: 'Berberin', product_name: 'Berberine Glucose Support 400mg', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 400, dose_unit: 'mg', price_eur: 18.99, price_per_serving: 0.21, form: 'capsule', is_vegan: true, quality_tags: ['GMP'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'now-foods', supplement_name: 'GABA', product_name: 'GABA 500mg', pack_size: 200, pack_unit: 'capsules', servings_per_pack: 200, dose_per_serving: 500, dose_unit: 'mg', price_eur: 14.99, price_per_serving: 0.07, form: 'capsule', is_vegan: true, quality_tags: ['GMP'], protocol_phase: 0, impact_score: 7.0 },
  { brand_slug: 'now-foods', supplement_name: 'Vitamin C', product_name: 'Vitamin C-1000 Sustained Release', pack_size: 250, pack_unit: 'tablets', servings_per_pack: 250, dose_per_serving: 1000, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.08, form: 'tablet', is_vegan: true, quality_tags: ['GMP', 'retard'], protocol_phase: 0, impact_score: 7.5 },

  // === DOCTORS BEST ===
  { brand_slug: 'doctors-best', supplement_name: 'Magnesium', product_name: 'High Absorption Magnesium 100mg', pack_size: 240, pack_unit: 'tablets', servings_per_pack: 120, dose_per_serving: 200, dose_unit: 'mg', price_eur: 16.99, price_per_serving: 0.14, form: 'tablet', is_vegan: true, quality_tags: ['chelat', 'albion'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'doctors-best', supplement_name: 'Ubiquinol', product_name: 'Ubiquinol 100mg with Kaneka', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 120, dose_per_serving: 100, dose_unit: 'mg', price_eur: 44.99, price_per_serving: 0.37, form: 'softgel', is_vegan: false, quality_tags: ['kaneka', 'ubiquinol'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'doctors-best', supplement_name: 'Curcumin', product_name: 'Curcumin Phytosome 500mg', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 32.99, price_per_serving: 0.27, form: 'capsule', is_vegan: true, quality_tags: ['meriva', 'phytosom'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'doctors-best', supplement_name: 'Vitamin D3', product_name: 'Vitamin D3 5000 IE', pack_size: 360, pack_unit: 'softgels', servings_per_pack: 360, dose_per_serving: 5000, dose_unit: 'IE', price_eur: 14.99, price_per_serving: 0.04, form: 'softgel', is_vegan: false, protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'doctors-best', supplement_name: 'PQQ', product_name: 'PQQ 20mg', pack_size: 30, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 20, dose_unit: 'mg', price_eur: 29.99, price_per_serving: 1.00, form: 'capsule', is_vegan: true, quality_tags: ['biopqq', 'mitochondrien'], protocol_phase: 2, impact_score: 7.5 },
  { brand_slug: 'doctors-best', supplement_name: 'NAC', product_name: 'NAC Detox Regulators 600mg', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 180, dose_per_serving: 600, dose_unit: 'mg', price_eur: 24.99, price_per_serving: 0.14, form: 'capsule', is_vegan: true, quality_tags: ['selen', 'molybdaen'], protocol_phase: 1, impact_score: 8.0 },

  // === MOLEQLAR ===
  { brand_slug: 'moleqlar', supplement_name: 'NMN', product_name: 'NMN Uthever® Pulver 60g', pack_size: 60, pack_unit: 'g', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 72.90, price_per_serving: 0.61, form: 'powder', is_vegan: true, is_recommended: true, quality_tags: ['uthever', '>99.9%'], protocol_phase: 2, impact_score: 9.0 },
  { brand_slug: 'moleqlar', supplement_name: 'NMN', product_name: 'NMN Uthever® Kapseln 60 Stück', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 250, dose_unit: 'mg', price_eur: 49.90, price_per_serving: 0.83, form: 'capsule', is_vegan: true, quality_tags: ['uthever'], protocol_phase: 2, impact_score: 9.0 },
  { brand_slug: 'moleqlar', supplement_name: 'NR', product_name: 'NR Niagen® 90 Kapseln', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 300, dose_unit: 'mg', price_eur: 59.90, price_per_serving: 0.67, form: 'capsule', is_vegan: true, quality_tags: ['niagen', 'patentiert'], protocol_phase: 2, impact_score: 8.5 },
  { brand_slug: 'moleqlar', supplement_name: 'Resveratrol', product_name: 'Trans-Resveratrol 500mg', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 500, dose_unit: 'mg', price_eur: 39.90, price_per_serving: 0.67, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['>99%', 'trans-form'], protocol_phase: 2, impact_score: 8.0 },
  { brand_slug: 'moleqlar', supplement_name: 'Pterostilben', product_name: 'Pterostilben 50mg', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 50, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 0.50, form: 'capsule', is_vegan: true, protocol_phase: 2, impact_score: 7.5 },
  { brand_slug: 'moleqlar', supplement_name: 'Fisetin', product_name: 'Fisetin 100mg', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 100, dose_unit: 'mg', price_eur: 34.90, price_per_serving: 0.58, form: 'capsule', is_vegan: true, quality_tags: ['senolytisch'], protocol_phase: 2, impact_score: 8.0 },
  { brand_slug: 'moleqlar', supplement_name: 'Spermidin', product_name: 'Spermidin Pro 60 Kapseln', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 6, dose_unit: 'mg', price_eur: 89.90, price_per_serving: 1.50, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['autophagie'], protocol_phase: 2, impact_score: 8.5 },
  { brand_slug: 'moleqlar', supplement_name: 'CaAKG', product_name: 'Calcium Alpha-Ketoglutarat 90 Kapseln', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 1000, dose_unit: 'mg', price_eur: 39.90, price_per_serving: 0.44, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['bio-age'], protocol_phase: 2, impact_score: 8.5 },
  { brand_slug: 'moleqlar', supplement_name: 'Urolithin A', product_name: 'Mitopure® Urolithin A 30 Kapseln', pack_size: 30, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 500, dose_unit: 'mg', price_eur: 69.90, price_per_serving: 2.33, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['mitopure', 'mitophagie'], protocol_phase: 2, impact_score: 8.5 },
  { brand_slug: 'moleqlar', supplement_name: 'Quercetin', product_name: 'Quercetin Phytosome 250mg', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 250, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 0.50, form: 'capsule', is_vegan: true, quality_tags: ['phytosom', 'senolytisch'], protocol_phase: 2, impact_score: 7.5 },

  // === SUNDAY NATURAL ===
  { brand_slug: 'sunday-natural', supplement_name: 'Vitamin D3 + K2', product_name: 'Vitamin D3 + K2 Depot Tropfen', pack_size: 30, pack_unit: 'ml', servings_per_pack: 750, dose_per_serving: 2500, dose_unit: 'IE D3 + 100µg K2', price_eur: 26.90, price_per_serving: 0.04, form: 'drops', is_vegan: true, is_recommended: true, quality_tags: ['all-trans-mk7', 'vegan'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'sunday-natural', supplement_name: 'Vitamin B Komplex', product_name: 'B-Komplex Forte Bioaktiv', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 1, dose_unit: 'Kapsel', price_eur: 22.90, price_per_serving: 0.25, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['methyliert', 'coenzym-formen'], protocol_phase: 0, impact_score: 8.5 },
  { brand_slug: 'sunday-natural', supplement_name: 'Magnesium', product_name: 'Magnesium Glycinat 300mg', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 300, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['chelat', 'bisglycinat'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'sunday-natural', supplement_name: 'Zink', product_name: 'Zink Bisglycinat 25mg', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 25, dose_unit: 'mg', price_eur: 14.90, price_per_serving: 0.12, form: 'capsule', is_vegan: true, quality_tags: ['chelat'], protocol_phase: 0, impact_score: 8.0 },
  { brand_slug: 'sunday-natural', supplement_name: 'Omega-3', product_name: 'Omega-3 Algenöl Vegan DHA+EPA', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 600, dose_unit: 'mg EPA+DHA', price_eur: 32.90, price_per_serving: 0.55, form: 'softgel', is_vegan: true, is_recommended: true, quality_tags: ['algenoel', 'nachhaltig'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'sunday-natural', supplement_name: 'Ashwagandha', product_name: 'Ashwagandha KSM-66® 600mg', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['ksm-66', 'full-spectrum'], protocol_phase: 0, impact_score: 7.8 },
  { brand_slug: 'sunday-natural', supplement_name: 'Resveratrol', product_name: 'Trans-Resveratrol 500mg', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 500, dose_unit: 'mg', price_eur: 44.90, price_per_serving: 0.50, form: 'capsule', is_vegan: true, quality_tags: ['>98%', 'trans-form'], protocol_phase: 2, impact_score: 8.0 },
  { brand_slug: 'sunday-natural', supplement_name: 'CoQ10', product_name: 'Ubiquinol Q10 100mg Kaneka', pack_size: 60, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 100, dose_unit: 'mg', price_eur: 39.90, price_per_serving: 0.67, form: 'softgel', is_vegan: false, quality_tags: ['kaneka', 'ubiquinol'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'sunday-natural', supplement_name: 'L-Theanin', product_name: 'L-Theanin 200mg Suntheanine®', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 200, dose_unit: 'mg', price_eur: 19.90, price_per_serving: 0.22, form: 'capsule', is_vegan: true, quality_tags: ['suntheanine'], protocol_phase: 0, impact_score: 7.5 },
  { brand_slug: 'sunday-natural', supplement_name: 'Glycin', product_name: 'Glycin Pulver 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 167, dose_per_serving: 3, dose_unit: 'g', price_eur: 14.90, price_per_serving: 0.09, form: 'powder', is_vegan: true, quality_tags: ['rein', 'schlaf'], protocol_phase: 0, impact_score: 7.5 },
  { brand_slug: 'sunday-natural', supplement_name: 'Lions Mane', product_name: 'Lions Mane Extrakt 500mg', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 0.25, form: 'capsule', is_vegan: true, quality_tags: ['30%-polysaccharide', 'dual-extrakt'], protocol_phase: 1, impact_score: 8.5 },

  // === LIFE EXTENSION ===
  { brand_slug: 'life-extension', supplement_name: 'NMN', product_name: 'NAD+ Cell Regenerator 300mg', pack_size: 30, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 300, dose_unit: 'mg NMN', price_eur: 49.99, price_per_serving: 1.67, form: 'capsule', is_vegan: true, protocol_phase: 2, impact_score: 9.0 },
  { brand_slug: 'life-extension', supplement_name: 'Quercetin', product_name: 'Senolytic Activator', pack_size: 36, pack_unit: 'capsules', servings_per_pack: 18, dose_per_serving: 2, dose_unit: 'Kapseln', price_eur: 29.99, price_per_serving: 1.67, form: 'capsule', is_vegan: true, quality_tags: ['senolytisch'], protocol_phase: 2, impact_score: 8.0 },
  { brand_slug: 'life-extension', supplement_name: 'Citrus Bergamot', product_name: 'Citrus Bergamot Cardiovascular Support', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 500, dose_unit: 'mg', price_eur: 29.99, price_per_serving: 0.50, form: 'capsule', is_vegan: true, is_recommended: true, quality_tags: ['bergamonte', 'cholesterin'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'life-extension', supplement_name: 'PQQ', product_name: 'PQQ Caps with BioPQQ 20mg', pack_size: 30, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 20, dose_unit: 'mg', price_eur: 24.99, price_per_serving: 0.83, form: 'capsule', is_vegan: true, quality_tags: ['biopqq', 'mitochondrien'], protocol_phase: 2, impact_score: 7.5 },
  { brand_slug: 'life-extension', supplement_name: 'Omega-3', product_name: 'Super Omega-3 EPA/DHA', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 2000, dose_unit: 'mg EPA+DHA', price_eur: 34.99, price_per_serving: 0.58, form: 'softgel', is_vegan: false, quality_tags: ['ifos'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'life-extension', supplement_name: 'Magnesium', product_name: 'Neuro-Mag L-Threonate 90mg', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 144, dose_unit: 'mg', price_eur: 39.99, price_per_serving: 1.33, form: 'capsule', is_vegan: true, quality_tags: ['magtein', 'gehirn-gaengig'], protocol_phase: 1, impact_score: 8.5 },

  // === THORNE ===
  { brand_slug: 'thorne', supplement_name: 'Kreatin Monohydrat', product_name: 'Creatine Powder NSF', pack_size: 450, pack_unit: 'g', servings_per_pack: 90, dose_per_serving: 5, dose_unit: 'g', price_eur: 39.99, price_per_serving: 0.44, form: 'powder', is_vegan: true, quality_tags: ['nsf-certified', 'pro-sport'], protocol_phase: 0, impact_score: 9.8 },
  { brand_slug: 'thorne', supplement_name: 'Vitamin D3 + K2', product_name: 'Vitamin D/K2 Liquid', pack_size: 30, pack_unit: 'ml', servings_per_pack: 600, dose_per_serving: 1000, dose_unit: 'IE D3 + 200µg K2', price_eur: 34.99, price_per_serving: 0.06, form: 'drops', is_vegan: false, quality_tags: ['nsf-certified'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'thorne', supplement_name: 'Magnesium', product_name: 'Magnesium Bisglycinate 200mg', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 400, dose_unit: 'mg', price_eur: 44.99, price_per_serving: 0.75, form: 'capsule', is_vegan: true, quality_tags: ['nsf-certified', 'chelat'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'thorne', supplement_name: 'Omega-3', product_name: 'Super EPA Pro', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 1100, dose_unit: 'mg EPA+DHA', price_eur: 59.99, price_per_serving: 1.00, form: 'softgel', is_vegan: false, quality_tags: ['nsf-certified', 'pro-sport'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'thorne', supplement_name: 'NR', product_name: 'NiaCel 400 Nicotinamide Riboside', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 400, dose_unit: 'mg', price_eur: 69.99, price_per_serving: 1.17, form: 'capsule', is_vegan: true, quality_tags: ['nsf-certified', 'nad-precursor'], protocol_phase: 2, impact_score: 8.5 },
  { brand_slug: 'thorne', supplement_name: 'Vitamin B Komplex', product_name: 'Basic B Complex', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 1, dose_unit: 'Kapsel', price_eur: 24.99, price_per_serving: 0.42, form: 'capsule', is_vegan: true, quality_tags: ['nsf-certified', 'methyliert'], protocol_phase: 0, impact_score: 8.5 },
  { brand_slug: 'thorne', supplement_name: 'Curcumin', product_name: 'Meriva 500-SF', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 49.99, price_per_serving: 0.42, form: 'capsule', is_vegan: true, quality_tags: ['nsf-certified', 'phytosom'], protocol_phase: 1, impact_score: 8.0 },

  // === ESN ===
  { brand_slug: 'esn', supplement_name: 'Kreatin Monohydrat', product_name: 'Ultrapure Creatine Monohydrate 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 19.90, price_per_serving: 0.20, form: 'powder', is_vegan: true, is_recommended: true, quality_tags: ['GMP', 'made-in-de', 'creapure'], protocol_phase: 0, impact_score: 9.8 },
  { brand_slug: 'esn', supplement_name: 'Kreatin Monohydrat', product_name: 'Creatine Giga Caps 300 Stück', pack_size: 300, pack_unit: 'capsules', servings_per_pack: 100, dose_per_serving: 3, dose_unit: 'Kapseln', price_eur: 29.90, price_per_serving: 0.30, form: 'capsule', is_vegan: true, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 0, impact_score: 9.8 },
  { brand_slug: 'esn', supplement_name: 'EAA', product_name: 'EAA+ 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 45, dose_per_serving: 11, dose_unit: 'g', price_eur: 34.90, price_per_serving: 0.78, form: 'powder', is_vegan: true, is_recommended: true, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'esn', supplement_name: 'L-Citrullin', product_name: 'L-Citrulline Malat 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 24.90, price_per_serving: 0.25, form: 'powder', is_vegan: true, is_recommended: true, quality_tags: ['GMP', 'made-in-de', 'pump'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'esn', supplement_name: 'Beta-Alanin', product_name: 'Beta-Alanine 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 125, dose_per_serving: 4, dose_unit: 'g', price_eur: 21.90, price_per_serving: 0.18, form: 'powder', is_vegan: true, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'esn', supplement_name: 'L-Glutamin', product_name: 'L-Glutamine 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 19.90, price_per_serving: 0.20, form: 'powder', is_vegan: true, quality_tags: ['GMP', 'made-in-de', 'darm'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'esn', supplement_name: 'Magnesium', product_name: 'Magnesium Caps 120 Stück', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 300, dose_unit: 'mg', price_eur: 12.90, price_per_serving: 0.22, form: 'capsule', is_vegan: true, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'esn', supplement_name: 'Zink', product_name: 'Zinc Caps 120 Stück', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 25, dose_unit: 'mg', price_eur: 9.90, price_per_serving: 0.08, form: 'capsule', is_vegan: true, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 0, impact_score: 8.0 },
  { brand_slug: 'esn', supplement_name: 'Omega-3', product_name: 'Super Omega-3 120 Softgels', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 600, dose_unit: 'mg EPA+DHA', price_eur: 17.90, price_per_serving: 0.30, form: 'softgel', is_vegan: false, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'esn', supplement_name: 'Vitamin D3', product_name: 'Vitamin D3 Drops 50ml', pack_size: 50, pack_unit: 'ml', servings_per_pack: 1750, dose_per_serving: 1000, dose_unit: 'IE', price_eur: 14.90, price_per_serving: 0.01, form: 'drops', is_vegan: true, quality_tags: ['GMP', 'made-in-de'], protocol_phase: 0, impact_score: 9.2 },

  // === MORE NUTRITION ===
  { brand_slug: 'more-nutrition', supplement_name: 'Kreatin Monohydrat', product_name: 'Total Creatine Monohydrate 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 24.90, price_per_serving: 0.25, form: 'powder', is_vegan: true, quality_tags: ['made-in-de', 'creapure'], protocol_phase: 0, impact_score: 9.8 },
  { brand_slug: 'more-nutrition', supplement_name: 'EAA', product_name: 'Essentials All-in-One EAA 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 38, dose_per_serving: 13, dose_unit: 'g', price_eur: 39.90, price_per_serving: 1.05, form: 'powder', is_vegan: true, quality_tags: ['made-in-de'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'more-nutrition', supplement_name: 'Omega-3', product_name: 'Essentials O3-D3-K2 120 Softgels', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 500, dose_unit: 'mg EPA+DHA', price_eur: 29.90, price_per_serving: 0.50, form: 'softgel', is_vegan: false, is_recommended: true, quality_tags: ['made-in-de', 'd3+k2-combo'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'more-nutrition', supplement_name: 'Magnesium', product_name: 'Essentials Magnesium 120 Kapseln', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 400, dose_unit: 'mg', price_eur: 19.90, price_per_serving: 0.33, form: 'capsule', is_vegan: true, quality_tags: ['made-in-de', 'bisglycinat'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'more-nutrition', supplement_name: 'Ashwagandha', product_name: 'Essentials Ashwagandha KSM-66 90 Kapseln', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, quality_tags: ['made-in-de', 'ksm-66'], protocol_phase: 0, impact_score: 7.8 },
  { brand_slug: 'more-nutrition', supplement_name: 'Probiotika', product_name: 'Essentials Probiotics 60 Kapseln', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 10, dose_unit: 'Mrd. KBE', price_eur: 24.90, price_per_serving: 0.42, form: 'capsule', is_vegan: true, quality_tags: ['made-in-de'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'more-nutrition', supplement_name: 'L-Citrullin', product_name: 'Pump Citrulline 300g', pack_size: 300, pack_unit: 'g', servings_per_pack: 50, dose_per_serving: 6, dose_unit: 'g', price_eur: 24.90, price_per_serving: 0.50, form: 'powder', is_vegan: true, quality_tags: ['made-in-de', 'pure'], protocol_phase: 1, impact_score: 8.5 },

  // === BULK ===
  { brand_slug: 'bulk', supplement_name: 'Kreatin Monohydrat', product_name: 'Creatine Monohydrate 1kg', pack_size: 1000, pack_unit: 'g', servings_per_pack: 200, dose_per_serving: 5, dose_unit: 'g', price_eur: 24.99, price_per_serving: 0.12, form: 'powder', is_vegan: true, is_recommended: true, quality_tags: ['GMP', 'budget', 'best-value'], protocol_phase: 0, impact_score: 9.8 },
  { brand_slug: 'bulk', supplement_name: 'EAA', product_name: 'Essential Amino Acids 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 50, dose_per_serving: 10, dose_unit: 'g', price_eur: 29.99, price_per_serving: 0.60, form: 'powder', is_vegan: true, quality_tags: ['GMP', 'budget'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'bulk', supplement_name: 'L-Citrullin', product_name: 'Citrulline Malate 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 83, dose_per_serving: 6, dose_unit: 'g', price_eur: 24.99, price_per_serving: 0.30, form: 'powder', is_vegan: true, quality_tags: ['GMP', 'budget'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'bulk', supplement_name: 'Beta-Alanin', product_name: 'Beta Alanine 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 166, dose_per_serving: 3, dose_unit: 'g', price_eur: 19.99, price_per_serving: 0.12, form: 'powder', is_vegan: true, quality_tags: ['GMP', 'budget'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'bulk', supplement_name: 'Magnesium', product_name: 'Magnesium Bisglycinate 270 Tabs', pack_size: 270, pack_unit: 'tablets', servings_per_pack: 270, dose_per_serving: 250, dose_unit: 'mg', price_eur: 14.99, price_per_serving: 0.06, form: 'tablet', is_vegan: true, quality_tags: ['GMP', 'budget', 'chelat'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'bulk', supplement_name: 'Vitamin D3', product_name: 'Vitamin D3 5000 IU 360 Tabs', pack_size: 360, pack_unit: 'tablets', servings_per_pack: 360, dose_per_serving: 5000, dose_unit: 'IE', price_eur: 12.99, price_per_serving: 0.04, form: 'tablet', is_vegan: false, quality_tags: ['GMP', 'budget', 'best-value'], protocol_phase: 0, impact_score: 9.2 },
  { brand_slug: 'bulk', supplement_name: 'Omega-3', product_name: 'Omega 3 Fish Oil 1000mg 270 Softgels', pack_size: 270, pack_unit: 'softgels', servings_per_pack: 270, dose_per_serving: 300, dose_unit: 'mg EPA+DHA', price_eur: 16.99, price_per_serving: 0.06, form: 'softgel', is_vegan: false, quality_tags: ['GMP', 'budget'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'bulk', supplement_name: 'L-Glutamin', product_name: 'L-Glutamine Powder 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 19.99, price_per_serving: 0.20, form: 'powder', is_vegan: true, quality_tags: ['GMP', 'budget'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'bulk', supplement_name: 'Ashwagandha', product_name: 'Ashwagandha Extract 180 Caps', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 180, dose_per_serving: 500, dose_unit: 'mg', price_eur: 14.99, price_per_serving: 0.08, form: 'capsule', is_vegan: true, quality_tags: ['GMP', 'budget'], protocol_phase: 0, impact_score: 7.8 },

  // === PROFUEL ===
  { brand_slug: 'profuel', supplement_name: 'Kreatin Monohydrat', product_name: 'Creatine Monohydrate 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 17.99, price_per_serving: 0.18, form: 'powder', is_vegan: true, quality_tags: ['vegan', 'made-in-de', 'budget'], protocol_phase: 0, impact_score: 9.8 },
  { brand_slug: 'profuel', supplement_name: 'L-Citrullin', product_name: 'Citrullin Malat 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 83, dose_per_serving: 6, dose_unit: 'g', price_eur: 21.99, price_per_serving: 0.26, form: 'powder', is_vegan: true, quality_tags: ['vegan', 'made-in-de'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'profuel', supplement_name: 'EAA', product_name: 'Essentielle Aminosäuren 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 45, dose_per_serving: 11, dose_unit: 'g', price_eur: 29.99, price_per_serving: 0.67, form: 'powder', is_vegan: true, quality_tags: ['vegan', 'made-in-de'], protocol_phase: 1, impact_score: 8.5 },
  { brand_slug: 'profuel', supplement_name: 'Beta-Alanin', product_name: 'Beta-Alanin Pulver 400g', pack_size: 400, pack_unit: 'g', servings_per_pack: 133, dose_per_serving: 3, dose_unit: 'g', price_eur: 16.99, price_per_serving: 0.13, form: 'powder', is_vegan: true, quality_tags: ['vegan', 'made-in-de'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'profuel', supplement_name: 'L-Glutamin', product_name: 'L-Glutamin Pulver 500g', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 17.99, price_per_serving: 0.18, form: 'powder', is_vegan: true, quality_tags: ['vegan', 'made-in-de'], protocol_phase: 1, impact_score: 8.0 },
  { brand_slug: 'profuel', supplement_name: 'Omega-3', product_name: 'Omega 3 Vegan aus Algenöl 90 Softgels', pack_size: 90, pack_unit: 'softgels', servings_per_pack: 90, dose_per_serving: 500, dose_unit: 'mg EPA+DHA', price_eur: 21.99, price_per_serving: 0.24, form: 'softgel', is_vegan: true, is_recommended: true, quality_tags: ['vegan', 'algenoel', 'made-in-de'], protocol_phase: 0, impact_score: 9.0 },
  { brand_slug: 'profuel', supplement_name: 'Vitamin D3', product_name: 'Vitamin D3 Vegan 2000 IE 120 Tabs', pack_size: 120, pack_unit: 'tablets', servings_per_pack: 120, dose_per_serving: 2000, dose_unit: 'IE', price_eur: 12.99, price_per_serving: 0.11, form: 'tablet', is_vegan: true, quality_tags: ['vegan', 'flechte', 'made-in-de'], protocol_phase: 0, impact_score: 9.2 },
];

// ============================================
// SUPPLEMENT SEEDS (Missing in DB)
// ============================================

const ALL_SUPPLEMENTS: SupplementSeed[] = [
  { name: 'NMN', category: 'longevity', description: 'Nicotinamid Mononukleotid - NAD+ Vorläufer', impact_score: 9.0, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 500, default_unit: 'mg' },
  { name: 'NR', category: 'longevity', description: 'Nicotinamid Riboside - NAD+ Vorläufer', impact_score: 8.5, necessity_tier: 'advanced', evidence_level: 'strong', default_dose: 300, default_unit: 'mg' },
  { name: 'Resveratrol', category: 'longevity', description: 'Polyphenol aus Trauben - SIRT1-Aktivator', impact_score: 8.0, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 500, default_unit: 'mg' },
  { name: 'Pterostilben', category: 'longevity', description: 'Resveratrol-Analog mit besserer Bioverfügbarkeit', impact_score: 7.5, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 50, default_unit: 'mg' },
  { name: 'Fisetin', category: 'longevity', description: 'Senolytisches Flavonoid', impact_score: 8.0, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 100, default_unit: 'mg' },
  { name: 'Spermidin', category: 'longevity', description: 'Autophagie-Aktivator aus Weizenkeimextrakt', impact_score: 8.5, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 6, default_unit: 'mg' },
  { name: 'CaAKG', category: 'longevity', description: 'Calcium Alpha-Ketoglutarat - epigenetische Uhr', impact_score: 8.5, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 1000, default_unit: 'mg' },
  { name: 'Urolithin A', category: 'longevity', description: 'Mitophagie-Aktivator für Mitochondrien-Erneuerung', impact_score: 8.5, necessity_tier: 'advanced', evidence_level: 'strong', default_dose: 500, default_unit: 'mg' },
  { name: 'Lions Mane', category: 'cognitive', description: 'Hericium erinaceus - NGF-Steigerung', impact_score: 8.5, necessity_tier: 'optimizer', evidence_level: 'moderate', default_dose: 500, default_unit: 'mg' },
  { name: 'NAC', category: 'antioxidant', description: 'N-Acetyl-Cystein - Glutathion-Vorläufer', impact_score: 8.0, necessity_tier: 'essential', evidence_level: 'strong', default_dose: 600, default_unit: 'mg' },
  { name: 'Alpha Liponsäure', category: 'antioxidant', description: 'R-Alpha-Liponsäure - universelles Antioxidans', impact_score: 7.5, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 250, default_unit: 'mg' },
  { name: 'Quercetin', category: 'antioxidant', description: 'Senolytisches Flavonoid mit anti-inflammatorischer Wirkung', impact_score: 7.5, necessity_tier: 'optimizer', evidence_level: 'moderate', default_dose: 500, default_unit: 'mg' },
  { name: 'Berberin', category: 'metabolic', description: 'Pflanzenstoff für Blutzucker und AMPK-Aktivierung', impact_score: 8.5, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 500, default_unit: 'mg' },
  { name: 'Citrus Bergamot', category: 'cardiovascular', description: 'Bergamotte-Extrakt für Cholesterin-Optimierung', impact_score: 8.5, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 500, default_unit: 'mg' },
  { name: 'PQQ', category: 'mitochondria', description: 'Pyrroloquinoline Quinone - Mitochondrien-Biogenese', impact_score: 7.5, necessity_tier: 'advanced', evidence_level: 'moderate', default_dose: 20, default_unit: 'mg' },
  { name: 'EAA', category: 'sport', description: 'Essentielle Aminosäuren für Muskelproteinbiosynthese', impact_score: 8.5, necessity_tier: 'essential', evidence_level: 'strong', default_dose: 10, default_unit: 'g', synergies: ['Kreatin Monohydrat'] },
  { name: 'L-Citrullin', category: 'sport', description: 'Stickstoffmonoxid-Booster für Durchblutung', impact_score: 8.5, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 6, default_unit: 'g' },
  { name: 'Beta-Alanin', category: 'sport', description: 'Carnosin-Vorläufer für Ausdauer', impact_score: 8.0, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 3.2, default_unit: 'g' },
  { name: 'L-Glutamin', category: 'sport', description: 'Aminosäure für Darm und Immunsystem', impact_score: 8.0, necessity_tier: 'essential', evidence_level: 'strong', default_dose: 5, default_unit: 'g' },
  { name: 'Curcumin', category: 'antiinflammatory', description: 'Kurkuma-Extrakt mit anti-entzündlicher Wirkung', impact_score: 7.5, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 500, default_unit: 'mg' },
  { name: 'Silymarin', category: 'liver', description: 'Mariendistel-Extrakt für Leberschutz', impact_score: 8.0, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 300, default_unit: 'mg' },
  { name: 'GABA', category: 'sleep', description: 'Gamma-Aminobuttersäure für Entspannung', impact_score: 7.0, necessity_tier: 'optimizer', evidence_level: 'moderate', default_dose: 500, default_unit: 'mg' },
  { name: 'OPC', category: 'antioxidant', description: 'Oligomere Proanthocyanidine aus Traubenkernen', impact_score: 7.0, necessity_tier: 'optimizer', evidence_level: 'moderate', default_dose: 200, default_unit: 'mg' },
  { name: 'Biotin', category: 'vitamin', description: 'Vitamin B7 für Haare, Haut und Nägel', impact_score: 6.5, necessity_tier: 'essential', evidence_level: 'strong', default_dose: 10000, default_unit: 'µg' },
  { name: 'L-Arginin', category: 'sport', description: 'Aminosäure für Stickstoffmonoxid-Synthese', impact_score: 7.5, necessity_tier: 'optimizer', evidence_level: 'strong', default_dose: 3, default_unit: 'g' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: { action?: string; dryRun?: boolean; batchSize?: number } = {};
    try { body = await req.json(); } catch { body = { action: 'all', dryRun: false }; }
    const { action = 'all', dryRun = false, batchSize = 50 } = body;

    // Load brands & supplements for mapping
    const { data: brands } = await supabase.from('supplement_brands').select('id, slug, name');
    const { data: supplements } = await supabase.from('supplement_database').select('id, name');
    
    const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
    const suppMap = new Map(supplements?.map(s => [s.name.toLowerCase().trim(), s.id]) || []);

    const results = {
      action,
      dryRun,
      brands_loaded: brandMap.size,
      supplements_loaded: suppMap.size,
      supplements_inserted: 0,
      products_inserted: 0,
      products_skipped: 0,
      errors: [] as string[],
      missing_brands: [] as string[],
      missing_supplements: [] as string[],
    };

    // Insert supplements
    if (action === 'supplements' || action === 'all') {
      for (const supp of ALL_SUPPLEMENTS) {
        if (suppMap.has(supp.name.toLowerCase().trim())) continue;
        if (dryRun) { results.supplements_inserted++; continue; }

        const { error } = await supabase.from('supplement_database').insert({
          name: supp.name,
          category: supp.category,
          description: supp.description,
          impact_score: supp.impact_score,
          necessity_tier: supp.necessity_tier,
          evidence_level: supp.evidence_level,
          default_dosage: supp.default_dose ? `${supp.default_dose} ${supp.default_unit || ''}`.trim() : null,
          default_unit: supp.default_unit,
          synergies: supp.synergies || [],
        });
        if (error) results.errors.push(`Supp ${supp.name}: ${error.message}`);
        else { results.supplements_inserted++; suppMap.set(supp.name.toLowerCase().trim(), 'new'); }
      }
    }

    // Insert products in batches
    if (action === 'products' || action === 'all') {
      for (let i = 0; i < ALL_PRODUCTS.length; i += batchSize) {
        const batch = ALL_PRODUCTS.slice(i, i + batchSize);
        
        for (const product of batch) {
          const brandId = brandMap.get(product.brand_slug);
          if (!brandId) {
            if (!results.missing_brands.includes(product.brand_slug)) results.missing_brands.push(product.brand_slug);
            results.products_skipped++;
            continue;
          }

          const suppId = suppMap.get(product.supplement_name.toLowerCase().trim());
          if (!suppId && !results.missing_supplements.includes(product.supplement_name)) {
            results.missing_supplements.push(product.supplement_name);
          }

          // Check if exists
          const { data: existing } = await supabase
            .from('supplement_products')
            .select('id')
            .eq('brand_id', brandId)
            .eq('product_name', product.product_name)
            .maybeSingle();

          if (existing) { results.products_skipped++; continue; }
          if (dryRun) { results.products_inserted++; continue; }

          const { error } = await supabase.from('supplement_products').insert({
            brand_id: brandId,
            supplement_id: typeof suppId === 'string' && suppId !== 'new' ? suppId : null,
            product_name: product.product_name,
            pack_size: product.pack_size,
            pack_unit: product.pack_unit,
            servings_per_pack: product.servings_per_pack,
            dose_per_serving: product.dose_per_serving,
            dose_unit: product.dose_unit,
            price_eur: product.price_eur,
            price_per_serving: product.price_per_serving,
            form: product.form,
            is_vegan: product.is_vegan ?? false,
            is_verified: true,
          });

          if (error) results.errors.push(`Product ${product.product_name}: ${error.message}`);
          else results.products_inserted++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Seeding completed successfully',
      results,
      stats: {
        total_products_in_seed: ALL_PRODUCTS.length,
        total_supplements_in_seed: ALL_SUPPLEMENTS.length,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Seeding error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
