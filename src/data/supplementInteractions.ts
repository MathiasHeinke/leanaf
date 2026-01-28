// ARES Supplement-Interaktionen v3.0
// Synergien, Blocker und Timing-Guide

export interface SupplementSynergy {
  supplements: string[];
  reason: string;
  importance: 'pflicht' | 'empfohlen' | 'optional';
}

export interface SupplementBlocker {
  supplement: string;
  blockers: string[];
  reason: string;
  severity: 'kritisch' | 'moderat' | 'gering';
}

export interface SupplementFormQuality {
  supplement: string;
  bad_forms: string[];
  good_forms: string[];
  optimal_forms: string[];
  note: string;
}

export interface TimingRecommendation {
  timing: string;
  supplements: string[];
  reason: string;
}

// Synergien-Matrix
export const SYNERGIES: SupplementSynergy[] = [
  {
    supplements: ['Vitamin D3', 'Vitamin K2', 'Magnesium'],
    reason: 'K2 leitet Kalzium in Knochen statt Arterien. Mg aktiviert D3.',
    importance: 'pflicht'
  },
  {
    supplements: ['NMN', 'TMG (Betain)'],
    reason: 'NMN verbraucht Methylgruppen → TMG liefert nach. PFLICHT bei NMN!',
    importance: 'pflicht'
  },
  {
    supplements: ['Curcumin', 'Piperin', 'Fett'],
    reason: 'Ohne Piperin/Fett = 0% Aufnahme von Curcumin.',
    importance: 'pflicht'
  },
  {
    supplements: ['Kollagen', 'Vitamin C'],
    reason: 'Vitamin C ist Kofaktor für Kollagen-Synthese.',
    importance: 'pflicht'
  },
  {
    supplements: ['Eisen', 'Vitamin C'],
    reason: 'Vitamin C erhöht Eisenaufnahme signifikant.',
    importance: 'empfohlen'
  },
  {
    supplements: ['PQQ', 'CoQ10/Ubiquinol'],
    reason: 'Regenerieren sich gegenseitig. Mitochondrien-Power-Duo.',
    importance: 'empfohlen'
  },
  {
    supplements: ['Zink', 'Kupfer'],
    reason: '8:1 Ratio bei Langzeiteinnahme beachten.',
    importance: 'empfohlen'
  },
  {
    supplements: ["Lion's Mane", 'Alpha-GPC'],
    reason: 'Beide erhöhen Acetylcholin. Nootropic-Synergie.',
    importance: 'empfohlen'
  },
  {
    supplements: ['Omega-3', 'Vitamin E'],
    reason: 'Vitamin E schützt Omega-3 vor Oxidation.',
    importance: 'optional'
  },
  {
    supplements: ['Kreatin', 'Carbohydrate'],
    reason: 'Insulin-Spike verbessert Kreatin-Aufnahme.',
    importance: 'optional'
  }
];

// Blocker-Matrix
export const BLOCKERS: SupplementBlocker[] = [
  {
    supplement: 'Eisen',
    blockers: ['Kaffee', 'Tee', 'Milch', 'Kalzium', 'Phytate'],
    reason: 'Blockiert Eisenaufnahme komplett. Mind. 2h Abstand!',
    severity: 'kritisch'
  },
  {
    supplement: 'Zink',
    blockers: ['Phytate (Vollkorn)', 'Kalzium', 'Eisen'],
    reason: 'Phytate binden Zink. Nicht mit Vollkorn nehmen.',
    severity: 'moderat'
  },
  {
    supplement: 'Kalzium',
    blockers: ['Eisen', 'Zink', 'Magnesium'],
    reason: 'Konkurrieren um Aufnahme. Zeitlich trennen.',
    severity: 'moderat'
  },
  {
    supplement: '5-HTP / Tryptophan',
    blockers: ['SSRIs', 'MAO-Hemmer', 'Tramadol'],
    reason: 'SEROTONIN-SYNDROM GEFAHR! Lebensbedrohlich!',
    severity: 'kritisch'
  },
  {
    supplement: 'Berberin',
    blockers: ['Metformin'],
    reason: 'Beide AMPK-Aktivatoren. Nur mit Arzt kombinieren.',
    severity: 'moderat'
  },
  {
    supplement: 'Schilddrüsen-Meds (L-Thyroxin)',
    blockers: ['Kaffee', 'Kalzium', 'Eisen', 'Magnesium'],
    reason: 'Mind. 1h Abstand. Nüchtern einnehmen.',
    severity: 'kritisch'
  },
  {
    supplement: 'GH-Peptide (Ipamorelin etc.)',
    blockers: ['Insulin', 'Kohlenhydrate', 'Mahlzeiten'],
    reason: 'Insulin blockiert GH-Ausschüttung. NÜCHTERN!',
    severity: 'kritisch'
  },
  {
    supplement: 'Antibiotika (Tetracycline)',
    blockers: ['Kalzium', 'Magnesium', 'Eisen', 'Milchprodukte'],
    reason: 'Bilden unlösliche Komplexe. 2-3h Abstand.',
    severity: 'kritisch'
  }
];

// Form-Qualitäts-Guide
export const FORM_QUALITY: SupplementFormQuality[] = [
  {
    supplement: 'Magnesium',
    bad_forms: ['Oxid (<4% Aufnahme)', 'Carbonat'],
    good_forms: ['Citrat', 'Malat'],
    optimal_forms: ['Bisglycinat', 'L-Threonat', 'Taurinat'],
    note: 'Oxid = Müll! Nur als Abführmittel geeignet.'
  },
  {
    supplement: 'Zink',
    bad_forms: ['Oxid', 'Sulfat'],
    good_forms: ['Citrat', 'Gluconat'],
    optimal_forms: ['Picolinat', 'Bisglycinat', 'Histidin'],
    note: 'Picolinat hat beste Bioverfügbarkeit.'
  },
  {
    supplement: 'Vitamin B12',
    bad_forms: ['Cyanocobalamin (Cyanid-Rest!)'],
    good_forms: ['Hydroxocobalamin'],
    optimal_forms: ['Methylcobalamin', 'Adenosylcobalamin'],
    note: 'Methylierte Formen für MTHFR-Mutationsträger.'
  },
  {
    supplement: 'Folsäure',
    bad_forms: ['Folsäure (synthetisch)'],
    good_forms: ['Folat'],
    optimal_forms: ['5-MTHF (Methylfolat)', 'Quatrefolic'],
    note: '40% haben MTHFR-Mutation → Methylfolat nutzen!'
  },
  {
    supplement: 'CoQ10',
    bad_forms: ['Ubiquinon (oxidiert, schlechte Aufnahme)'],
    good_forms: ['Ubiquinon mit Fett'],
    optimal_forms: ['Ubiquinol (reduziert/aktiv)'],
    note: 'Ubiquinol ist die aktive Form. Ab 40+ wichtig.'
  },
  {
    supplement: 'Curcumin',
    bad_forms: ['Standard Curcumin (0% Aufnahme!)'],
    good_forms: ['Mit Piperin (20x)'],
    optimal_forms: ['Mizellen (185x)', 'Longvida', 'NovaSOL'],
    note: 'Ohne Absorption-Enhancer komplett wirkungslos.'
  },
  {
    supplement: 'Alpha-Liponsäure',
    bad_forms: ['S-ALA (synthetisch, instabil)'],
    good_forms: ['R/S-Mischung'],
    optimal_forms: ['R-ALA (natürlich)', 'Na-R-ALA (stabilisiert)'],
    note: 'R-Form ist die natürliche, aktive Form.'
  },
  {
    supplement: 'Omega-3',
    bad_forms: ['Ethylester (schlechte Aufnahme)'],
    good_forms: ['Triglycerid-Form'],
    optimal_forms: ['rTG (re-esterified)', 'Phospholipid (Krill)'],
    note: 'Triglycerid-Form besser als Ethylester.'
  },
  {
    supplement: 'Eisen',
    bad_forms: ['Sulfat (GI-Probleme)', 'Oxid'],
    good_forms: ['Fumarat', 'Gluconat'],
    optimal_forms: ['Bisglycinat (Ferrochel)', 'Curryblatt'],
    note: 'Curryblatt = pflanzlich, ohne GI-Probleme.'
  }
];

// Timing-Guide
export const TIMING_GUIDE: TimingRecommendation[] = [
  {
    timing: 'Morgens nüchtern',
    supplements: ['NMN', 'Peptide', 'Schilddrüsen-Meds', 'L-Glutamin', 'Probiotika'],
    reason: 'Beste Absorption ohne Nahrungsinterferenz.'
  },
  {
    timing: 'Mit Frühstück (Fett)',
    supplements: ['D3/K2', 'Omega-3', 'CoQ10', 'Curcumin', 'Vitamin A', 'Vitamin E', 'Astaxanthin'],
    reason: 'Fettlösliche Vitamine brauchen Fett für Absorption.'
  },
  {
    timing: 'Pre-Workout (30-60 Min)',
    supplements: ['Citrullin', 'Koffein', 'Alpha-GPC', 'Beta-Alanin', 'Salz/Elektrolyte'],
    reason: 'Optimale Wirkung während des Trainings.'
  },
  {
    timing: 'Post-Workout',
    supplements: ['Kreatin', 'Protein', 'Kollagen', 'EAAs'],
    reason: 'Anaboles Fenster nutzen. Kreatin mit Carbs.'
  },
  {
    timing: 'Abends / Vor dem Schlafen',
    supplements: ['Magnesium', 'Glycin', 'Ashwagandha', 'Apigenin', 'L-Theanin', 'Phosphatidylserin', 'Zink'],
    reason: 'Entspannung, Schlafqualität, Cortisol-Senkung.'
  },
  {
    timing: 'Mit Mahlzeiten (allgemein)',
    supplements: ['B-Vitamine', 'Multivitamine', 'Berberin', 'Verdauungsenzyme'],
    reason: 'Bessere Verträglichkeit, reduziert GI-Probleme.'
  }
];

// Underrated vs Overrated
export const UNDERRATED_SUPPLEMENTS = [
  { name: 'Glycin', reason: 'Schlaf, Kollagen, billig. Massiv unterschätzt!' },
  { name: 'NAC', reason: 'Leber, Lunge, Glutathion-Precursor. Vielseitig.' },
  { name: 'Taurin', reason: 'Zellhydration, Herzgesundheit, Ruhe. Günstig.' },
  { name: 'L-Glutamin', reason: 'Darmgesundheit, Immunsystem. Unterbewertet.' },
  { name: 'Kreatin', reason: 'Nicht nur Muskeln - auch fürs Gehirn!' },
  { name: 'Elektrolyte', reason: 'Basis für alles. Oft vergessen.' }
];

export const OVERRATED_SUPPLEMENTS = [
  { name: 'BCAAs', reason: 'Nutzlos bei ausreichend Protein. EAAs stattdessen.' },
  { name: 'Fatburner', reason: 'Meist nur Koffein + Marketing. Keine Wirkung.' },
  { name: 'Tribulus', reason: 'Nur Libido, kein Testosteron-Boost.' },
  { name: 'Testo-Booster', reason: 'Fast alle unterdosiert oder wirkungslos.' },
  { name: 'Kollagen-Drinks', reason: 'Zu wenig Dosis. Mind. 10g für Wirkung.' },
  { name: 'Detox-Produkte', reason: 'Pseudowissenschaft. Leber entgiftet selbst.' }
];

// Helper Functions
export const getSynergiesFor = (supplement: string): SupplementSynergy[] => {
  return SYNERGIES.filter(s => 
    s.supplements.some(supp => 
      supp.toLowerCase().includes(supplement.toLowerCase())
    )
  );
};

export const getBlockersFor = (supplement: string): SupplementBlocker | undefined => {
  return BLOCKERS.find(b => 
    b.supplement.toLowerCase().includes(supplement.toLowerCase())
  );
};

export const getFormQualityFor = (supplement: string): SupplementFormQuality | undefined => {
  return FORM_QUALITY.find(f => 
    f.supplement.toLowerCase().includes(supplement.toLowerCase())
  );
};

export const getTimingFor = (supplement: string): TimingRecommendation | undefined => {
  return TIMING_GUIDE.find(t => 
    t.supplements.some(s => 
      s.toLowerCase().includes(supplement.toLowerCase())
    )
  );
};
