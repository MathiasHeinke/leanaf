import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// EMBEDDED DATA: 16 SUPPLEMENT BRANDS
// =====================================================

const BRANDS_DATA = [
  { name: 'Sunday Natural', slug: 'sunday-natural', country: 'DE', website: 'sunday.de', price_tier: 'premium', specialization: ['longevity', 'premium', 'vegan'], quality_certifications: ['GMP', 'ISO', 'vegan'], description: 'Premium Vitamine & Longevity-Supplements aus Deutschland.' },
  { name: 'MoleQlar', slug: 'moleqlar', country: 'DE', website: 'moleqlar.com', price_tier: 'luxury', specialization: ['longevity', 'research', 'nmn'], quality_certifications: ['GMP', 'pharma-grade'], description: 'Longevity-Spezialist. NMN, Resveratrol, Spermidin.' },
  { name: 'Naturtreu', slug: 'naturtreu', country: 'DE', website: 'naturtreu.de', price_tier: 'mid', specialization: ['natural', 'vegan', 'clean'], quality_certifications: ['vegan', 'organic', 'made-in-de'], description: 'Natürlich, vegan, Made in Germany.' },
  { name: 'Lebenskraft-pur', slug: 'lebenskraft-pur', country: 'DE', website: 'lebenskraft-pur.de', price_tier: 'premium', specialization: ['holistic', 'naturopathy'], quality_certifications: ['organic', 'vegan'], description: 'Ganzheitliche Naturheilkunde.' },
  { name: 'ESN', slug: 'esn', country: 'DE', website: 'esn.com', price_tier: 'mid', specialization: ['sport', 'fitness', 'protein'], quality_certifications: ['GMP', 'made-in-de'], description: 'Deutschlands größter Sport-Supplement-Hersteller.' },
  { name: 'More Nutrition', slug: 'more-nutrition', country: 'DE', website: 'morenutrition.de', price_tier: 'mid', specialization: ['sport', 'influencer', 'fitness'], quality_certifications: ['GMP', 'made-in-de'], description: 'Sport-Supplements, Influencer-Brand.' },
  { name: 'ProFuel', slug: 'profuel', country: 'DE', website: 'profuel.de', price_tier: 'budget', specialization: ['sport', 'vegan'], quality_certifications: ['vegan', 'made-in-de'], description: 'Vegane Sport-Supplements.' },
  { name: 'Bulk', slug: 'bulk', country: 'UK', website: 'bulk.com', price_tier: 'budget', specialization: ['sport', 'basics', 'budget'], quality_certifications: ['GMP'], description: 'Günstige Basics. Beste Preis-Leistung.' },
  { name: 'Doppelherz', slug: 'doppelherz', country: 'DE', website: 'doppelherz.de', price_tier: 'mid', specialization: ['pharmacy', 'classic'], quality_certifications: ['pharma-grade'], description: 'Klassiker in deutschen Apotheken.' },
  { name: 'Orthomol', slug: 'orthomol', country: 'DE', website: 'orthomol.de', price_tier: 'luxury', specialization: ['pharmacy', 'medical', 'premium'], quality_certifications: ['pharma-grade', 'medical'], description: 'Apotheken-Premium. Orthomolekulare Medizin.' },
  { name: 'Nature Love', slug: 'nature-love', country: 'DE', website: 'naturelove.de', price_tier: 'mid', specialization: ['amazon', 'vegan', 'natural'], quality_certifications: ['vegan', 'made-in-de'], description: 'Amazon-Bestseller.' },
  { name: 'Now Foods', slug: 'now-foods', country: 'US', website: 'nowfoods.com', price_tier: 'budget', specialization: ['basics', 'budget', 'broad'], quality_certifications: ['GMP', 'kosher'], description: 'Breites Sortiment, günstig.' },
  { name: 'Life Extension', slug: 'life-extension', country: 'US', website: 'lifeextensioneurope.de', price_tier: 'premium', specialization: ['longevity', 'research', 'premium'], quality_certifications: ['GMP', 'research-grade'], description: 'Longevity-Fokus, US-Qualität.' },
  { name: 'Thorne', slug: 'thorne', country: 'US', website: 'thorne.com', price_tier: 'luxury', specialization: ['premium', 'sport', 'medical'], quality_certifications: ['NSF-certified', 'pharma-grade'], description: 'Premium, Profi-Sport. NSF-zertifiziert.' },
  { name: 'Nordic Naturals', slug: 'nordic-naturals', country: 'US', website: 'nordicnaturals.com', price_tier: 'premium', specialization: ['omega-3', 'fish-oil'], quality_certifications: ['IFOS', 'sustainable'], description: 'Omega-3 Spezialist.' },
  { name: "Doctor's Best", slug: 'doctors-best', country: 'US', website: 'drbvitamins.com', price_tier: 'mid', specialization: ['research', 'quality', 'value'], quality_certifications: ['GMP', 'research-grade'], description: 'Qualität und Forschung.' },
];

// =====================================================
// EMBEDDED DATA: SUPPLEMENT PRODUCTS (80+)
// =====================================================

const PRODUCTS_DATA = [
  // CREATINE
  { brand_slug: 'esn', supplement_name: 'Creatine Monohydrate', product_name: 'Ultrapure Creatine Monohydrate', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 19.90, price_per_serving: 0.20, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'bulk', supplement_name: 'Creatine Monohydrate', product_name: 'Creatine Monohydrate Powder', pack_size: 1000, pack_unit: 'g', servings_per_pack: 200, dose_per_serving: 5, dose_unit: 'g', price_eur: 24.99, price_per_serving: 0.12, form: 'powder', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'more-nutrition', supplement_name: 'Creatine Monohydrate', product_name: 'Creatine Monohydrate', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 24.90, price_per_serving: 0.25, form: 'powder', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'esn', supplement_name: 'Creatine Monohydrate', product_name: 'Creatine Giga Caps', pack_size: 300, pack_unit: 'capsules', servings_per_pack: 100, dose_per_serving: 3000, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 0.30, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // MAGNESIUM
  { brand_slug: 'sunday-natural', supplement_name: 'Magnesium Glycinate', product_name: 'Magnesium Glycinat', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 400, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'naturtreu', supplement_name: 'Magnesium Complex', product_name: 'Kraftreserve Magnesium', pack_size: 180, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 400, dose_unit: 'mg', price_eur: 22.90, price_per_serving: 0.25, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'moleqlar', supplement_name: 'Magnesium L-Threonate', product_name: 'Magnesium L-Threonat', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 2000, dose_unit: 'mg', price_eur: 34.90, price_per_serving: 1.16, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'now-foods', supplement_name: 'Magnesium Citrate', product_name: 'Magnesium Citrate', pack_size: 240, pack_unit: 'capsules', servings_per_pack: 80, dose_per_serving: 400, dose_unit: 'mg', price_eur: 18.99, price_per_serving: 0.24, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // OMEGA-3
  { brand_slug: 'sunday-natural', supplement_name: 'Omega-3', product_name: 'Omega-3 Algae Oil EPA+DHA', pack_size: 90, pack_unit: 'softgels', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 0.33, form: 'softgel', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'nordic-naturals', supplement_name: 'Omega-3', product_name: 'Ultimate Omega', pack_size: 120, pack_unit: 'softgels', servings_per_pack: 60, dose_per_serving: 1100, dose_unit: 'mg', price_eur: 44.95, price_per_serving: 0.75, form: 'softgel', is_vegan: false, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'naturtreu', supplement_name: 'Omega-3', product_name: 'Algenkraft Omega-3', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 375, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.42, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // D3+K2
  { brand_slug: 'sunday-natural', supplement_name: 'Vitamin D3+K2', product_name: 'D3+K2 Tropfen', pack_size: 300, pack_unit: 'drops', servings_per_pack: 300, dose_per_serving: 5000, dose_unit: 'IU', price_eur: 24.90, price_per_serving: 0.08, form: 'drops', is_vegan: false, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'naturtreu', supplement_name: 'Vitamin D3+K2', product_name: 'Sonnenfreuden D3+K2', pack_size: 60, pack_unit: 'ml', servings_per_pack: 1800, dose_per_serving: 1000, dose_unit: 'IU', price_eur: 18.90, price_per_serving: 0.01, form: 'drops', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'profuel', supplement_name: 'Vitamin D3+K2', product_name: 'Vitamin D3+K2 Tabletten', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 5000, dose_unit: 'IU', price_eur: 19.90, price_per_serving: 0.05, form: 'tablet', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // ASHWAGANDHA
  { brand_slug: 'sunday-natural', supplement_name: 'Ashwagandha KSM-66', product_name: 'Ashwagandha KSM-66', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'naturtreu', supplement_name: 'Ashwagandha', product_name: 'Ruhewurzel Ashwagandha', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 600, dose_unit: 'mg', price_eur: 21.90, price_per_serving: 0.24, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  { brand_slug: 'now-foods', supplement_name: 'Ashwagandha', product_name: 'Ashwagandha Extract', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 450, dose_unit: 'mg', price_eur: 14.99, price_per_serving: 0.17, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // ZINK
  { brand_slug: 'sunday-natural', supplement_name: 'Zinc Bisglycinate', product_name: 'Zink Bisglycinat', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 25, dose_unit: 'mg', price_eur: 18.90, price_per_serving: 0.05, form: 'tablet', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'naturtreu', supplement_name: 'Zinc', product_name: 'Wundervoll Zink', pack_size: 365, pack_unit: 'tablets', servings_per_pack: 365, dose_per_serving: 25, dose_unit: 'mg', price_eur: 16.90, price_per_serving: 0.05, form: 'tablet', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // COQ10
  { brand_slug: 'moleqlar', supplement_name: 'CoQ10 Ubiquinol', product_name: 'Coenzyme Q10 Ubiquinol', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 100, dose_unit: 'mg', price_eur: 34.90, price_per_serving: 0.58, form: 'capsule', is_vegan: false, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'sunday-natural', supplement_name: 'CoQ10 Ubiquinol', product_name: 'Q10 Ubiquinol Kaneka', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 100, dose_unit: 'mg', price_eur: 39.90, price_per_serving: 0.67, form: 'capsule', is_vegan: false, is_recommended: false, protocol_phase: 0 },
  // CITRUS BERGAMOT
  { brand_slug: 'life-extension', supplement_name: 'Citrus Bergamot', product_name: 'Citrus Bergamot', pack_size: 30, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 500, dose_unit: 'mg', price_eur: 24.00, price_per_serving: 0.80, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 1 },
  { brand_slug: 'doctors-best', supplement_name: 'Citrus Bergamot', product_name: 'Bergamot Extract', pack_size: 30, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 500, dose_unit: 'mg', price_eur: 19.99, price_per_serving: 0.67, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 1 },
  // TUDCA
  { brand_slug: 'moleqlar', supplement_name: 'TUDCA', product_name: 'TUDCA', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 250, dose_unit: 'mg', price_eur: 39.90, price_per_serving: 0.67, form: 'capsule', is_vegan: false, is_recommended: true, protocol_phase: 1 },
  // EAA
  { brand_slug: 'esn', supplement_name: 'EAA Complex', product_name: 'EAA+', pack_size: 500, pack_unit: 'g', servings_per_pack: 50, dose_per_serving: 10, dose_unit: 'g', price_eur: 34.90, price_per_serving: 0.70, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 1 },
  { brand_slug: 'bulk', supplement_name: 'EAA Complex', product_name: 'Essential Amino Acids', pack_size: 500, pack_unit: 'g', servings_per_pack: 50, dose_per_serving: 10, dose_unit: 'g', price_eur: 27.99, price_per_serving: 0.56, form: 'powder', is_vegan: true, is_recommended: false, protocol_phase: 1 },
  // NMN
  { brand_slug: 'moleqlar', supplement_name: 'NMN', product_name: 'Uthever NMN Pulver 15g', pack_size: 15, pack_unit: 'g', servings_per_pack: 60, dose_per_serving: 250, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.42, form: 'powder', is_vegan: true, is_recommended: false, protocol_phase: 2 },
  { brand_slug: 'moleqlar', supplement_name: 'NMN', product_name: 'Uthever NMN Pulver 60g', pack_size: 60, pack_unit: 'g', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 72.90, price_per_serving: 0.61, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 2 },
  { brand_slug: 'moleqlar', supplement_name: 'NMN', product_name: 'Uthever NMN Pulver 100g', pack_size: 100, pack_unit: 'g', servings_per_pack: 200, dose_per_serving: 500, dose_unit: 'mg', price_eur: 92.90, price_per_serving: 0.46, form: 'powder', is_vegan: true, is_recommended: false, protocol_phase: 2 },
  // CA-AKG
  { brand_slug: 'moleqlar', supplement_name: 'Ca-AKG', product_name: 'Calcium Alpha-Ketoglutarat Kapseln', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 1000, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 1.00, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 2 },
  { brand_slug: 'moleqlar', supplement_name: 'Ca-AKG', product_name: 'CaAKG Pulver', pack_size: 100, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 1000, dose_unit: 'mg', price_eur: 34.90, price_per_serving: 0.35, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 2 },
  // RESVERATROL
  { brand_slug: 'moleqlar', supplement_name: 'Trans-Resveratrol', product_name: 'Trans-Resveratrol Pulver', pack_size: 60, pack_unit: 'g', servings_per_pack: 120, dose_per_serving: 500, dose_unit: 'mg', price_eur: 49.90, price_per_serving: 0.42, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 2 },
  { brand_slug: 'thorne', supplement_name: 'Resveratrol', product_name: 'ResveraCel', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 150, dose_unit: 'mg', price_eur: 59.00, price_per_serving: 0.98, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 2 },
  // SPERMIDIN
  { brand_slug: 'moleqlar', supplement_name: 'Spermidine', product_name: 'Spermidin', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 3, dose_unit: 'mg', price_eur: 49.90, price_per_serving: 1.66, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 2 },
  // FISETIN
  { brand_slug: 'moleqlar', supplement_name: 'Fisetin', product_name: 'Fisetin Kapseln', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 30, dose_per_serving: 200, dose_unit: 'mg', price_eur: 37.90, price_per_serving: 1.26, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 2 },
  // L-THEANINE
  { brand_slug: 'sunday-natural', supplement_name: 'L-Theanine', product_name: 'L-Theanin', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 200, dose_unit: 'mg', price_eur: 19.90, price_per_serving: 0.22, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // GLYCINE
  { brand_slug: 'moleqlar', supplement_name: 'Glycine', product_name: 'Glycin Pulver', pack_size: 300, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 3, dose_unit: 'g', price_eur: 19.90, price_per_serving: 0.20, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'bulk', supplement_name: 'Glycine', product_name: 'Glycine Powder', pack_size: 500, pack_unit: 'g', servings_per_pack: 167, dose_per_serving: 3, dose_unit: 'g', price_eur: 14.99, price_per_serving: 0.09, form: 'powder', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // APIGENIN
  { brand_slug: 'moleqlar', supplement_name: 'Apigenin', product_name: 'Apigenin', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 50, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.42, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // LIONS MANE
  { brand_slug: 'sunday-natural', supplement_name: "Lion's Mane", product_name: 'Bio Hericium Extrakt', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 500, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'profuel', supplement_name: "Lion's Mane", product_name: "Lion's Mane Extrakt", pack_size: 180, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 2000, dose_unit: 'mg', price_eur: 19.95, price_per_serving: 0.33, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // ALPHA-GPC
  { brand_slug: 'sunday-natural', supplement_name: 'Alpha-GPC', product_name: 'Alpha-GPC 50%', pack_size: 90, pack_unit: 'capsules', servings_per_pack: 90, dose_per_serving: 300, dose_unit: 'mg', price_eur: 24.90, price_per_serving: 0.28, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // BERBERIN
  { brand_slug: 'doctors-best', supplement_name: 'Berberine', product_name: 'Berberin 500mg', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 500, dose_unit: 'mg', price_eur: 17.50, price_per_serving: 0.29, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // L-GLUTAMIN
  { brand_slug: 'esn', supplement_name: 'L-Glutamine', product_name: 'L-Glutamin Pulver', pack_size: 500, pack_unit: 'g', servings_per_pack: 100, dose_per_serving: 5, dose_unit: 'g', price_eur: 19.90, price_per_serving: 0.20, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // NAC
  { brand_slug: 'sunday-natural', supplement_name: 'NAC', product_name: 'NAC N-Acetylcystein', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 120, dose_per_serving: 600, dose_unit: 'mg', price_eur: 18.90, price_per_serving: 0.16, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // GLYNAC
  { brand_slug: 'moleqlar', supplement_name: 'GlyNAC', product_name: 'GlyNAC Kapseln', pack_size: 120, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 1200, dose_unit: 'mg', price_eur: 34.90, price_per_serving: 0.58, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // KOLLAGEN
  { brand_slug: 'esn', supplement_name: 'Collagen', product_name: 'Collagen Peptide', pack_size: 300, pack_unit: 'g', servings_per_pack: 30, dose_per_serving: 10, dose_unit: 'g', price_eur: 24.90, price_per_serving: 0.83, form: 'powder', is_vegan: false, is_recommended: true, protocol_phase: 0 },
  // MSM
  { brand_slug: 'sunday-natural', supplement_name: 'MSM', product_name: 'MSM OptiMSM', pack_size: 365, pack_unit: 'capsules', servings_per_pack: 122, dose_per_serving: 3000, dose_unit: 'mg', price_eur: 19.90, price_per_serving: 0.16, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  // CURCUMIN
  { brand_slug: 'sunday-natural', supplement_name: 'Curcumin', product_name: 'Curcumin Mizellen', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 500, dose_unit: 'mg', price_eur: 29.90, price_per_serving: 0.50, form: 'capsule', is_vegan: true, is_recommended: true, protocol_phase: 0 },
  { brand_slug: 'moleqlar', supplement_name: 'Curcumin', product_name: 'Longvida Curcumin', pack_size: 60, pack_unit: 'capsules', servings_per_pack: 60, dose_per_serving: 400, dose_unit: 'mg', price_eur: 34.90, price_per_serving: 0.58, form: 'capsule', is_vegan: true, is_recommended: false, protocol_phase: 0 },
  // ALL-IN-ONE
  { brand_slug: 'moleqlar', supplement_name: 'All-in-One Longevity', product_name: 'ONE Daily Longevity Complex', pack_size: 30, pack_unit: 'sachets', servings_per_pack: 30, dose_per_serving: 1, dose_unit: 'g', price_eur: 89.90, price_per_serving: 3.00, form: 'powder', is_vegan: true, is_recommended: true, protocol_phase: 2 },
];

// =====================================================
// EMBEDDED DATA: SUPPLEMENT CATALOG (53 entries)
// =====================================================

const SUPPLEMENTS_DATA = [
  // PHASE 0 - SCHLAF
  { name: 'Magnesium Glycinat', category: 'Schlaf', default_dosage: '400', default_unit: 'mg', timing_constraint: 'bedtime', interaction_tags: [], brand_recommendation: 'Sunday Natural', description: 'Beste Bioverfügbarkeit, entspannt Muskeln, fördert Tiefschlaf.', protocol_phase: 0, impact_score: 9.5, necessity_tier: 'essential', priority_score: 95, evidence_level: 'stark', hallmarks_addressed: ['sleep', 'stress', 'muscle'], cost_per_day_eur: 0.25 },
  { name: 'L-Theanin', category: 'Schlaf', default_dosage: '200', default_unit: 'mg', timing_constraint: 'bedtime', interaction_tags: [], brand_recommendation: 'Now Foods', description: 'Aminosäure aus Grüntee. Fördert Alpha-Wellen.', protocol_phase: 0, impact_score: 7.5, necessity_tier: 'optimizer', priority_score: 85, evidence_level: 'stark', hallmarks_addressed: ['sleep', 'focus', 'stress'], cost_per_day_eur: 0.20 },
  { name: 'Apigenin', category: 'Schlaf', default_dosage: '50', default_unit: 'mg', timing_constraint: 'bedtime', interaction_tags: [], brand_recommendation: 'Double Wood', description: 'Kamillen-Extrakt. Anxiolytisch, bindet an GABA-Rezeptoren.', protocol_phase: 0, impact_score: 7.0, necessity_tier: 'optimizer', priority_score: 80, evidence_level: 'moderat', hallmarks_addressed: ['sleep', 'anxiety'], cost_per_day_eur: 0.35 },
  { name: 'Glycin', category: 'Schlaf', default_dosage: '3', default_unit: 'g', timing_constraint: 'bedtime', interaction_tags: [], brand_recommendation: 'Bulk', description: 'Senkt Körpertemperatur, verbessert Tiefschlaf-Qualität.', protocol_phase: 0, impact_score: 7.2, necessity_tier: 'optimizer', priority_score: 78, evidence_level: 'stark', hallmarks_addressed: ['sleep'], cost_per_day_eur: 0.10 },
  { name: 'Taurin', category: 'Schlaf', default_dosage: '2', default_unit: 'g', timing_constraint: 'bedtime', interaction_tags: [], brand_recommendation: 'ESN', description: 'GABA-Agonist mit beruhigender Wirkung.', protocol_phase: 0, impact_score: 6.8, necessity_tier: 'specialist', priority_score: 70, evidence_level: 'moderat', hallmarks_addressed: ['sleep', 'heart'], cost_per_day_eur: 0.08 },
  // PHASE 0 - TESTOSTERON
  { name: 'Vitamin D3 + K2', category: 'Testosteron', default_dosage: '5000 IU + 200mcg', default_unit: 'Tropfen', timing_constraint: 'with_fats', interaction_tags: ['needs_fat'], brand_recommendation: 'Sunday Natural', description: 'Hormon-Vorstufe, 60%+ der DACH-Bevölkerung defizitär.', protocol_phase: 0, impact_score: 9.0, necessity_tier: 'essential', priority_score: 92, evidence_level: 'stark', hallmarks_addressed: ['testosterone', 'bone', 'immune'], cost_per_day_eur: 0.15 },
  { name: 'Zink Bisglycinat', category: 'Testosteron', default_dosage: '25', default_unit: 'mg', timing_constraint: 'fasted', interaction_tags: ['blocks_copper'], brand_recommendation: 'Sunday Natural', description: 'Aromatase-Hemmung, unterstützt Testosteron-Synthese.', protocol_phase: 0, impact_score: 7.5, necessity_tier: 'optimizer', priority_score: 82, evidence_level: 'stark', hallmarks_addressed: ['testosterone', 'immune'], cost_per_day_eur: 0.12 },
  { name: 'Bor', category: 'Testosteron', default_dosage: '10', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Now Foods', description: 'Erhöht freies Testosteron um 25% durch SHBG-Reduktion.', protocol_phase: 0, impact_score: 7.0, necessity_tier: 'optimizer', priority_score: 75, evidence_level: 'stark', hallmarks_addressed: ['testosterone'], cost_per_day_eur: 0.05 },
  { name: 'Tongkat Ali', category: 'Testosteron', default_dosage: '400', default_unit: 'mg', timing_constraint: 'any', interaction_tags: ['avoid_evening'], brand_recommendation: 'Double Wood', description: 'LH-Stimulation, erhöht freies Testosteron.', protocol_phase: 0, impact_score: 6.5, necessity_tier: 'specialist', priority_score: 65, evidence_level: 'moderat', hallmarks_addressed: ['testosterone', 'libido'], cost_per_day_eur: 0.60 },
  { name: 'Fadogia Agrestis', category: 'Testosteron', default_dosage: '600', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Double Wood', description: 'LH-Upregulation, synergistisch mit Tongkat Ali.', protocol_phase: 0, impact_score: 6.0, necessity_tier: 'specialist', priority_score: 60, evidence_level: 'moderat', hallmarks_addressed: ['testosterone'], cost_per_day_eur: 0.55 },
  { name: 'Shilajit', category: 'Testosteron', default_dosage: '500', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Primavie', description: 'Fulvinsäuren für Mitochondrien-Funktion.', protocol_phase: 0, impact_score: 6.2, necessity_tier: 'specialist', priority_score: 62, evidence_level: 'moderat', hallmarks_addressed: ['testosterone', 'energy'], cost_per_day_eur: 0.70 },
  // PHASE 0 - ENERGIE
  { name: 'Creatine Monohydrat', category: 'Energie', default_dosage: '5', default_unit: 'g', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'ESN', description: 'Das am besten erforschte Supplement überhaupt.', protocol_phase: 0, impact_score: 9.8, necessity_tier: 'essential', priority_score: 98, evidence_level: 'stark', hallmarks_addressed: ['energy', 'muscle', 'brain'], cost_per_day_eur: 0.08 },
  { name: 'CoQ10 Ubiquinol', category: 'Energie', default_dosage: '100', default_unit: 'mg', timing_constraint: 'with_fats', interaction_tags: ['needs_fat'], brand_recommendation: 'Kaneka', description: 'Elektronentransportkette der Mitochondrien.', protocol_phase: 0, impact_score: 7.2, necessity_tier: 'optimizer', priority_score: 72, evidence_level: 'stark', hallmarks_addressed: ['energy', 'heart', 'longevity'], cost_per_day_eur: 0.45 },
  { name: 'PQQ', category: 'Energie', default_dosage: '20', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Now Foods', description: 'Mitochondrien-Biogenese.', protocol_phase: 0, impact_score: 6.5, necessity_tier: 'specialist', priority_score: 65, evidence_level: 'moderat', hallmarks_addressed: ['energy', 'longevity'], cost_per_day_eur: 0.80 },
  { name: 'Alpha-Liponsäure', category: 'Energie', default_dosage: '600', default_unit: 'mg', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'Sunday Natural', description: 'Master-Antioxidans.', protocol_phase: 0, impact_score: 6.8, necessity_tier: 'specialist', priority_score: 68, evidence_level: 'moderat', hallmarks_addressed: ['energy', 'longevity', 'glucose'], cost_per_day_eur: 0.35 },
  // PHASE 0 - ENTZÜNDUNG
  { name: 'Omega-3 (EPA/DHA)', category: 'Entzündung', default_dosage: '3', default_unit: 'g', timing_constraint: 'with_fats', interaction_tags: ['needs_fat'], brand_recommendation: 'Nordic Naturals', description: 'Anti-inflammatorisch, kardiovaskuläre Benefits.', protocol_phase: 0, impact_score: 9.2, necessity_tier: 'essential', priority_score: 93, evidence_level: 'stark', hallmarks_addressed: ['inflammation', 'heart', 'brain'], cost_per_day_eur: 0.40 },
  { name: 'Curcumin Longvida', category: 'Entzündung', default_dosage: '500', default_unit: 'mg', timing_constraint: 'with_fats', interaction_tags: ['needs_fat', 'needs_piperine'], brand_recommendation: 'ProHealth', description: 'BBB-gängige Form, anti-inflammatorisch.', protocol_phase: 0, impact_score: 7.0, necessity_tier: 'optimizer', priority_score: 70, evidence_level: 'stark', hallmarks_addressed: ['inflammation', 'brain'], cost_per_day_eur: 0.50 },
  { name: 'Probiotika Multi-Strain', category: 'Darm', default_dosage: '50B', default_unit: 'CFU', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'Garden of Life', description: 'Darm-Hirn-Achse, Multi-Strain für Diversität.', protocol_phase: 0, impact_score: 7.3, necessity_tier: 'optimizer', priority_score: 73, evidence_level: 'stark', hallmarks_addressed: ['gut', 'immune', 'mood'], cost_per_day_eur: 0.60 },
  { name: 'L-Glutamin', category: 'Darm', default_dosage: '5', default_unit: 'g', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'Bulk', description: 'Darmschleimhaut-Repair, wichtig bei Leaky Gut.', protocol_phase: 0, impact_score: 6.5, necessity_tier: 'specialist', priority_score: 65, evidence_level: 'moderat', hallmarks_addressed: ['gut', 'muscle'], cost_per_day_eur: 0.15 },
  // PHASE 0 - STRESS
  { name: 'Ashwagandha KSM-66', category: 'Stress', default_dosage: '600', default_unit: 'mg', timing_constraint: 'any', interaction_tags: ['avoid_evening'], brand_recommendation: 'Sunday Natural', description: 'Cortisol-Reduktion um bis zu 30%.', protocol_phase: 0, impact_score: 7.8, necessity_tier: 'optimizer', priority_score: 78, evidence_level: 'stark', hallmarks_addressed: ['stress', 'testosterone', 'sleep'], cost_per_day_eur: 0.30 },
  { name: 'Rhodiola Rosea', category: 'Stress', default_dosage: '400', default_unit: 'mg', timing_constraint: 'any', interaction_tags: ['avoid_evening'], brand_recommendation: 'Now Foods', description: 'Stressresilienz und mentale Ausdauer.', protocol_phase: 0, impact_score: 7.0, necessity_tier: 'optimizer', priority_score: 70, evidence_level: 'stark', hallmarks_addressed: ['stress', 'energy', 'focus'], cost_per_day_eur: 0.25 },
  { name: 'Bacopa Monnieri', category: 'Stress', default_dosage: '300', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Synapsa', description: 'BDNF-Upregulation, Gedächtnisverbesserung.', protocol_phase: 0, impact_score: 6.8, necessity_tier: 'specialist', priority_score: 68, evidence_level: 'moderat', hallmarks_addressed: ['brain', 'memory', 'stress'], cost_per_day_eur: 0.35 },
  // PHASE 1 - TRT SUPPORT
  { name: 'Citrus Bergamot', category: 'TRT-Support', default_dosage: '1000', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'ProHealth', description: 'Senkt LDL-Cholesterin bei TRT-Usern signifikant.', protocol_phase: 1, impact_score: 8.5, necessity_tier: 'essential', priority_score: 88, evidence_level: 'stark', hallmarks_addressed: ['cholesterol', 'heart'], cost_per_day_eur: 0.70 },
  { name: 'TUDCA', category: 'TRT-Support', default_dosage: '500', default_unit: 'mg', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'Double Wood', description: 'Gallensäure für Leberschutz.', protocol_phase: 1, impact_score: 8.0, necessity_tier: 'essential', priority_score: 85, evidence_level: 'stark', hallmarks_addressed: ['liver', 'gut'], cost_per_day_eur: 0.80 },
  { name: 'DIM', category: 'TRT-Support', default_dosage: '200', default_unit: 'mg', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Thorne', description: 'Östrogen-Metabolismus optimieren.', protocol_phase: 1, impact_score: 7.5, necessity_tier: 'optimizer', priority_score: 75, evidence_level: 'moderat', hallmarks_addressed: ['estrogen', 'testosterone'], cost_per_day_eur: 0.45 },
  { name: 'Taurin (kardioprotektiv)', category: 'TRT-Support', default_dosage: '3', default_unit: 'g', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'Bulk', description: 'Kardioprotektiv bei TRT.', protocol_phase: 1, impact_score: 7.8, necessity_tier: 'optimizer', priority_score: 78, evidence_level: 'stark', hallmarks_addressed: ['heart', 'longevity'], cost_per_day_eur: 0.12 },
  // PHASE 1 - GLP-1 SUPPORT
  { name: 'Elektrolyte (LMNT)', category: 'GLP-1 Support', default_dosage: '3', default_unit: 'g', timing_constraint: 'any', interaction_tags: [], brand_recommendation: 'LMNT', description: 'Natrium/Kalium-Balance bei GLP-1 Agonisten.', protocol_phase: 1, impact_score: 9.0, necessity_tier: 'essential', priority_score: 90, evidence_level: 'stark', hallmarks_addressed: ['hydration', 'energy'], cost_per_day_eur: 0.80 },
  { name: 'EAA Komplex', category: 'Muskelerhalt', default_dosage: '10', default_unit: 'g', timing_constraint: 'pre_workout', interaction_tags: [], brand_recommendation: 'ESN', description: 'Essentielle Aminosäuren für Muskelproteinsynthese.', protocol_phase: 1, impact_score: 8.0, necessity_tier: 'essential', priority_score: 82, evidence_level: 'stark', hallmarks_addressed: ['muscle', 'recovery'], cost_per_day_eur: 0.50 },
  // PHASE 2 - NAD+
  { name: 'NMN sublingual', category: 'NAD+', default_dosage: '500', default_unit: 'mg', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'ProHealth', description: 'NAD+ Precursor für zelluläre Energieproduktion.', protocol_phase: 2, impact_score: 5.5, necessity_tier: 'specialist', priority_score: 55, evidence_level: 'moderat', hallmarks_addressed: ['longevity', 'energy'], cost_per_day_eur: 3.50 },
  { name: 'Trans-Resveratrol', category: 'NAD+', default_dosage: '500', default_unit: 'mg', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'Thorne', description: 'Sirtuin-Aktivator, synergistisch mit NMN.', protocol_phase: 2, impact_score: 6.0, necessity_tier: 'specialist', priority_score: 60, evidence_level: 'moderat', hallmarks_addressed: ['longevity'], cost_per_day_eur: 0.80 },
  { name: 'Fisetin', category: 'NAD+', default_dosage: '500', default_unit: 'mg', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: "Doctor's Best", description: 'Potentes Senolytikum. Pulsed-Protokoll empfohlen.', protocol_phase: 2, impact_score: 6.0, necessity_tier: 'specialist', priority_score: 60, evidence_level: 'moderat', hallmarks_addressed: ['longevity', 'senescence'], cost_per_day_eur: 0.45 },
  // PHASE 3 - LONGEVITY
  { name: 'Ca-AKG (Rejuvant)', category: 'Longevity', default_dosage: '1', default_unit: 'g', timing_constraint: 'fasted', interaction_tags: [], brand_recommendation: 'Rejuvant', description: 'Epigenetische Verjüngung.', protocol_phase: 3, impact_score: 6.0, necessity_tier: 'specialist', priority_score: 60, evidence_level: 'moderat', hallmarks_addressed: ['longevity', 'epigenetics'], cost_per_day_eur: 1.50 },
];

// =====================================================
// EMBEDDED DATA: 20 PEPTIDE COMPOUNDS
// =====================================================

// Note: 'id' field removed - DB uses auto-generated UUIDs, we match by name
const PEPTIDES_DATA = [
  { name: 'BPC-157', category: 'healing', description: 'Body Protection Compound - Tissue Repair Peptid', mechanism: 'Stimuliert Angiogenese, beschleunigt Wundheilung', impact_score: 8.5, protocol_phase: 2, dosage_research: '250-500 mcg/Tag', frequency: '1-2x täglich', administration_route: 'subcutaneous', cycle_protocol: '4-8 Wochen on, dann Pause', timing_notes: 'Nahe der Verletzungsstelle injizieren', synergies: ['TB-500', 'GHK-Cu'], warnings: ['Research-only', 'Steriles Arbeiten erforderlich'], legal_status: 'research_only' },
  { name: 'TB-500 (Thymosin Beta-4)', category: 'healing', description: 'Tissue Repair & Anti-Inflammation Peptid', mechanism: 'Fördert Zellmigration, reduziert Fibrose', impact_score: 8.0, protocol_phase: 2, dosage_research: '2-5 mg 2x/Woche', frequency: '2x pro Woche', administration_route: 'subcutaneous', cycle_protocol: '4-6 Wochen Loading, dann 2x/Monat Erhaltung', timing_notes: 'Kann mit BPC-157 kombiniert werden', synergies: ['BPC-157'], warnings: ['Research-only', 'Nicht bei aktiven Krebserkrankungen'], legal_status: 'research_only' },
  { name: 'GHK-Cu (Kupferpeptid)', category: 'skin', description: 'Skin/Collagen/Anti-Aging Peptid', mechanism: 'Stimuliert Kollagen, reduziert Entzündungen', impact_score: 7.5, protocol_phase: 2, dosage_research: '1-2 mg/Tag', frequency: 'Täglich oder zyklisch', administration_route: 'subcutaneous', cycle_protocol: '4 Wochen on, 2 Wochen off', timing_notes: 'Auch topisch als Serum erhältlich', synergies: ['Epitalon', 'Kollagen'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'Epitalon', category: 'longevity', description: 'Telomerase-Aktivator nach Khavinson', mechanism: 'Induziert Telomerase, resettet Zirbeldrüse', impact_score: 7.0, protocol_phase: 3, dosage_research: '5-10 mg/Tag', frequency: 'Täglich für 10-20 Tage', administration_route: 'subcutaneous', cycle_protocol: 'Khavinson: 10mg/Tag für 10 Tage, 2-3x pro Jahr', timing_notes: 'Abends für Melatonin-Synergie', synergies: ['Pinealon', 'Melatonin'], warnings: ['Research-only', 'Nur 2-3x pro Jahr'], legal_status: 'research_only' },
  { name: 'MOTS-c', category: 'longevity', description: 'Exercise Mimetic - mitochondrial kodiertes Peptid', mechanism: 'Aktiviert AMPK, verbessert Glukoseverwertung', impact_score: 7.5, protocol_phase: 2, dosage_research: '5-10 mg 2-3x/Woche', frequency: '2-3x pro Woche', administration_route: 'subcutaneous', cycle_protocol: '8 Wochen on, 4 Wochen off', timing_notes: '30-60 Min vor Zone 2 Cardio', synergies: ['SS-31', 'NMN'], warnings: ['Research-only', 'Teuer'], legal_status: 'research_only' },
  { name: 'SS-31 (Elamipretide)', category: 'longevity', description: 'Mitochondrialer Stabilisator', mechanism: 'Stabilisiert innere Mitochondrienmembran', impact_score: 8.0, protocol_phase: 2, dosage_research: '5 mg 2x/Woche', frequency: '2x pro Woche', administration_route: 'subcutaneous', cycle_protocol: '8 Wochen on, 4 Wochen off', timing_notes: 'Vor Ausdauertraining optimal', synergies: ['MOTS-c', 'CoQ10'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'Semax', category: 'nootropic', description: 'ACTH-Fragment - BDNF-Hochregulation', mechanism: 'Erhöht BDNF massiv, neuroprotektiv', impact_score: 7.5, protocol_phase: 2, dosage_research: '200-600 mcg/Tag nasal', frequency: '1-2x täglich', administration_route: 'nasal', cycle_protocol: '4 Wochen on, 2 Wochen off', timing_notes: '1-2 Tropfen pro Nasenloch morgens', synergies: ['Selank', "Lion's Mane"], warnings: ['In Russland zugelassen, in EU Research Chemical'], legal_status: 'approved_other_countries' },
  { name: 'Selank', category: 'nootropic', description: 'Anxiolytisches Peptid - GABA/Serotonin-Modulation', mechanism: 'Reduziert Cortisol ohne Sedierung', impact_score: 7.5, protocol_phase: 2, dosage_research: '200-400 mcg/Tag nasal', frequency: '1-2x täglich', administration_route: 'nasal', cycle_protocol: '4 Wochen on, 2 Wochen off', timing_notes: 'Morgens und/oder mittags', synergies: ['Semax'], warnings: ['In Russland zugelassen, in EU Research Chemical'], legal_status: 'approved_other_countries' },
  { name: 'Pinealon', category: 'nootropic', description: 'Zirbeldrüsen-Bioregulator', mechanism: 'Reguliert Melatonin-Produktion', impact_score: 6.5, protocol_phase: 3, dosage_research: '5-10 mg oral oder 100+ mcg SubQ', frequency: 'Morgens/Mittags', administration_route: 'oral', cycle_protocol: '10-30 Tage, dann Pause', timing_notes: 'Indirekt schlafunterstützend', synergies: ['Epitalon'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'Ipamorelin', category: 'gh_secretagogue', description: 'GH-Releasing Peptid - sanfter GH-Boost', mechanism: 'Stimuliert GH-Ausschüttung', impact_score: 7.5, protocol_phase: 2, dosage_research: '100-300 mcg 1-3x täglich', frequency: '1-3x täglich', administration_route: 'subcutaneous', cycle_protocol: '8-12 Wochen, dann Pause', timing_notes: 'NÜCHTERN! Mind. 2h nach letzter Mahlzeit', synergies: ['CJC-1295 no DAC'], warnings: ['Research-only', 'Insulin blockiert GH!'], legal_status: 'research_only' },
  { name: 'CJC-1295 no DAC (Mod GRF 1-29)', category: 'gh_secretagogue', description: 'GHRH-Analog - verlängert GH-Puls', mechanism: 'Amplifiziert natürlichen GH-Puls', impact_score: 7.5, protocol_phase: 2, dosage_research: '100-300 mcg 1-3x täglich', frequency: '1-3x täglich', administration_route: 'subcutaneous', cycle_protocol: '8-12 Wochen, dann Pause', timing_notes: 'Zusammen mit Ipamorelin', synergies: ['Ipamorelin'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'Retatrutide', category: 'metabolic', description: 'GLP-1/GIP/Glukagon Triple-Agonist', mechanism: 'Appetitreduktion, Fettmobilisierung', impact_score: 8.5, protocol_phase: 2, dosage_research: '1-12 mg wöchentlich', frequency: '1x pro Woche', administration_route: 'subcutaneous', cycle_protocol: 'Langsam auftitrieren', timing_notes: 'Unabhängig von Mahlzeiten', synergies: ['Elektrolyte', 'TUDCA'], warnings: ['Phase 2 Trials', 'GI-Nebenwirkungen möglich'], legal_status: 'research_only' },
  { name: 'ARA-290', category: 'metabolic', description: 'EPO-Derivat ohne hämatopoetische Wirkung', mechanism: 'Neuroprotektiv, anti-inflammatorisch', impact_score: 6.5, protocol_phase: 3, dosage_research: '4 mg täglich', frequency: 'Täglich (aufgeteilt)', administration_route: 'subcutaneous', cycle_protocol: '20-30 Tage Kur', timing_notes: 'Bei diabetischer Neuropathie', synergies: ['Retatrutide'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'KPV', category: 'immune', description: 'Anti-inflammatorisches Tripeptid', mechanism: 'Hemmt NF-kB, reduziert Entzündung', impact_score: 7.0, protocol_phase: 3, dosage_research: '200-500 mcg täglich', frequency: 'Täglich', administration_route: 'subcutaneous', cycle_protocol: '4-8 Wochen', timing_notes: 'Auch oral bei Darm-Entzündungen', synergies: ['Thymosin Alpha 1'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'Thymosin Alpha 1', category: 'immune', description: 'Thymus-Peptid - Immunmodulation', mechanism: 'Aktiviert T-Zellen, stärkt Immunsystem', impact_score: 7.5, protocol_phase: 3, dosage_research: '1.6 mg', frequency: '2x/Woche (Prävention) oder täglich (akut)', administration_route: 'subcutaneous', cycle_protocol: '4-8 Wochen', timing_notes: 'Standard-Vial 1.6mg', synergies: ['KPV', 'Thymalin'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'Thymalin', category: 'immune', description: 'Thymus-Bioregulator nach Khavinson', mechanism: 'Regeneriert Thymus-Funktion', impact_score: 7.0, protocol_phase: 3, dosage_research: '10 mg täglich', frequency: 'Täglich für 10 Tage', administration_route: 'subcutaneous', cycle_protocol: 'Radikal-Kur: 10 Tage', timing_notes: 'Khavinson-Protokoll', synergies: ['Thymosin Alpha 1', 'Epitalon'], warnings: ['Research-only'], legal_status: 'research_only' },
  { name: 'FOXO4-DRI', category: 'immune', description: 'Senolytisches Peptid', mechanism: 'Induziert Apoptose in seneszenten Zellen', impact_score: 7.0, protocol_phase: 3, dosage_research: '3-5 mg jeden 2. Tag', frequency: 'Jeden 2. Tag für 1 Woche', administration_route: 'subcutaneous', cycle_protocol: 'Pulsatil: 1 Woche, dann lange Pause', timing_notes: 'NICHT dauerhaft!', synergies: ['Fisetin', 'Quercetin'], warnings: ['Research-only', 'Senolytikum - nur pulsatil!'], legal_status: 'research_only' },
  { name: 'IGF-1 LR3', category: 'testo', description: 'Long-Acting Insulin-like Growth Factor', mechanism: 'Stimuliert Proteinsynthese, Muskelwachstum', impact_score: 7.5, protocol_phase: 2, dosage_research: '20-50 mcg täglich', frequency: 'Täglich (Trainingstage)', administration_route: 'subcutaneous', cycle_protocol: '4 Wochen on, 4 Wochen off', timing_notes: 'Post-Workout', synergies: ['Kisspeptin-10'], warnings: ['Research-only', 'Kann Gynäkomastie fördern!'], legal_status: 'research_only' },
  { name: 'Kisspeptin-10', category: 'testo', description: 'Hypothalamus-Peptid - LH/FSH Stimulation', mechanism: 'Stimuliert GnRH, erhöht LH und FSH', impact_score: 6.5, protocol_phase: 2, dosage_research: '100-200 mcg', frequency: 'Abends', administration_route: 'subcutaneous', cycle_protocol: 'Zyklisch', timing_notes: 'Spiked akut LH/FSH', synergies: ['IGF-1 LR3'], warnings: ['Research-only'], legal_status: 'research_only' },
];

// =====================================================
// EMBEDDED DATA: 16 PEPTIDE SUPPLIERS
// =====================================================

// Note: specialization field removed - doesn't exist in DB schema
const SUPPLIERS_DATA = [
  { name: 'BPS Pharma', country: 'DE', website: 'bps-pharma.de', shipping_to_de: true, quality_tier: 'verified', notes: 'Deutscher Shop. BPC-157 Tropfen verfügbar. Spezialisiert auf BPC-157, TB-500, Epitalon, Blends.' },
  { name: 'Beyond Peptides', country: 'EU', website: 'beyond-peptides.com', shipping_to_de: true, quality_tier: 'verified', notes: 'EU-Shop. Sehr gute Nutzererfahrungen. Empfohlen. Spezialisiert auf BPC-157, TB-500, GHK-Cu.' },
  { name: 'Primal Peptides', country: 'EU', website: 'primalpeptides.nl', shipping_to_de: true, quality_tier: 'verified', notes: 'Niederlande. Sehr gute Nutzererfahrungen. Empfohlen. Spezialisiert auf BPC-157, TB-500, Ipamorelin.' },
  { name: 'Peptide Power EU', country: 'EU', website: 'peptidepowereu.com', shipping_to_de: true, quality_tier: 'standard', notes: 'EU-basiert. Pre-filled Pens. Spezialisiert auf GHK-Cu, Ipamorelin, CJC-1295.' },
  { name: 'Verified Peptides', country: 'EU', website: 'verifiedpeptides.eu', shipping_to_de: true, quality_tier: 'standard', notes: 'EU-Shipping. Third-party tested. Spezialisiert auf BPC-157, TB-500, Ipamorelin, Blends.' },
  { name: 'Core Peptides', country: 'EU', website: 'corepeptides.eu', shipping_to_de: true, quality_tier: 'standard', notes: 'EU-Lab. Research only. Spezialisiert auf MOTS-c, BPC-157, TB-500, Ipamorelin.' },
  { name: 'Cell Peptides', country: 'EU', website: 'cellpeptides.com', shipping_to_de: true, quality_tier: 'standard', notes: 'Longevity-Peptide Spezialist. Spezialisiert auf MOTS-c, SS-31.' },
  { name: 'PharmaLabGlobal EU', country: 'EU', website: 'pharmalabglobal.eu', shipping_to_de: true, quality_tier: 'standard', notes: 'Breites Sortiment. EU-Shipping. Spezialisiert auf Epitalon.' },
  { name: 'Biowell Labs', country: 'EU', website: 'biowelllabs.com', shipping_to_de: true, quality_tier: 'unknown', notes: 'EU-Lab. Negative Nutzererfahrungen gemeldet. Vorsicht empfohlen. Spezialisiert auf Retatrutide, GHK-Cu.' },
  { name: 'DN Research', country: 'EU', website: 'dnresearch.eu', shipping_to_de: true, quality_tier: 'standard', notes: 'GMP EU. Pre-filled Pens. Spezialisiert auf Retatrutide, GLP-1.' },
  { name: '24Peptides', country: 'EU', website: '24peptides.com', shipping_to_de: true, quality_tier: 'standard', notes: '99.7%+ Reinheit. Spezialisiert auf Retatrutide.' },
  { name: 'UK-Peptides', country: 'UK', website: 'uk-peptides.com', shipping_to_de: true, quality_tier: 'standard', notes: 'UK-basiert. Günstig. Spezialisiert auf Epitalon, BPC-157.' },
  { name: 'Peptide Regenesis', country: 'UK', website: 'peptideregenesis.co.uk', shipping_to_de: true, quality_tier: 'standard', notes: 'SS-31 Spezialist. Spezialisiert auf Longevity.' },
  { name: 'Peptide Sciences', country: 'US', website: 'peptidesciences.com', shipping_to_de: true, quality_tier: 'standard', notes: 'US-Premium. Third-party HPLC. Zoll-Risiko. Spezialisiert auf MOTS-c, Research-Grade.' },
  { name: 'Biotech Peptides', country: 'US', website: 'biotechpeptides.com', shipping_to_de: true, quality_tier: 'standard', notes: 'USA-made. Zoll-Risiko. Spezialisiert auf Ipamorelin, CJC-1295, GH-Stack.' },
  { name: 'Cosmic Nootropic', country: 'RU', website: 'cosmicnootropic.com', shipping_to_de: true, quality_tier: 'verified', notes: 'Import aus Russland. Semax/Selank dort zugelassen. Spezialisiert auf Semax, Selank, Pinealon, DSIP.' },
  { name: 'Synthagen Labs', country: 'EU', website: 'synthagenlab.com', shipping_to_de: true, quality_tier: 'standard', notes: 'GHK-Cu als orale Kapseln. Spezialisiert auf GHK-Cu.' },
  { name: 'BioLabShop', country: 'EU', website: 'biolabshop.eu', shipping_to_de: true, quality_tier: 'standard', notes: 'Lyophilisierte Vials. Spezialisiert auf GHK-Cu.' },
];

// =====================================================
// EMBEDDED DATA: 8 PEPTIDE STACKS
// =====================================================

// Note: 'id' field removed - DB uses auto-generated UUIDs, we match by name
const STACKS_DATA = [
  { name: 'Clean Gains', goal: 'Kurze, hohe GH-Spikes für Muskelaufbau', category: 'muscle', protocol_phase: 2, peptides: [{ peptide_name: 'Ipamorelin', dosage: '100 mcg', frequency: '1-3x täglich', timing: 'Nüchtern!' }, { peptide_name: 'CJC-1295 no DAC', dosage: '100 mcg', frequency: '1-3x täglich', timing: 'In gleicher Spritze' }], duration_weeks: 8, critical_rules: ['Absolut NÜCHTERN!', '20-30 Min warten vor dem Essen', 'Wichtigster Zeitpunkt: Vor dem Schlafen'], expected_effects: ['Synergistische GH-Ausschüttung', 'Muskelaufbau', 'Fettabbau', 'Anti-Aging'], warning: 'Research-only. Steriles Arbeiten erforderlich.' },
  { name: 'Natural Testo-Boost', goal: 'Maximierung körpereigener Testosteron-Produktion', category: 'testo', protocol_phase: 2, peptides: [{ peptide_name: 'IGF-1 LR3', dosage: '20-50 mcg', frequency: 'Täglich (Trainingstage)', timing: 'Post-Workout' }, { peptide_name: 'Kisspeptin-10', dosage: '100-200 mcg', frequency: 'Abends', timing: 'Spiked akut LH/FSH' }], duration_weeks: 4, critical_rules: ['IGF-1 LR3: 4 Wochen on, 4 Wochen off', 'Östrogen-Management beachten'], expected_effects: ['LH-Stimulation', 'Freies Testosteron ↑', 'Muskelaufbau-Unterstützung'], warning: 'IGF-1 LR3 kann Gynäkomastie fördern!' },
  { name: 'Fettleber-Reset', goal: 'Radikaler viszeraler Fettabbau und Lebergesundheit', category: 'metabolic', protocol_phase: 2, peptides: [{ peptide_name: 'Retatrutide', dosage: 'Start: 2 mg, steigern bis 8-12 mg', frequency: '1x/Woche', timing: 'Unabhängig von Mahlzeiten' }], duration_weeks: 12, critical_rules: ['Langsam auftitrieren!', 'Alle 4 Wochen Dosis steigern', 'TUDCA für Leberschutz'], expected_effects: ['Fett aus Leber mobilisiert', 'Stärkster Gewichtsverlust', 'Insulinsensitivität verbessert'], warning: 'Phase 2 Trials, nicht zugelassen. GI-Nebenwirkungen.' },
  { name: 'Autoimmun-Reset', goal: 'Immunsystem resetten, Autoimmun-Erkrankungen lindern', category: 'immune', protocol_phase: 3, peptides: [{ peptide_name: 'KPV', dosage: '200-500 mcg', frequency: 'Täglich SubQ', timing: 'Oder oral bei Darm (Colitis)' }, { peptide_name: 'Thymosin Alpha 1', dosage: '1.6 mg', frequency: '2x/Woche (Prävention)', timing: 'Standard-Vial' }, { peptide_name: 'FOXO4-DRI', dosage: '3-5 mg', frequency: 'Jeden 2. Tag für 1 Woche', timing: 'Senolytikum, dann lange Pause' }], duration_weeks: 4, critical_rules: ['FOXO4-DRI = pulsatil, nicht dauerhaft!', 'Blutbild vorher/nachher'], expected_effects: ['Systemische Entzündung ↓', 'Thymus-Regeneration', 'Zombie-Zellen eliminiert'], warning: 'Fortgeschrittenes Protokoll. Nur für erfahrene User.' },
  { name: 'Perfekter Schlaf', goal: 'Zirbeldrüse reparieren, Melatonin-Synthese maximieren', category: 'sleep', protocol_phase: 3, peptides: [{ peptide_name: 'Epitalon', dosage: '10 mg/Tag für 10-20 Tage', frequency: 'Alle 6 Monate', timing: 'Khavinson-Protokoll' }, { peptide_name: 'Pinealon', dosage: '5-10 mg oral', frequency: 'Morgens/Mittags', timing: 'Fokus + indirekter Schlaf-Support' }], duration_weeks: 2, critical_rules: ['Epitalon nur 2-3x pro Jahr als Kur', 'DSIP gilt als ineffektiv'], expected_effects: ['Melatonin-Produktion ↑', 'Telomere geschützt', 'Tiefschlaf verbessert'], warning: 'Research-only. Epitalon-Kuren zeitlich begrenzen.' },
  { name: 'Nootropics', goal: 'BDNF-Steigerung, Lernen, Angstlösung', category: 'nootropic', protocol_phase: 2, peptides: [{ peptide_name: 'Semax', dosage: '200-600 mcg nasal', frequency: '2x täglich', timing: 'Morgens + Mittags' }, { peptide_name: 'Selank', dosage: '200-400 mcg nasal', frequency: '2x täglich', timing: 'Anxiolytisch, keine Sedierung' }], duration_weeks: 4, critical_rules: ['4 Wochen on, 2 Wochen off', 'Nicht abends (können wach halten)'], expected_effects: ['BDNF massiv erhöht', 'Fokus und Klarheit', 'Angst reduziert ohne Sedierung'], warning: 'In Russland zugelassen, in EU als Research Chemical.' },
  { name: 'Wolverine (Healing)', goal: 'Maximale Tissue Repair bei Verletzungen', category: 'healing', protocol_phase: 2, peptides: [{ peptide_name: 'BPC-157', dosage: '250-500 mcg', frequency: '1-2x täglich', timing: 'Nahe der Verletzungsstelle' }, { peptide_name: 'TB-500', dosage: '2-5 mg', frequency: '2x pro Woche', timing: 'Systemische Injektion' }], duration_weeks: 6, critical_rules: ['BPC-157 lokal, TB-500 systemisch', 'Können kombiniert werden', 'Loading Phase: Höhere Frequenz erste 2 Wochen'], expected_effects: ['Beschleunigte Wundheilung', 'Sehnen-/Bänder-Regeneration', 'Anti-inflammatorisch'], warning: 'Research-only. Beliebter Stack bei Athleten.' },
  { name: 'Looksmaxxing', goal: 'Skin Anti-Aging, Kollagen, Mitochondrien', category: 'longevity', protocol_phase: 3, peptides: [{ peptide_name: 'GHK-Cu', dosage: '1-2 mg', frequency: 'Täglich oder zyklisch', timing: 'SubQ oder topisch' }, { peptide_name: 'Epitalon', dosage: '5-10 mg', frequency: '10-20 Tage Kur', timing: 'Abends' }, { peptide_name: 'MOTS-c', dosage: '5-10 mg', frequency: '2-3x pro Woche', timing: 'Vor Training' }, { peptide_name: 'SS-31', dosage: '5 mg', frequency: '2x pro Woche', timing: 'Mitochondrien-Repair' }], duration_weeks: 8, critical_rules: ['GHK-Cu auch als Serum topisch nutzbar', 'Kollagen + Vitamin C supplementieren'], expected_effects: ['Kollagen-Synthese ↑', 'Haut-Elastizität verbessert', 'Mitochondrien regeneriert'], warning: 'Teures Protokoll. Research-only.' },
];

// =====================================================
// SEED FUNCTIONS
// =====================================================

interface SeedResult {
  added: number;
  updated: number;
  errors: string[];
}

type SupabaseClient = ReturnType<typeof createClient>;

async function seedBrands(supabase: SupabaseClient): Promise<SeedResult> {
  const result: SeedResult = { added: 0, updated: 0, errors: [] };
  
  for (const brand of BRANDS_DATA) {
    try {
      const { data: existing } = await supabase
        .from("supplement_brands")
        .select("id")
        .eq("slug", brand.slug)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("supplement_brands").update(brand).eq("id", existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("supplement_brands").insert(brand);
        if (error) throw error;
        result.added++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(`${brand.name}: ${errorMessage}`);
    }
  }
  
  return result;
}

async function seedSupplements(supabase: SupabaseClient): Promise<SeedResult> {
  const result: SeedResult = { added: 0, updated: 0, errors: [] };
  
  for (const supplement of SUPPLEMENTS_DATA) {
    try {
      const { data: existing } = await supabase
        .from("supplement_database")
        .select("id")
        .eq("name", supplement.name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("supplement_database").update(supplement).eq("id", existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("supplement_database").insert(supplement);
        if (error) throw error;
        result.added++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(`${supplement.name}: ${errorMessage}`);
    }
  }
  
  return result;
}

async function seedProducts(supabase: SupabaseClient): Promise<SeedResult> {
  const result: SeedResult = { added: 0, updated: 0, errors: [] };
  
  // First, get all brands and supplements for reference resolution
  const { data: brands } = await supabase.from("supplement_brands").select("id, slug");
  const { data: supplements } = await supabase.from("supplement_database").select("id, name");
  
  const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
  const supplementMap = new Map(supplements?.map(s => [s.name.toLowerCase(), s.id]) || []);
  
  for (const product of PRODUCTS_DATA) {
    try {
      const brand_id = brandMap.get(product.brand_slug) ?? undefined;
      
      // Try to find supplement by matching name
      let supplement_id: string | undefined;
      for (const [name, id] of supplementMap) {
        if (product.supplement_name.toLowerCase().includes(name) || name.includes(product.supplement_name.toLowerCase())) {
          supplement_id = id;
          break;
        }
      }
      
      const productData = {
        brand_id,
        supplement_id,
        product_name: product.product_name,
        pack_size: product.pack_size,
        pack_unit: product.pack_unit,
        servings_per_pack: product.servings_per_pack,
        dose_per_serving: product.dose_per_serving,
        dose_unit: product.dose_unit,
        price_eur: product.price_eur,
        price_per_serving: product.price_per_serving,
        form: product.form,
        is_vegan: product.is_vegan,
        is_recommended: product.is_recommended,
      };

      // Check if product exists by name
      const { data: existing } = await supabase
        .from("supplement_products")
        .select("id")
        .eq("product_name", product.product_name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("supplement_products").update(productData).eq("id", existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("supplement_products").insert(productData);
        if (error) throw error;
        result.added++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(`${product.product_name}: ${errorMessage}`);
    }
  }
  
  return result;
}

async function seedPeptides(supabase: SupabaseClient): Promise<SeedResult> {
  const result: SeedResult = { added: 0, updated: 0, errors: [] };
  
  for (const peptide of PEPTIDES_DATA) {
    try {
      const { data: existing } = await supabase
        .from("peptide_compounds")
        .select("id")
        .eq("name", peptide.name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("peptide_compounds").update(peptide).eq("id", existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("peptide_compounds").insert(peptide);
        if (error) throw error;
        result.added++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(`${peptide.name}: ${errorMessage}`);
    }
  }
  
  return result;
}

async function seedSuppliers(supabase: SupabaseClient): Promise<SeedResult> {
  const result: SeedResult = { added: 0, updated: 0, errors: [] };
  
  for (const supplier of SUPPLIERS_DATA) {
    try {
      const { data: existing } = await supabase
        .from("peptide_suppliers")
        .select("id")
        .eq("name", supplier.name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("peptide_suppliers").update(supplier).eq("id", existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("peptide_suppliers").insert(supplier);
        if (error) throw error;
        result.added++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(`${supplier.name}: ${errorMessage}`);
    }
  }
  
  return result;
}

async function seedStacks(supabase: SupabaseClient): Promise<SeedResult> {
  const result: SeedResult = { added: 0, updated: 0, errors: [] };
  
  for (const stack of STACKS_DATA) {
    try {
      const { data: existing } = await supabase
        .from("peptide_stacks")
        .select("id")
        .eq("name", stack.name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("peptide_stacks").update(stack).eq("id", existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from("peptide_stacks").insert(stack);
        if (error) throw error;
        result.added++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errors.push(`${stack.name}: ${errorMessage}`);
    }
  }
  
  return result;
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let action = "all";
    
    // Handle both old format (catalog array) and new format (action string)
    try {
      const body = await req.json();
      if (body.action) {
        action = body.action;
      } else if (body.catalog && Array.isArray(body.catalog)) {
        // Legacy format - just seed supplements from catalog
        action = "supplements_legacy";
      }
    } catch {
      // No body or invalid JSON - use default action
    }

    console.log(`Starting seed with action: ${action}`);

    const results: Record<string, SeedResult> = {
      brands: { added: 0, updated: 0, errors: [] },
      supplements: { added: 0, updated: 0, errors: [] },
      products: { added: 0, updated: 0, errors: [] },
      peptides: { added: 0, updated: 0, errors: [] },
      suppliers: { added: 0, updated: 0, errors: [] },
      stacks: { added: 0, updated: 0, errors: [] },
    };

    // Order matters for reference resolution!
    if (action === "all" || action === "brands") {
      console.log("Seeding brands...");
      results.brands = await seedBrands(supabase);
    }
    
    if (action === "all" || action === "supplements") {
      console.log("Seeding supplements...");
      results.supplements = await seedSupplements(supabase);
    }
    
    if (action === "all" || action === "products") {
      console.log("Seeding products...");
      results.products = await seedProducts(supabase);
    }
    
    if (action === "all" || action === "peptides") {
      console.log("Seeding peptides...");
      results.peptides = await seedPeptides(supabase);
    }
    
    if (action === "all" || action === "suppliers") {
      console.log("Seeding suppliers...");
      results.suppliers = await seedSuppliers(supabase);
    }
    
    if (action === "all" || action === "stacks") {
      console.log("Seeding stacks...");
      results.stacks = await seedStacks(supabase);
    }

    // Calculate totals
    const totals = {
      added: Object.values(results).reduce((sum, r) => sum + r.added, 0),
      updated: Object.values(results).reduce((sum, r) => sum + r.updated, 0),
      errors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
    };

    console.log(`Seed completed: ${totals.added} added, ${totals.updated} updated, ${totals.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        results,
        totals,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Seed error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
