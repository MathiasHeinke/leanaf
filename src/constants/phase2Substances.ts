export interface Phase2Substance {
  id: string;
  name: string;
  category: 'mitochondrial' | 'epigenetic' | 'nootropic' | 'nad_booster';
  description: string;
  mechanism: string;
  hallmarksAddressed: string[];
  defaultDose: number;
  defaultUnit: 'mg' | 'mcg';
  defaultTiming: string;
  cyclePattern: {
    type: 'weeks_on_off' | 'days_on' | 'continuous';
    onPeriod: number;
    offPeriod: number;
    unit: 'days' | 'weeks' | 'months';
  };
  administrationRoute: 'subcutaneous' | 'intramuscular' | 'nasal' | 'oral';
  warningsAndNotes: string[];
}

export const PHASE_2_SUBSTANCES: Phase2Substance[] = [
  {
    id: 'ss_31',
    name: 'SS-31 (Elamipretide)',
    category: 'mitochondrial',
    description: 'Mitochondrialer Stabilisator - bindet an Cardiolipin',
    mechanism: 'Stabilisiert die innere Mitochondrienmembran, reduziert ROS an der Quelle',
    hallmarksAddressed: [
      'Mitochondriale Dysfunktion',
      'Genomische Instabilität',
      'Zelluläre Seneszenz'
    ],
    defaultDose: 50,
    defaultUnit: 'mg',
    defaultTiming: 'pre_zone2',
    cyclePattern: {
      type: 'weeks_on_off',
      onPeriod: 8,
      offPeriod: 4,
      unit: 'weeks'
    },
    administrationRoute: 'subcutaneous',
    warningsAndNotes: [
      'Nicht täglich nehmen - zyklisch einsetzen',
      'Ideal vor Ausdauertraining',
      'Teuer - strategisch einsetzen'
    ]
  },
  {
    id: 'mots_c',
    name: 'MOTS-c',
    category: 'mitochondrial',
    description: 'Exercise Mimetic - mitochondrial kodiertes Peptid',
    mechanism: 'Aktiviert AMPK, verbessert Glukoseverwertung, imitiert Ausdauertraining',
    hallmarksAddressed: [
      'Mitochondriale Dysfunktion',
      'Deregulierte Nährstoffsensorik',
      'Chronische Entzündung'
    ],
    defaultDose: 10,
    defaultUnit: 'mg',
    defaultTiming: 'pre_zone2',
    cyclePattern: {
      type: 'weeks_on_off',
      onPeriod: 8,
      offPeriod: 4,
      unit: 'weeks'
    },
    administrationRoute: 'subcutaneous',
    warningsAndNotes: [
      '30-60 Min vor Zone 2 Cardio injizieren',
      'Nicht täglich - max 3x/Woche',
      'Synergie mit SS-31 für maximale Wirkung'
    ]
  },
  {
    id: 'epitalon',
    name: 'Epitalon',
    category: 'epigenetic',
    description: 'Telomerase-Aktivator nach Khavinson',
    mechanism: 'Induziert Telomerase-Aktivität, resettet Zirbeldrüse, korrigiert Chromatinstruktur',
    hallmarksAddressed: [
      'Telomerverkürzung',
      'Epigenetische Veränderungen',
      'Genomische Instabilität'
    ],
    defaultDose: 10,
    defaultUnit: 'mg',
    defaultTiming: 'evening',
    cyclePattern: {
      type: 'days_on',
      onPeriod: 10,
      offPeriod: 6,
      unit: 'months'
    },
    administrationRoute: 'subcutaneous',
    warningsAndNotes: [
      'Khavinson-Protokoll: 10mg/Tag für 10 Tage',
      'Nur 2x pro Jahr durchführen',
      'Abends nehmen (Melatonin-Synergie)'
    ]
  },
  {
    id: 'semax',
    name: 'Semax',
    category: 'nootropic',
    description: 'ACTH-Fragment - BDNF-Hochregulation',
    mechanism: 'Erhöht BDNF massiv, neuroprotektiv, verbessert exekutive Funktionen',
    hallmarksAddressed: [
      'Stammzellenerschöpfung (Neuronen)',
      'Veränderte interzelluläre Kommunikation'
    ],
    defaultDose: 200,
    defaultUnit: 'mcg',
    defaultTiming: 'morning',
    cyclePattern: {
      type: 'weeks_on_off',
      onPeriod: 4,
      offPeriod: 2,
      unit: 'weeks'
    },
    administrationRoute: 'nasal',
    warningsAndNotes: [
      'Nasal: 1-2 Sprühstöße pro Nasenloch',
      'Morgens für kognitive Optimierung',
      'Kann mit Selank kombiniert werden'
    ]
  },
  {
    id: 'selank',
    name: 'Selank',
    category: 'nootropic',
    description: 'Anxiolytisches Peptid - GABA/Serotonin-Modulation',
    mechanism: 'Reduziert Cortisol ohne Sedierung, schützt Hippocampus',
    hallmarksAddressed: [
      'Chronische Entzündung (Stress-induziert)',
      'Veränderte interzelluläre Kommunikation'
    ],
    defaultDose: 200,
    defaultUnit: 'mcg',
    defaultTiming: 'morning',
    cyclePattern: {
      type: 'weeks_on_off',
      onPeriod: 4,
      offPeriod: 2,
      unit: 'weeks'
    },
    administrationRoute: 'nasal',
    warningsAndNotes: [
      'Ideal bei hohem Stress/Cortisol',
      'Keine Sedierung - Tagsüber geeignet',
      'Synergie mit Semax'
    ]
  },
  {
    id: 'nmn',
    name: 'NMN (Nicotinamid-Mononukleotid)',
    category: 'nad_booster',
    description: 'NAD+ Precursor - DNA-Reparatur-Support',
    mechanism: 'Erhöht NAD+ Spiegel, aktiviert Sirtuine, unterstützt DNA-Reparatur',
    hallmarksAddressed: [
      'Genomische Instabilität',
      'Epigenetische Veränderungen',
      'Mitochondriale Dysfunktion'
    ],
    defaultDose: 500,
    defaultUnit: 'mg',
    defaultTiming: 'morning',
    cyclePattern: {
      type: 'continuous',
      onPeriod: 0,
      offPeriod: 0,
      unit: 'days'
    },
    administrationRoute: 'oral',
    warningsAndNotes: [
      'Morgens nüchtern für beste Absorption',
      'Sublingual oder liposomal bevorzugt',
      'Kann mit Resveratrol kombiniert werden'
    ]
  },
];

export const getSubstanceById = (id: string): Phase2Substance | undefined => {
  return PHASE_2_SUBSTANCES.find(s => s.id === id);
};

export const getSubstancesByCategory = (category: Phase2Substance['category']): Phase2Substance[] => {
  return PHASE_2_SUBSTANCES.filter(s => s.category === category);
};
