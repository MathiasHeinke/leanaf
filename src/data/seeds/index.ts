// ARES Complete Supplement Seed Index v3.5
// Kombiniert alle Seed-Dateien: ~520+ Produkte
// Budget, Premium, Sport, Pharmacy Kategorien

import { ProductSeed } from '../supplementProductsSeed';
import { ALL_BUDGET_PRODUCTS, BUDGET_SEED_STATS } from './budgetBrandsSeed';
import { ALL_PREMIUM_PRODUCTS, PREMIUM_SEED_STATS } from './premiumBrandsSeed';
import { ALL_SPORT_PRODUCTS, SPORT_SEED_STATS } from './sportBrandsSeed';
import { ALL_PHARMACY_PRODUCTS, PHARMACY_SEED_STATS } from './pharmacyBrandsSeed';

// Re-export für direkten Zugriff
export * from './budgetBrandsSeed';
export * from './premiumBrandsSeed';
export * from './sportBrandsSeed';
export * from './pharmacyBrandsSeed';

// ============================================
// COMPLETE COMBINED SEED DATA
// ============================================

export const COMPLETE_PRODUCT_SEED: ProductSeed[] = [
  ...ALL_BUDGET_PRODUCTS,
  ...ALL_PREMIUM_PRODUCTS,
  ...ALL_SPORT_PRODUCTS,
  ...ALL_PHARMACY_PRODUCTS,
];

// ============================================
// STATS
// ============================================

export const COMPLETE_SEED_STATS = {
  total_products: COMPLETE_PRODUCT_SEED.length,
  
  // By category
  budget_brands: BUDGET_SEED_STATS.total_products,
  premium_brands: PREMIUM_SEED_STATS.total_products,
  sport_brands: SPORT_SEED_STATS.total_products,
  pharmacy_brands: PHARMACY_SEED_STATS.total_products,
  
  // By individual brand
  brands: {
    // Budget
    nature_love: BUDGET_SEED_STATS.nature_love,
    naturtreu: BUDGET_SEED_STATS.naturtreu,
    now_foods: BUDGET_SEED_STATS.now_foods,
    doctors_best: BUDGET_SEED_STATS.doctors_best,
    
    // Premium
    moleqlar: PREMIUM_SEED_STATS.moleqlar,
    sunday_natural: PREMIUM_SEED_STATS.sunday_natural,
    life_extension: PREMIUM_SEED_STATS.life_extension,
    thorne: PREMIUM_SEED_STATS.thorne,
    
    // Sport
    esn: SPORT_SEED_STATS.esn,
    more_nutrition: SPORT_SEED_STATS.more_nutrition,
    bulk: SPORT_SEED_STATS.bulk,
    profuel: SPORT_SEED_STATS.profuel,
    
    // Pharmacy
    biogena: PHARMACY_SEED_STATS.biogena,
    orthomol: PHARMACY_SEED_STATS.orthomol,
    doppelherz: PHARMACY_SEED_STATS.doppelherz,
  },
  
  // By attributes
  recommended_count: COMPLETE_PRODUCT_SEED.filter(p => p.is_recommended).length,
  vegan_count: COMPLETE_PRODUCT_SEED.filter(p => p.is_vegan).length,
  
  // By protocol phase
  phase_0_count: COMPLETE_PRODUCT_SEED.filter(p => p.protocol_phase === 0).length,
  phase_1_count: COMPLETE_PRODUCT_SEED.filter(p => p.protocol_phase === 1).length,
  phase_2_count: COMPLETE_PRODUCT_SEED.filter(p => p.protocol_phase === 2).length,
  
  // Average price per serving
  avg_price_per_serving: Number(
    (COMPLETE_PRODUCT_SEED.reduce((sum, p) => sum + p.price_per_serving, 0) / 
     COMPLETE_PRODUCT_SEED.length).toFixed(2)
  ),
};

// Helper functions
export const getProductsByBrand = (brandSlug: string): ProductSeed[] => {
  return COMPLETE_PRODUCT_SEED.filter(p => p.brand_slug === brandSlug);
};

export const getProductsBySupplement = (supplementName: string): ProductSeed[] => {
  return COMPLETE_PRODUCT_SEED.filter(p => 
    p.supplement_name.toLowerCase().includes(supplementName.toLowerCase())
  );
};

export const getRecommendedProducts = (): ProductSeed[] => {
  return COMPLETE_PRODUCT_SEED.filter(p => p.is_recommended);
};

export const getVeganProducts = (): ProductSeed[] => {
  return COMPLETE_PRODUCT_SEED.filter(p => p.is_vegan);
};

export const getProductsByPhase = (phase: 0 | 1 | 2): ProductSeed[] => {
  return COMPLETE_PRODUCT_SEED.filter(p => p.protocol_phase === phase);
};

export const getBudgetProducts = (maxPricePerServing: number = 0.30): ProductSeed[] => {
  return COMPLETE_PRODUCT_SEED.filter(p => p.price_per_serving <= maxPricePerServing);
};
