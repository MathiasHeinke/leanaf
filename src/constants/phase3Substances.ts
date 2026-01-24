export interface Phase3Substance {
  id: string;
  name: string;
  category: 'senolytic' | 'longevity' | 'maintenance_hormone' | 'maintenance_metabolic';
  description: string;
  mechanism: string;
  hallmarksAddressed: string[];
  defaultDose: number;
  defaultUnit: 'mg' | 'mcg' | 'g';
  dosagePerKg?: number;
  cyclePattern: {
    type: 'hit_and_run' | 'continuous' | 'interval';
    activeDays: number;
    restDays: number;
    frequencyPerMonth?: number;
    frequencyDescription: string;
  };
  administrationRoute: 'oral' | 'subcutaneous' | 'intramuscular';
  timingNotes: string;
  contraindications: string[];
  synergies: string[];
  warningsAndNotes: string[];
}

export const PHASE_3_SUBSTANCES: Phase3Substance[] = [
  {
    id: 'fisetin',
    name: 'Fisetin',
    category: 'senolytic',
    description: 'Senolytikum - eliminiert seneszente Zellen (Hit-and-Run)',
    mechanism: 'Induziert Apoptose in seneszenten Zellen durch Bcl-2-Hemmung, anti-inflammatorisch',
    hallmarksAddressed: [
      'Zelluläre Seneszenz',
      'Chronische Entzündung',
      'Veränderte interzelluläre Kommunikation'
    ],
    defaultDose: 1500,
    defaultUnit: 'mg',
    dosagePerKg: 20,
    cyclePattern: {
      type: 'hit_and_run',
      activeDays: 2,
      restDays: 28,
      frequencyPerMonth: 1,
      frequencyDescription: '2-3 Tage pro Monat (Mayo-Protokoll)',
    },
    administrationRoute: 'oral',
    timingNotes: 'Mit fettreicher Mahlzeit für bessere Absorption. Ideal während Fasten-Zyklus.',
    contraindications: [
      'Nicht während Chemotherapie',
      'Vorsicht bei Blutgerinnungsstörungen'
    ],
    synergies: [
      'Quercetin (24h vorher als Preload)',
      'Fasten verstärkt senolytische Wirkung'
    ],
    warningsAndNotes: [
      'Mayo-Protokoll: 20mg/kg für 2-3 konsekutive Tage',
      'Nicht öfter als 1x/Monat',
      'Kann leichte Müdigkeit verursachen (seneszente Zellen sterben)',
      'Nach Zyklus: 2-3 Tage Ruhe für Clearance'
    ]
  },
  {
    id: 'quercetin_dasatinib',
    name: 'Quercetin + Dasatinib',
    category: 'senolytic',
    description: 'Kombiniertes Senolytikum (stärker als Fisetin allein)',
    mechanism: 'Dasatinib: Tyrosinkinase-Hemmer. Quercetin: Flavonoid, Bcl-2-Hemmung. Synergie verstärkt senolytische Wirkung.',
    hallmarksAddressed: [
      'Zelluläre Seneszenz',
      'Chronische Entzündung',
      'Stammzellenerschöpfung'
    ],
    defaultDose: 100,
    defaultUnit: 'mg',
    cyclePattern: {
      type: 'hit_and_run',
      activeDays: 2,
      restDays: 28,
      frequencyPerMonth: 1,
      frequencyDescription: '2 Tage pro Monat (alternativ zu Fisetin)',
    },
    administrationRoute: 'oral',
    timingNotes: 'Dasatinib 100mg + Quercetin 1000mg. Morgens nüchtern.',
    contraindications: [
      'Leberfunktionsstörungen',
      'QT-Verlängerung',
      'Schwangerschaft/Stillzeit'
    ],
    synergies: [
      'Effektiver als Fisetin allein',
      'Ideal nach erfolgloser Fisetin-Kur'
    ],
    warningsAndNotes: [
      'Dasatinib ist verschreibungspflichtig',
      'Blutbild-Kontrolle vor und nach Zyklus',
      'Nicht mit Grapefruit kombinieren (CYP3A4)',
      'Reserviert für fortgeschrittene User'
    ]
  },
  {
    id: 'ca_akg',
    name: 'Calcium Alpha-Ketoglutarat (Ca-AKG)',
    category: 'longevity',
    description: 'Epigenetische Verjüngung, Langlebigkeits-Substanz',
    mechanism: 'Kofaktor für TET-Enzyme (DNA-Demethylierung), reduziert biologisches Alter in Studien',
    hallmarksAddressed: [
      'Epigenetische Veränderungen',
      'Genomische Instabilität',
      'Chronische Entzündung'
    ],
    defaultDose: 1,
    defaultUnit: 'g',
    cyclePattern: {
      type: 'continuous',
      activeDays: 0,
      restDays: 0,
      frequencyDescription: 'Täglich, kontinuierlich',
    },
    administrationRoute: 'oral',
    timingNotes: 'Morgens auf nüchternen Magen oder mit leichter Mahlzeit.',
    contraindications: [
      'Niereninsuffizienz (Calcium-Akkumulation)',
      'Hyperkalzämie'
    ],
    synergies: [
      'Verstärkt Wirkung mit Vitamin D3',
      'Synergie mit Glycin'
    ],
    warningsAndNotes: [
      'Perna-Studie: 8 Jahre jüngeres biologisches Alter',
      'Mindestens 6 Monate für messbare Effekte',
      'Keine bekannten schweren Nebenwirkungen'
    ]
  },
  {
    id: 'reta_micro',
    name: 'Retatrutid Micro (Erhaltung)',
    category: 'maintenance_metabolic',
    description: 'GLP-1/GIP/Glukagon Triple-Agonist in Erhaltungsdosis',
    mechanism: 'Appetitregulation, metabolische Gesundheit, Gewichtserhaltung nach Phase 1',
    hallmarksAddressed: [
      'Deregulierte Nährstoffsensorik',
      'Mitochondriale Dysfunktion',
      'Chronische Entzündung'
    ],
    defaultDose: 0.75,
    defaultUnit: 'mg',
    cyclePattern: {
      type: 'interval',
      activeDays: 1,
      restDays: 11,
      frequencyDescription: 'Alle 10-14 Tage (Microdosing)',
    },
    administrationRoute: 'subcutaneous',
    timingNotes: 'Einmal alle 10-14 Tage, unabhängig von Mahlzeiten.',
    contraindications: [
      'MEN2-Syndrom',
      'Pankreatitis-Vorgeschichte',
      'Schwangerschaft'
    ],
    synergies: [
      'Unterstützt Gewichtserhaltung nach aggressiver Phase 1',
      'Reduzierte Dosis = weniger GI-Nebenwirkungen'
    ],
    warningsAndNotes: [
      'Nur 10-20% der Phase-1-Dosis',
      'Bei GI-Problemen Intervall auf 14+ Tage erhöhen',
      'Calcitonin-Check alle 6 Monate (Schilddrüse)'
    ]
  },
  {
    id: 'trt_maintenance',
    name: 'TRT Maintenance',
    category: 'maintenance_hormone',
    description: 'Testosteron-Ersatztherapie in Erhaltungsdosis',
    mechanism: 'Aufrechterhaltung anaboler Kapazität, Muskelschutz, Knochengesundheit',
    hallmarksAddressed: [
      'Stammzellenerschöpfung (Muskelsatellitenzellen)',
      'Chronische Entzündung',
      'Veränderte interzelluläre Kommunikation'
    ],
    defaultDose: 100,
    defaultUnit: 'mg',
    cyclePattern: {
      type: 'interval',
      activeDays: 1,
      restDays: 6,
      frequencyDescription: 'Wöchentlich (oder aufgeteilt 2x/Woche)',
    },
    administrationRoute: 'intramuscular',
    timingNotes: 'Wöchentlich oder aufgeteilt auf 2x50mg für stabilere Spiegel.',
    contraindications: [
      'Prostatakarzinom',
      'Schlafapnoe (unbehandelt)',
      'Polyzythämie'
    ],
    synergies: [
      'Mit Anti-Aromatase-Stack bei hohem Östrogen',
      'HCG optional für Hodenfunktion'
    ],
    warningsAndNotes: [
      'Reduziert von Phase-1-Dosis (150-200mg)',
      'Hämatokrit unter 52% halten',
      'Blutbild alle 3-6 Monate'
    ]
  },
  {
    id: 'glycine',
    name: 'Glycin',
    category: 'longevity',
    description: 'Aminosäure für Kollagen, Schlaf und Methylierung',
    mechanism: 'Kollagensynthese, NMDA-Rezeptor-Modulation, Glutathion-Precursor',
    hallmarksAddressed: [
      'Verlust der Proteostase',
      'Epigenetische Veränderungen'
    ],
    defaultDose: 3,
    defaultUnit: 'g',
    cyclePattern: {
      type: 'continuous',
      activeDays: 0,
      restDays: 0,
      frequencyDescription: 'Täglich, 3g vor dem Schlafen',
    },
    administrationRoute: 'oral',
    timingNotes: 'Vor dem Schlafen für Schlafqualität. Tagsüber mit Kollagen kombinierbar.',
    contraindications: [
      'Keine bekannten'
    ],
    synergies: [
      'Verstärkt NAC/Glutathion',
      'Synergie mit Ca-AKG'
    ],
    warningsAndNotes: [
      'Sehr sicher, keine Obergrenze bekannt',
      'Verbessert Schlafqualität',
      'Süßlicher Geschmack'
    ]
  },
];

export const getPhase3SubstanceById = (id: string): Phase3Substance | undefined => {
  return PHASE_3_SUBSTANCES.find(s => s.id === id);
};

export const getPhase3SubstancesByCategory = (
  category: Phase3Substance['category']
): Phase3Substance[] => {
  return PHASE_3_SUBSTANCES.filter(s => s.category === category);
};

export const getSenolyticSubstances = (): Phase3Substance[] => {
  return PHASE_3_SUBSTANCES.filter(s => s.category === 'senolytic');
};

export const getMaintenanceSubstances = (): Phase3Substance[] => {
  return PHASE_3_SUBSTANCES.filter(s =>
    s.category === 'maintenance_hormone' || s.category === 'maintenance_metabolic'
  );
};

export const getLongevitySubstances = (): Phase3Substance[] => {
  return PHASE_3_SUBSTANCES.filter(s => s.category === 'longevity');
};
