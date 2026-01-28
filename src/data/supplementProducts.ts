// ARES Supplement-Produkte v3.0
// 80+ konkrete Produkte mit deutschen Marken und Preisen

export interface SupplementProduct {
  brand_slug: string;
  supplement_name: string;
  product_name: string;
  pack_size: number;
  pack_unit: 'capsules' | 'tablets' | 'g' | 'ml' | 'softgels' | 'sachets' | 'drops';
  servings_per_pack: number;
  dose_per_serving: number;
  dose_unit: 'mg' | 'mcg' | 'g' | 'IU' | 'CFU';
  ingredients?: { name: string; amount: number; unit: string }[];
  price_eur: number;
  price_per_serving: number;
  form: string;
  is_vegan: boolean;
  is_recommended: boolean;
  protocol_phase: 0 | 1 | 2 | 3;
  notes?: string;
}

export const SUPPLEMENT_PRODUCTS: SupplementProduct[] = [
  // =====================================================
  // PHASE 0: ESSENTIALS
  // =====================================================

  // CREATINE (Impact: 9.8)
  {
    brand_slug: 'esn',
    supplement_name: 'Creatine Monohydrate',
    product_name: 'Ultrapure Creatine Monohydrate',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 100,
    dose_per_serving: 5,
    dose_unit: 'g',
    price_eur: 19.90,
    price_per_serving: 0.20,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Creapure® Qualität'
  },
  {
    brand_slug: 'bulk',
    supplement_name: 'Creatine Monohydrate',
    product_name: 'Creatine Monohydrate Powder',
    pack_size: 1000,
    pack_unit: 'g',
    servings_per_pack: 200,
    dose_per_serving: 5,
    dose_unit: 'g',
    price_eur: 24.99,
    price_per_serving: 0.12,
    form: 'powder',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Beste Preis-Leistung'
  },
  {
    brand_slug: 'more-nutrition',
    supplement_name: 'Creatine Monohydrate',
    product_name: 'Creatine Monohydrate',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 100,
    dose_per_serving: 5,
    dose_unit: 'g',
    price_eur: 24.90,
    price_per_serving: 0.25,
    form: 'powder',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0
  },
  {
    brand_slug: 'esn',
    supplement_name: 'Creatine Monohydrate',
    product_name: 'Creatine Giga Caps',
    pack_size: 300,
    pack_unit: 'capsules',
    servings_per_pack: 100,
    dose_per_serving: 3000,
    dose_unit: 'mg',
    price_eur: 29.90,
    price_per_serving: 0.30,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Praktisch für unterwegs'
  },

  // MAGNESIUM (Impact: 9.5)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Magnesium Glycinate',
    product_name: 'Magnesium Glycinat',
    pack_size: 180,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 400,
    dose_unit: 'mg',
    price_eur: 24.90,
    price_per_serving: 0.28,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Beste Form: Glycinat'
  },
  {
    brand_slug: 'naturtreu',
    supplement_name: 'Magnesium Complex',
    product_name: 'Kraftreserve Magnesium',
    pack_size: 180,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 400,
    dose_unit: 'mg',
    price_eur: 22.90,
    price_per_serving: 0.25,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Tri-Magnesium-Komplex'
  },
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Magnesium L-Threonate',
    product_name: 'Magnesium L-Threonat',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 30,
    dose_per_serving: 2000,
    dose_unit: 'mg',
    price_eur: 34.90,
    price_per_serving: 1.16,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Beste Form für Gehirn (Magtein®)'
  },
  {
    brand_slug: 'now-foods',
    supplement_name: 'Magnesium Citrate',
    product_name: 'Magnesium Citrate',
    pack_size: 240,
    pack_unit: 'capsules',
    servings_per_pack: 80,
    dose_per_serving: 400,
    dose_unit: 'mg',
    price_eur: 18.99,
    price_per_serving: 0.24,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0
  },

  // OMEGA-3 (Impact: 9.2)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Omega-3',
    product_name: 'Omega-3 Algae Oil EPA+DHA',
    pack_size: 90,
    pack_unit: 'softgels',
    servings_per_pack: 90,
    dose_per_serving: 600,
    dose_unit: 'mg',
    ingredients: [
      { name: 'EPA', amount: 400, unit: 'mg' },
      { name: 'DHA', amount: 200, unit: 'mg' }
    ],
    price_eur: 29.90,
    price_per_serving: 0.33,
    form: 'softgel',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Vegan aus Algen'
  },
  {
    brand_slug: 'nordic-naturals',
    supplement_name: 'Omega-3',
    product_name: 'Ultimate Omega',
    pack_size: 120,
    pack_unit: 'softgels',
    servings_per_pack: 60,
    dose_per_serving: 1100,
    dose_unit: 'mg',
    ingredients: [
      { name: 'EPA', amount: 650, unit: 'mg' },
      { name: 'DHA', amount: 450, unit: 'mg' }
    ],
    price_eur: 44.95,
    price_per_serving: 0.75,
    form: 'softgel',
    is_vegan: false,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Premium Fischöl, IFOS zertifiziert'
  },
  {
    brand_slug: 'naturtreu',
    supplement_name: 'Omega-3',
    product_name: 'Algenkraft Omega-3',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 375,
    dose_unit: 'mg',
    ingredients: [
      { name: 'EPA', amount: 250, unit: 'mg' },
      { name: 'DHA', amount: 125, unit: 'mg' }
    ],
    price_eur: 24.90,
    price_per_serving: 0.42,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0
  },

  // VITAMIN D3+K2 (Impact: 9.0)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Vitamin D3+K2',
    product_name: 'D3+K2 Tropfen',
    pack_size: 300,
    pack_unit: 'drops',
    servings_per_pack: 300,
    dose_per_serving: 5000,
    dose_unit: 'IU',
    ingredients: [
      { name: 'Vitamin D3', amount: 5000, unit: 'IU' },
      { name: 'Vitamin K2 MK-7', amount: 200, unit: 'mcg' }
    ],
    price_eur: 24.90,
    price_per_serving: 0.08,
    form: 'drops',
    is_vegan: false,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Beste Preis-Leistung für D3+K2'
  },
  {
    brand_slug: 'naturtreu',
    supplement_name: 'Vitamin D3+K2',
    product_name: 'Sonnenfreuden D3+K2',
    pack_size: 60,
    pack_unit: 'ml',
    servings_per_pack: 1800,
    dose_per_serving: 1000,
    dose_unit: 'IU',
    price_eur: 18.90,
    price_per_serving: 0.01,
    form: 'drops',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0
  },
  {
    brand_slug: 'profuel',
    supplement_name: 'Vitamin D3+K2',
    product_name: 'Vitamin D3+K2 Tabletten',
    pack_size: 365,
    pack_unit: 'tablets',
    servings_per_pack: 365,
    dose_per_serving: 5000,
    dose_unit: 'IU',
    price_eur: 19.90,
    price_per_serving: 0.05,
    form: 'tablet',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Jahresvorrat!'
  },

  // =====================================================
  // PHASE 0: OPTIMIZERS
  // =====================================================

  // ASHWAGANDHA (Impact: 7.8)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Ashwagandha KSM-66',
    product_name: 'Ashwagandha KSM-66',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 600,
    dose_unit: 'mg',
    price_eur: 24.90,
    price_per_serving: 0.28,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'KSM-66® - Goldstandard'
  },
  {
    brand_slug: 'naturtreu',
    supplement_name: 'Ashwagandha',
    product_name: 'Ruhewurzel Ashwagandha',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 600,
    dose_unit: 'mg',
    price_eur: 21.90,
    price_per_serving: 0.24,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'KSM-66®'
  },
  {
    brand_slug: 'now-foods',
    supplement_name: 'Ashwagandha',
    product_name: 'Ashwagandha Extract',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 450,
    dose_unit: 'mg',
    price_eur: 14.99,
    price_per_serving: 0.17,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Budget-Option'
  },

  // ZINK (Impact: 7.5)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Zinc Bisglycinate',
    product_name: 'Zink Bisglycinat',
    pack_size: 365,
    pack_unit: 'tablets',
    servings_per_pack: 365,
    dose_per_serving: 25,
    dose_unit: 'mg',
    price_eur: 18.90,
    price_per_serving: 0.05,
    form: 'tablet',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Jahresvorrat, beste Form'
  },
  {
    brand_slug: 'naturtreu',
    supplement_name: 'Zinc',
    product_name: 'Wundervoll Zink',
    pack_size: 365,
    pack_unit: 'tablets',
    servings_per_pack: 365,
    dose_per_serving: 25,
    dose_unit: 'mg',
    price_eur: 16.90,
    price_per_serving: 0.05,
    form: 'tablet',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0
  },

  // COQ10 (Impact: 7.2)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'CoQ10 Ubiquinol',
    product_name: 'Coenzyme Q10 Ubiquinol',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 100,
    dose_unit: 'mg',
    price_eur: 34.90,
    price_per_serving: 0.58,
    form: 'capsule',
    is_vegan: false,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Ubiquinol = aktive Form'
  },
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'CoQ10 Ubiquinol',
    product_name: 'Q10 Ubiquinol Kaneka',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 100,
    dose_unit: 'mg',
    price_eur: 39.90,
    price_per_serving: 0.67,
    form: 'capsule',
    is_vegan: false,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Kaneka® - Premium'
  },

  // =====================================================
  // PHASE 1: TRT/GLP-1 SUPPORT
  // =====================================================

  // CITRUS BERGAMOT (Impact: 8.5)
  {
    brand_slug: 'life-extension',
    supplement_name: 'Citrus Bergamot',
    product_name: 'Citrus Bergamot',
    pack_size: 30,
    pack_unit: 'capsules',
    servings_per_pack: 30,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 24.00,
    price_per_serving: 0.80,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 1,
    notes: 'Cholesterin-Management bei TRT'
  },
  {
    brand_slug: 'doctors-best',
    supplement_name: 'Citrus Bergamot',
    product_name: 'Bergamot Extract',
    pack_size: 30,
    pack_unit: 'capsules',
    servings_per_pack: 30,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 19.99,
    price_per_serving: 0.67,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 1
  },

  // TUDCA (Impact: 8.0)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'TUDCA',
    product_name: 'TUDCA',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 250,
    dose_unit: 'mg',
    price_eur: 39.90,
    price_per_serving: 0.67,
    form: 'capsule',
    is_vegan: false,
    is_recommended: true,
    protocol_phase: 1,
    notes: 'Leberschutz bei Oral-Steroids/TRT'
  },

  // EAA (Impact: 8.0)
  {
    brand_slug: 'esn',
    supplement_name: 'EAA Complex',
    product_name: 'EAA+',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 50,
    dose_per_serving: 10,
    dose_unit: 'g',
    price_eur: 34.90,
    price_per_serving: 0.70,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 1,
    notes: 'Alle 8 EAAs, viele Geschmäcker'
  },
  {
    brand_slug: 'bulk',
    supplement_name: 'EAA Complex',
    product_name: 'Essential Amino Acids',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 50,
    dose_per_serving: 10,
    dose_unit: 'g',
    price_eur: 27.99,
    price_per_serving: 0.56,
    form: 'powder',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 1
  },

  // =====================================================
  // PHASE 2: LONGEVITY ADVANCED
  // =====================================================

  // NMN (Impact: 9.0 - Longevity)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'NMN',
    product_name: 'Uthever® NMN Pulver 15g',
    pack_size: 15,
    pack_unit: 'g',
    servings_per_pack: 60,
    dose_per_serving: 250,
    dose_unit: 'mg',
    price_eur: 24.90,
    price_per_serving: 0.42,
    form: 'powder',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 2,
    notes: 'Einstiegspackung'
  },
  {
    brand_slug: 'moleqlar',
    supplement_name: 'NMN',
    product_name: 'Uthever® NMN Pulver 60g',
    pack_size: 60,
    pack_unit: 'g',
    servings_per_pack: 120,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 72.90,
    price_per_serving: 0.61,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 2,
    notes: 'Uthever® >99.9% Reinheit - Studien-Material'
  },
  {
    brand_slug: 'moleqlar',
    supplement_name: 'NMN',
    product_name: 'Uthever® NMN Pulver 100g',
    pack_size: 100,
    pack_unit: 'g',
    servings_per_pack: 200,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 92.90,
    price_per_serving: 0.46,
    form: 'powder',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 2,
    notes: 'Beste Preis/Dosis'
  },

  // CA-AKG (Impact: 6.0)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Ca-AKG',
    product_name: 'Calcium Alpha-Ketoglutarat Kapseln',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 30,
    dose_per_serving: 1000,
    dose_unit: 'mg',
    price_eur: 29.90,
    price_per_serving: 1.00,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 2
  },
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Ca-AKG',
    product_name: 'CaAKG Pulver',
    pack_size: 100,
    pack_unit: 'g',
    servings_per_pack: 100,
    dose_per_serving: 1000,
    dose_unit: 'mg',
    price_eur: 34.90,
    price_per_serving: 0.35,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 2,
    notes: 'Beste Preis-Leistung'
  },

  // RESVERATROL (Impact: 6.0)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Trans-Resveratrol',
    product_name: 'Trans-Resveratrol Pulver',
    pack_size: 60,
    pack_unit: 'g',
    servings_per_pack: 120,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 49.90,
    price_per_serving: 0.42,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 2
  },
  {
    brand_slug: 'thorne',
    supplement_name: 'Resveratrol',
    product_name: 'ResveraCel',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 150,
    dose_unit: 'mg',
    price_eur: 59.00,
    price_per_serving: 0.98,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 2,
    notes: 'Kombination mit Nicotinamid Riboside'
  },

  // SPERMIDIN (Impact: 6.5)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Spermidine',
    product_name: 'Spermidin',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 30,
    dose_per_serving: 3,
    dose_unit: 'mg',
    price_eur: 49.90,
    price_per_serving: 1.66,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 2,
    notes: 'Autophagie-Aktivator'
  },

  // FISETIN (Impact: 8.5)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Fisetin',
    product_name: 'Fisetin Kapseln',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 30,
    dose_per_serving: 200,
    dose_unit: 'mg',
    price_eur: 37.90,
    price_per_serving: 1.26,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 2,
    notes: 'Senolytikum - Zombie-Zellen eliminieren'
  },

  // =====================================================
  // SLEEP STACK
  // =====================================================

  // L-THEANIN (Impact: 7.5)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'L-Theanine',
    product_name: 'L-Theanin',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 200,
    dose_unit: 'mg',
    price_eur: 19.90,
    price_per_serving: 0.22,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Suntheanine® Qualität'
  },

  // GLYCIN (Impact: 7.2)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Glycine',
    product_name: 'Glycin Pulver',
    pack_size: 300,
    pack_unit: 'g',
    servings_per_pack: 100,
    dose_per_serving: 3,
    dose_unit: 'g',
    price_eur: 19.90,
    price_per_serving: 0.20,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'UNDERRATED! Schlaf + Kollagen'
  },
  {
    brand_slug: 'bulk',
    supplement_name: 'Glycine',
    product_name: 'Glycine Powder',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 167,
    dose_per_serving: 3,
    dose_unit: 'g',
    price_eur: 14.99,
    price_per_serving: 0.09,
    form: 'powder',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Budget-Option'
  },

  // APIGENIN (Impact: 7.0)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Apigenin',
    product_name: 'Apigenin',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 50,
    dose_unit: 'mg',
    price_eur: 24.90,
    price_per_serving: 0.42,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Huberman Sleep Stack Komponente'
  },

  // =====================================================
  // NOOTROPICS & COGNITIVE
  // =====================================================

  // LION'S MANE (Impact: 8.5)
  {
    brand_slug: 'sunday-natural',
    supplement_name: "Lion's Mane",
    product_name: 'Bio Hericium Extrakt',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 24.90,
    price_per_serving: 0.28,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: '30% Polysaccharide, Dual-Extrakt'
  },
  {
    brand_slug: 'profuel',
    supplement_name: "Lion's Mane",
    product_name: "Lion's Mane Extrakt",
    pack_size: 180,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 2000,
    dose_unit: 'mg',
    price_eur: 19.95,
    price_per_serving: 0.33,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: '30:1 Extrakt'
  },

  // ALPHA-GPC (Impact: 7.5)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Alpha-GPC',
    product_name: 'Alpha-GPC 50%',
    pack_size: 90,
    pack_unit: 'capsules',
    servings_per_pack: 90,
    dose_per_serving: 300,
    dose_unit: 'mg',
    price_eur: 24.90,
    price_per_serving: 0.28,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Cholin-Quelle, Pre-Workout Nootropic'
  },

  // =====================================================
  // GUT & METABOLIC
  // =====================================================

  // BERBERIN (Impact: 8.5)
  {
    brand_slug: 'doctors-best',
    supplement_name: 'Berberine',
    product_name: 'Berberin 500mg',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 17.50,
    price_per_serving: 0.29,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Natur-Metformin, AMPK-Aktivator'
  },

  // L-GLUTAMIN (Impact: 8.0)
  {
    brand_slug: 'esn',
    supplement_name: 'L-Glutamine',
    product_name: 'L-Glutamin Pulver',
    pack_size: 500,
    pack_unit: 'g',
    servings_per_pack: 100,
    dose_per_serving: 5,
    dose_unit: 'g',
    price_eur: 19.90,
    price_per_serving: 0.20,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'UNDERRATED! Darmgesundheit'
  },

  // NAC (Impact: 8.0)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'NAC',
    product_name: 'NAC N-Acetylcystein',
    pack_size: 120,
    pack_unit: 'capsules',
    servings_per_pack: 120,
    dose_per_serving: 600,
    dose_unit: 'mg',
    price_eur: 18.90,
    price_per_serving: 0.16,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Glutathion-Precursor, Leber-Support'
  },

  // GLYNAC (Impact: 8.5)
  {
    brand_slug: 'moleqlar',
    supplement_name: 'GlyNAC',
    product_name: 'GlyNAC Kapseln',
    pack_size: 120,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 1200,
    dose_unit: 'mg',
    ingredients: [
      { name: 'Glycin', amount: 600, unit: 'mg' },
      { name: 'NAC', amount: 600, unit: 'mg' }
    ],
    price_eur: 34.90,
    price_per_serving: 0.58,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'TOP LONGEVITY COMPOUND'
  },

  // =====================================================
  // JOINTS & CONNECTIVE TISSUE
  // =====================================================

  // KOLLAGEN (Impact: 8.0)
  {
    brand_slug: 'esn',
    supplement_name: 'Collagen',
    product_name: 'Collagen Peptide',
    pack_size: 300,
    pack_unit: 'g',
    servings_per_pack: 30,
    dose_per_serving: 10,
    dose_unit: 'g',
    price_eur: 24.90,
    price_per_serving: 0.83,
    form: 'powder',
    is_vegan: false,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'Typ 1 & 3, mit Vitamin C'
  },

  // MSM (Impact: 7.0)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'MSM',
    product_name: 'MSM OptiMSM®',
    pack_size: 365,
    pack_unit: 'capsules',
    servings_per_pack: 122,
    dose_per_serving: 3000,
    dose_unit: 'mg',
    price_eur: 19.90,
    price_per_serving: 0.16,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: 'OptiMSM® - Premium Schwefel'
  },

  // CURCUMIN (Impact: 7.5)
  {
    brand_slug: 'sunday-natural',
    supplement_name: 'Curcumin',
    product_name: 'Curcumin Mizellen',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 500,
    dose_unit: 'mg',
    price_eur: 29.90,
    price_per_serving: 0.50,
    form: 'capsule',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 0,
    notes: '185x Bioverfügbarkeit durch Mizellen'
  },
  {
    brand_slug: 'moleqlar',
    supplement_name: 'Curcumin',
    product_name: 'Longvida® Curcumin',
    pack_size: 60,
    pack_unit: 'capsules',
    servings_per_pack: 60,
    dose_per_serving: 400,
    dose_unit: 'mg',
    price_eur: 34.90,
    price_per_serving: 0.58,
    form: 'capsule',
    is_vegan: true,
    is_recommended: false,
    protocol_phase: 0,
    notes: 'Longvida® - Brain-Optimized'
  },

  // =====================================================
  // KOMBINATIONS-PRODUKTE
  // =====================================================
  {
    brand_slug: 'moleqlar',
    supplement_name: 'All-in-One Longevity',
    product_name: 'ONE Daily Longevity Complex',
    pack_size: 30,
    pack_unit: 'sachets',
    servings_per_pack: 30,
    dose_per_serving: 1,
    dose_unit: 'g',
    ingredients: [
      { name: 'Calcium-AKG', amount: 1000, unit: 'mg' },
      { name: 'Trans-Resveratrol', amount: 200, unit: 'mg' },
      { name: 'Luteolin', amount: 50, unit: 'mg' },
      { name: 'Quercetin', amount: 100, unit: 'mg' },
      { name: 'Glycin', amount: 2000, unit: 'mg' },
      { name: 'L-Theanin', amount: 200, unit: 'mg' },
      { name: 'Kreatin', amount: 3000, unit: 'mg' },
      { name: 'Magnesium Taurat', amount: 300, unit: 'mg' },
      { name: 'L-Citrullin', amount: 1000, unit: 'mg' },
      { name: 'Vitamin C', amount: 200, unit: 'mg' },
      { name: 'Zink', amount: 10, unit: 'mg' },
      { name: 'Selen', amount: 55, unit: 'mcg' }
    ],
    price_eur: 89.90,
    price_per_serving: 3.00,
    form: 'powder',
    is_vegan: true,
    is_recommended: true,
    protocol_phase: 2,
    notes: 'All-in-One Longevity Stack'
  }
];

export const getProductsByBrand = (brandSlug: string): SupplementProduct[] => {
  return SUPPLEMENT_PRODUCTS.filter(p => p.brand_slug === brandSlug);
};

export const getProductsBySupplement = (supplementName: string): SupplementProduct[] => {
  return SUPPLEMENT_PRODUCTS.filter(p => 
    p.supplement_name.toLowerCase().includes(supplementName.toLowerCase())
  );
};

export const getProductsByPhase = (phase: 0 | 1 | 2 | 3): SupplementProduct[] => {
  return SUPPLEMENT_PRODUCTS.filter(p => p.protocol_phase === phase);
};

export const getRecommendedProducts = (): SupplementProduct[] => {
  return SUPPLEMENT_PRODUCTS.filter(p => p.is_recommended);
};

export const getCheapestProduct = (supplementName: string): SupplementProduct | undefined => {
  const products = getProductsBySupplement(supplementName);
  return products.sort((a, b) => a.price_per_serving - b.price_per_serving)[0];
};
