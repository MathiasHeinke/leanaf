// ARES Supplement-Wirkstoff Seed-Datenbank v3.4
// Fehlende Wirkstoffe für supplement_database Tabelle
// ~60 neue Substanzen aus ARES v3.4 Markdown

export interface SupplementSeed {
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  impact_score?: number;
  necessity_tier?: 'essential' | 'optimizer' | 'advanced' | 'experimental';
  evidence_level?: 'strong' | 'moderate' | 'emerging' | 'anecdotal';
  default_dose?: number;
  default_unit?: string;
  timing_recommendation?: string;
  synergies?: string[];
  warnings?: string[];
  is_vegan?: boolean;
  form_quality_notes?: string;
}

// ============================================
// PHASE 0: ESSENTIALS (fehlende)
// ============================================

export const ESSENTIALS_SEED: SupplementSeed[] = [
  {
    name: 'Kreatin Monohydrat',
    category: 'sport',
    subcategory: 'performance',
    description: 'Effektivstes Sport-Supplement für Kraft und kognitive Funktion',
    impact_score: 9.8,
    necessity_tier: 'essential',
    evidence_level: 'strong',
    default_dose: 5,
    default_unit: 'g',
    timing_recommendation: 'Täglich, Timing egal',
    synergies: ['Kohlenhydrate'],
    is_vegan: true,
    form_quality_notes: 'Monohydrat = Gold-Standard. Creapure® ist Premium.',
  },
  {
    name: 'Vitamin B-Komplex',
    category: 'vitamins',
    subcategory: 'b-vitamins',
    description: 'Methylierte B-Vitamine für Energie und Nervensystem',
    impact_score: 8.0,
    necessity_tier: 'essential',
    evidence_level: 'strong',
    default_dose: 1,
    default_unit: 'Kapsel',
    timing_recommendation: 'Morgens mit Frühstück',
    warnings: ['MTHFR-Mutation beachten - Methylfolat statt Folsäure'],
    is_vegan: true,
    form_quality_notes: 'Methylcobalamin > Cyanocobalamin, 5-MTHF > Folsäure',
  },
];

// ============================================
// LONGEVITY & MITOCHONDRIEN
// ============================================

export const LONGEVITY_SEED: SupplementSeed[] = [
  {
    name: 'NMN',
    category: 'longevity',
    subcategory: 'nad-precursors',
    description: 'Nicotinamid Mononukleotid - NAD+ Vorläufer für zelluläre Energie',
    impact_score: 9.0,
    necessity_tier: 'advanced',
    evidence_level: 'moderate',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Morgens auf nüchternen Magen',
    synergies: ['TMG', 'Resveratrol'],
    warnings: ['IMMER mit TMG/Betain stacken - NMN verbraucht Methylgruppen!'],
    is_vegan: true,
    form_quality_notes: 'Uthever® = Studien-Material mit >99.9% Reinheit',
  },
  {
    name: 'CaAKG',
    category: 'longevity',
    subcategory: 'bio-age',
    description: 'Calcium Alpha-Ketoglutarat - Biologisches Alter reduzieren',
    impact_score: 6.0,
    necessity_tier: 'advanced',
    evidence_level: 'emerging',
    default_dose: 1000,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    is_vegan: true,
    form_quality_notes: 'Rejuvant Studie: 8 Jahre biologische Verjüngung',
  },
  {
    name: 'Spermidin',
    category: 'longevity',
    subcategory: 'autophagy',
    description: 'Autophagie-Aktivator für zelluläre Reinigung',
    impact_score: 6.5,
    necessity_tier: 'advanced',
    evidence_level: 'moderate',
    default_dose: 3,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    is_vegan: true,
  },
  {
    name: 'Urolithin A',
    category: 'longevity',
    subcategory: 'mitophagy',
    description: 'Mitophagie-Aktivator - recycelt alte Mitochondrien',
    impact_score: 8.5,
    necessity_tier: 'advanced',
    evidence_level: 'moderate',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    is_vegan: true,
    form_quality_notes: 'Mitopure® = 6x potenter als Granatapfelsaft',
  },
  {
    name: 'Fisetin',
    category: 'longevity',
    subcategory: 'senolytics',
    description: 'Senolytikum - eliminiert seneszente "Zombie-Zellen"',
    impact_score: 8.5,
    necessity_tier: 'advanced',
    evidence_level: 'emerging',
    default_dose: 100,
    default_unit: 'mg',
    timing_recommendation: 'Hochdosis-Kuren: 20mg/kg für 2-3 Tage, dann Pause',
    synergies: ['Quercetin'],
    is_vegan: true,
  },
  {
    name: 'PQQ',
    category: 'longevity',
    subcategory: 'mitochondria',
    description: 'Pyrrolochinolin Quinon - einzige Substanz für Mitochondrien-NEUBILDUNG',
    impact_score: 7.5,
    necessity_tier: 'advanced',
    evidence_level: 'moderate',
    default_dose: 20,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    synergies: ['CoQ10/Ubiquinol'],
    is_vegan: true,
    form_quality_notes: 'MGCPQQ® ist EU-zugelassen',
  },
];

// ============================================
// METHYLIERUNG & GLUTATHION
// ============================================

export const METHYLATION_SEED: SupplementSeed[] = [
  {
    name: 'TMG',
    category: 'methylation',
    subcategory: 'methyl-donors',
    description: 'Trimethylglycin/Betain - Methylgruppenspender',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 2500,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    synergies: ['NMN', 'B-Vitamine'],
    is_vegan: true,
    form_quality_notes: 'PFLICHT bei NMN-Einnahme!',
  },
  {
    name: 'NAC',
    category: 'antioxidants',
    subcategory: 'glutathione',
    description: 'N-Acetylcystein - Glutathion-Vorläufer, Leber- und Lungensupport',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 600,
    default_unit: 'mg',
    timing_recommendation: 'Morgens oder Abends',
    synergies: ['Glycin', 'Vitamin C'],
    is_vegan: true,
    form_quality_notes: 'UNDERRATED! Für GlyNAC mit Glycin kombinieren',
  },
  {
    name: 'GlyNAC',
    category: 'longevity',
    subcategory: 'glutathione',
    description: 'Glycin + NAC Kombination - TOP Longevity Compound',
    impact_score: 8.5,
    necessity_tier: 'advanced',
    evidence_level: 'moderate',
    default_dose: 1200,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    is_vegan: true,
    form_quality_notes: 'Baylor College Studie: 600mg Glycin + 600mg NAC',
  },
];

// ============================================
// COGNITIVE & NOOTROPICS
// ============================================

export const COGNITIVE_SEED: SupplementSeed[] = [
  {
    name: 'Lions Mane',
    category: 'cognitive',
    subcategory: 'nootropics',
    description: 'Hericium erinaceus - NGF-Steigerung für Nervenwachstum und Gedächtnis',
    impact_score: 8.5,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    synergies: ['Alpha-GPC'],
    is_vegan: true,
    form_quality_notes: 'Dual-Extrakt (Fruchtkörper + Myzel) für Hericenones + Erinacines!',
  },
  {
    name: 'Alpha-GPC',
    category: 'cognitive',
    subcategory: 'cholinergics',
    description: 'Acetylcholin-Vorläufer für Lernen, Gedächtnis und Power Output',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 300,
    default_unit: 'mg',
    timing_recommendation: 'Morgens oder Pre-Workout',
    synergies: ['Lions Mane'],
    is_vegan: true,
  },
  {
    name: 'Phosphatidylserin',
    category: 'cognitive',
    subcategory: 'phospholipids',
    description: 'Cortisol-Senkung, Gedächtnis, Stress-Resilienz',
    impact_score: 7.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 100,
    default_unit: 'mg',
    timing_recommendation: 'Abends bei Stress',
    is_vegan: false,
  },
  {
    name: 'Huperzine A',
    category: 'cognitive',
    subcategory: 'cholinergics',
    description: 'Acetylcholinesterase-Hemmer für verlängerte Acetylcholin-Wirkung',
    impact_score: 6.5,
    necessity_tier: 'advanced',
    evidence_level: 'moderate',
    default_dose: 200,
    default_unit: 'mcg',
    timing_recommendation: 'Morgens, ZYKLISCH: 5 Tage on, 2 off',
    warnings: ['Zyklisch einnehmen!'],
    is_vegan: true,
  },
];

// ============================================
// SLEEP & RECOVERY
// ============================================

export const SLEEP_SEED: SupplementSeed[] = [
  {
    name: 'Glycin',
    category: 'sleep',
    subcategory: 'amino-acids',
    description: 'MASSIV UNDERRATED - Schlafqualität, Körpertemperatur senken',
    impact_score: 8.5,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 3,
    default_unit: 'g',
    timing_recommendation: 'Vor dem Schlaf',
    synergies: ['NAC', 'Magnesium'],
    is_vegan: true,
    form_quality_notes: 'Billig, leicht süß - kann als Zuckerersatz dienen',
  },
  {
    name: 'Apigenin',
    category: 'sleep',
    subcategory: 'gaba-modulators',
    description: 'Kamille-Wirkstoff für GABA-Rezeptoren ohne Suchtpotential',
    impact_score: 7.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 50,
    default_unit: 'mg',
    timing_recommendation: 'Vor dem Schlaf',
    synergies: ['Magnesium', 'L-Theanin'],
    is_vegan: true,
    form_quality_notes: 'Teil des Huberman Sleep Stack',
  },
  {
    name: 'Myo-Inositol',
    category: 'sleep',
    subcategory: 'sugar-alcohols',
    description: 'Schlafarchitektur, hilft gegen nächtliches Gedankenkreisen',
    impact_score: 7.5,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 2000,
    default_unit: 'mg',
    timing_recommendation: 'Vor dem Schlaf',
    is_vegan: true,
  },
  {
    name: 'L-Tryptophan',
    category: 'sleep',
    subcategory: 'amino-acids',
    description: 'Serotonin/Melatonin-Vorstufe',
    impact_score: 7.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Vor dem Schlaf',
    warnings: ['NICHT mit SSRIs kombinieren! Serotonin-Syndrom Gefahr'],
    is_vegan: true,
  },
];

// ============================================
// HORMONAL SUPPORT
// ============================================

export const HORMONAL_SEED: SupplementSeed[] = [
  {
    name: 'Tongkat Ali',
    category: 'hormonal',
    subcategory: 'testosterone',
    description: 'Eurycoma longifolia - Freies Testosteron erhöhen, SHBG senken',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 400,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    warnings: ['Novel Food in EU - manche verkaufen "nicht zum Verzehr"'],
    is_vegan: true,
    form_quality_notes: 'Indonesischer Extrakt bevorzugt',
  },
  {
    name: 'Fadogia Agrestis',
    category: 'hormonal',
    subcategory: 'testosterone',
    description: 'LH-Stimulation für Testosteron-Produktion',
    impact_score: 7.5,
    necessity_tier: 'advanced',
    evidence_level: 'emerging',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Morgens',
    synergies: ['Tongkat Ali'],
    warnings: ['Leberwerte checken! Keine Langzeitstudien.'],
    is_vegan: true,
  },
  {
    name: 'Boron',
    category: 'hormonal',
    subcategory: 'minerals',
    description: 'SHBG-Senkung für mehr freies Testosteron',
    impact_score: 7.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 6,
    default_unit: 'mg',
    timing_recommendation: 'Mit Mahlzeit',
    is_vegan: true,
  },
  {
    name: 'DIM',
    category: 'hormonal',
    subcategory: 'estrogen-metabolism',
    description: 'Diindolylmethan - Hilft "schlechtes" Östrogen auszuscheiden',
    impact_score: 6.5,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 200,
    default_unit: 'mg',
    timing_recommendation: 'Mit Mahlzeit, ZYKLISCH: 2 Wochen on, 1 Woche off',
    is_vegan: true,
  },
];

// ============================================
// METABOLISMUS & BLUTZUCKER
// ============================================

export const METABOLIC_SEED: SupplementSeed[] = [
  {
    name: 'Berberin',
    category: 'metabolic',
    subcategory: 'blood-sugar',
    description: '"Natur-Metformin" - AMPK-Aktivator für Blutzucker und Insulin',
    impact_score: 8.5,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Vor carb-reichen Mahlzeiten (nicht nüchtern)',
    warnings: ['Nicht mit Metformin kombinieren ohne Arzt!'],
    is_vegan: true,
  },
  {
    name: 'Alpha-Liponsäure',
    category: 'metabolic',
    subcategory: 'antioxidants',
    description: 'R-ALA - Universelles Antioxidans, Insulinsensitivität',
    impact_score: 7.5,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 300,
    default_unit: 'mg',
    timing_recommendation: 'Vor Mahlzeiten',
    is_vegan: true,
    form_quality_notes: 'R-Form = natürlich und stabiler als S-Form!',
  },
  {
    name: 'Chrom',
    category: 'metabolic',
    subcategory: 'minerals',
    description: 'Chrom Picolinat - Insulinsignalkette unterstützen',
    impact_score: 6.5,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 200,
    default_unit: 'mcg',
    timing_recommendation: 'Mit Mahlzeiten',
    is_vegan: true,
    form_quality_notes: 'Picolinat > andere Formen',
  },
];

// ============================================
// SPORT & PERFORMANCE
// ============================================

export const SPORT_SEED: SupplementSeed[] = [
  {
    name: 'EAA',
    category: 'sport',
    subcategory: 'amino-acids',
    description: 'Essentielle Aminosäuren - BESSER als BCAAs!',
    impact_score: 8.0,
    necessity_tier: 'essential',
    evidence_level: 'strong',
    default_dose: 10,
    default_unit: 'g',
    timing_recommendation: 'Intra-Workout oder zwischen Mahlzeiten',
    is_vegan: true,
    form_quality_notes: 'BCAAs sind nutzlos wenn genug Protein gegessen wird - EAAs sind vollständig.',
  },
  {
    name: 'L-Citrullin',
    category: 'sport',
    subcategory: 'performance',
    description: 'NO-Booster für Pump und Durchblutung - POTENTER als Arginin',
    impact_score: 8.5,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 6,
    default_unit: 'g',
    timing_recommendation: '30-45 Min Pre-Workout',
    is_vegan: true,
    form_quality_notes: 'Citrullin Malat 2:1 ist Standard',
  },
  {
    name: 'Beta-Alanin',
    category: 'sport',
    subcategory: 'performance',
    description: 'Carnosin-Vorläufer für Ausdauer',
    impact_score: 7.5,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 4,
    default_unit: 'g',
    timing_recommendation: 'Kann aufgeteilt werden (weniger Kribbeln)',
    is_vegan: true,
    form_quality_notes: 'Kribbeln (Parästhesie) ist harmlos!',
  },
  {
    name: 'Kollagen',
    category: 'sport',
    subcategory: 'connective-tissue',
    description: 'Kollagen-Peptide für Gelenke, Sehnen, Haut',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 15,
    default_unit: 'g',
    timing_recommendation: 'Morgens nüchtern oder vor Schlaf',
    synergies: ['Vitamin C'],
    warnings: ['IMMER mit Vitamin C für Kollagen-Synthese!'],
    is_vegan: false,
    form_quality_notes: 'Typ 1+3 für Haut/Sehnen, Typ 2 für Knorpel',
  },
];

// ============================================
// GUT & DIGESTION
// ============================================

export const GUT_SEED: SupplementSeed[] = [
  {
    name: 'L-Glutamin',
    category: 'gut',
    subcategory: 'amino-acids',
    description: 'UNDERRATED für Darm! Repariert Darmschleimhaut (Leaky Gut)',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 10,
    default_unit: 'g',
    timing_recommendation: 'Auf nüchternen Magen',
    is_vegan: true,
  },
  {
    name: 'Colostrum',
    category: 'gut',
    subcategory: 'immune',
    description: 'Bovine Colostrum - Immunsystem, Darmbarriere, Wachstumsfaktoren',
    impact_score: 7.5,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 2,
    default_unit: 'g',
    timing_recommendation: 'Morgens nüchtern',
    is_vegan: false,
    form_quality_notes: 'Enthält Antikörper ähnlich wie Muttermilch',
  },
  {
    name: 'Butyrat',
    category: 'gut',
    subcategory: 'scfa',
    description: 'Kurzkettige Fettsäure - Energie für Darmzellen',
    impact_score: 7.0,
    necessity_tier: 'advanced',
    evidence_level: 'emerging',
    default_dose: 300,
    default_unit: 'mg',
    timing_recommendation: 'Mit Mahlzeit',
    is_vegan: true,
    form_quality_notes: 'Oft als Natrium-Butyrat',
  },
];

// ============================================
// JOINTS & CONNECTIVE TISSUE
// ============================================

export const JOINTS_SEED: SupplementSeed[] = [
  {
    name: 'MSM',
    category: 'joints',
    subcategory: 'sulfur',
    description: 'Methylsulfonylmethan - Organischer Schwefel für Gelenke',
    impact_score: 7.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 2000,
    default_unit: 'mg',
    timing_recommendation: 'Mit Mahlzeit',
    is_vegan: true,
    form_quality_notes: 'OptiMSM® ist Premium. Bitterer Geschmack bei Pulver.',
  },
  {
    name: 'Curcumin',
    category: 'joints',
    subcategory: 'anti-inflammatory',
    description: 'Systemische Entzündungssenkung, Gelenk-Support',
    impact_score: 7.5,
    necessity_tier: 'optimizer',
    evidence_level: 'strong',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Mit fetthaltiger Mahlzeit',
    warnings: ['Ohne Piperin/Fett = 0% Aufnahme!'],
    is_vegan: true,
    form_quality_notes: 'Mizellen > Longvida > Piperin > Standard',
  },
];

// ============================================
// ANTIOXIDANTIEN
// ============================================

export const ANTIOXIDANT_SEED: SupplementSeed[] = [
  {
    name: 'Astaxanthin',
    category: 'antioxidants',
    subcategory: 'carotenoids',
    description: 'Stärkstes natürliches Antioxidant aus Algen',
    impact_score: 8.0,
    necessity_tier: 'optimizer',
    evidence_level: 'moderate',
    default_dose: 12,
    default_unit: 'mg',
    timing_recommendation: 'Mit fetthaltiger Mahlzeit',
    is_vegan: true,
    form_quality_notes: 'AstaReal® ist Premium',
  },
  {
    name: 'Selen',
    category: 'antioxidants',
    subcategory: 'minerals',
    description: 'Selenomethionin - Longevity-essentiell',
    impact_score: 7.0,
    necessity_tier: 'essential',
    evidence_level: 'strong',
    default_dose: 200,
    default_unit: 'mcg',
    timing_recommendation: 'Mit Mahlzeit',
    is_vegan: true,
    form_quality_notes: 'Selenomethionin = beste Form',
  },
];

// ============================================
// TRT SUPPORT
// ============================================

export const TRT_SUPPORT_SEED: SupplementSeed[] = [
  {
    name: 'Citrus Bergamot',
    category: 'cardiovascular',
    subcategory: 'lipids',
    description: 'Lipidprofil-Optimierung - TRT-Pflicht',
    impact_score: 8.5,
    necessity_tier: 'essential',
    evidence_level: 'moderate',
    default_dose: 500,
    default_unit: 'mg',
    timing_recommendation: 'Mit Mahlzeit',
    is_vegan: true,
  },
  {
    name: 'TUDCA',
    category: 'liver',
    subcategory: 'bile-acids',
    description: 'Tauroursodeoxycholic Acid - Leberschutz bei oralen Medikamenten',
    impact_score: 8.0,
    necessity_tier: 'essential',
    evidence_level: 'moderate',
    default_dose: 250,
    default_unit: 'mg',
    timing_recommendation: 'Mit Mahlzeit',
    is_vegan: true,
  },
];

// ============================================
// COMPLETE EXPORT
// ============================================

export const ALL_SUPPLEMENT_SEEDS: SupplementSeed[] = [
  ...ESSENTIALS_SEED,
  ...LONGEVITY_SEED,
  ...METHYLATION_SEED,
  ...COGNITIVE_SEED,
  ...SLEEP_SEED,
  ...HORMONAL_SEED,
  ...METABOLIC_SEED,
  ...SPORT_SEED,
  ...GUT_SEED,
  ...JOINTS_SEED,
  ...ANTIOXIDANT_SEED,
  ...TRT_SUPPORT_SEED,
];

// Stats
export const SUPPLEMENT_SEED_STATS = {
  total_supplements: ALL_SUPPLEMENT_SEEDS.length,
  essential_count: ALL_SUPPLEMENT_SEEDS.filter(s => s.necessity_tier === 'essential').length,
  optimizer_count: ALL_SUPPLEMENT_SEEDS.filter(s => s.necessity_tier === 'optimizer').length,
  advanced_count: ALL_SUPPLEMENT_SEEDS.filter(s => s.necessity_tier === 'advanced').length,
  vegan_count: ALL_SUPPLEMENT_SEEDS.filter(s => s.is_vegan).length,
  categories: [...new Set(ALL_SUPPLEMENT_SEEDS.map(s => s.category))],
};

console.log('ARES Supplement Database Seed Stats:', SUPPLEMENT_SEED_STATS);
