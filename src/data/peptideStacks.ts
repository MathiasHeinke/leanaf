// ARES Peptid-Stacks v3.0
// 8 fertige Protokolle für verschiedene Ziele

export interface PeptideStackEntry {
  peptide_id: string;
  peptide_name: string;
  dosage: string;
  frequency: string;
  timing: string;
}

export interface PeptideStack {
  id: string;
  name: string;
  goal: string;
  category: 'muscle' | 'testo' | 'metabolic' | 'immune' | 'sleep' | 'nootropic' | 'healing' | 'longevity';
  protocol_phase: 2 | 3;
  peptides: PeptideStackEntry[];
  duration_weeks: number;
  critical_rules: string[];
  expected_effects: string[];
  warning: string;
}

export const PEPTIDE_STACKS: PeptideStack[] = [
  {
    id: 'clean_gains',
    name: 'Clean Gains',
    goal: 'Kurze, hohe GH-Spikes für Muskelaufbau ohne Dauertherapie',
    category: 'muscle',
    protocol_phase: 2,
    peptides: [
      {
        peptide_id: 'ipamorelin',
        peptide_name: 'Ipamorelin',
        dosage: '100 mcg',
        frequency: '1-3x täglich',
        timing: 'Nüchtern!'
      },
      {
        peptide_id: 'cjc_1295_no_dac',
        peptide_name: 'CJC-1295 no DAC (Mod GRF 1-29)',
        dosage: '100 mcg',
        frequency: '1-3x täglich',
        timing: 'In gleicher Spritze'
      }
    ],
    duration_weeks: 8,
    critical_rules: [
      'Absolut NÜCHTERN! Mind. 2h nach letzter Mahlzeit',
      '20-30 Min warten vor dem Essen nach Injektion',
      'Insulin blockiert GH-Ausschüttung',
      'Wichtigster Zeitpunkt: Direkt vor dem Schlafen'
    ],
    expected_effects: [
      'Synergistische GH-Ausschüttung für 45-60 Min',
      'Muskelaufbau',
      'Fettabbau',
      'Anti-Aging'
    ],
    warning: 'Research-only. Steriles Arbeiten erforderlich.'
  },
  {
    id: 'natural_testo_boost',
    name: 'Natural Testo-Boost',
    goal: 'Maximierung körpereigener Testosteron-Produktion',
    category: 'testo',
    protocol_phase: 2,
    peptides: [
      {
        peptide_id: 'igf1_lr3',
        peptide_name: 'IGF-1 LR3',
        dosage: '20-50 mcg',
        frequency: 'Täglich (Trainingstage)',
        timing: 'Post-Workout'
      },
      {
        peptide_id: 'kisspeptin_10',
        peptide_name: 'Kisspeptin-10',
        dosage: '100-200 mcg',
        frequency: 'Abends',
        timing: 'Spiked akut LH/FSH'
      }
    ],
    duration_weeks: 4,
    critical_rules: [
      'IGF-1 LR3: 4 Wochen on, 4 Wochen off',
      'Östrogen-Management beachten',
      'Blutbild kontrollieren'
    ],
    expected_effects: [
      'LH-Stimulation',
      'Leydig-Zellen-Aktivierung',
      'Freies Testosteron ↑',
      'Muskelaufbau-Unterstützung'
    ],
    warning: 'IGF-1 LR3 kann Gynäkomastie fördern, auch bei gutem Östrogen-Management!'
  },
  {
    id: 'fettleber_reset',
    name: 'Fettleber-Reset',
    goal: 'Radikaler viszeraler Fettabbau und Lebergesundheit',
    category: 'metabolic',
    protocol_phase: 2,
    peptides: [
      {
        peptide_id: 'retatrutide',
        peptide_name: 'Retatrutide',
        dosage: 'Start: 2 mg, steigern bis 8-12 mg',
        frequency: '1x/Woche',
        timing: 'Unabhängig von Mahlzeiten'
      },
      {
        peptide_id: 'ara_290',
        peptide_name: 'ARA-290 (optional)',
        dosage: '4 mg',
        frequency: 'Täglich (aufgeteilt)',
        timing: 'Bei Nervenschäden, 20-30 Tage Kur'
      }
    ],
    duration_weeks: 12,
    critical_rules: [
      'Langsam auftitrieren!',
      'Alle 4 Wochen Dosis steigern',
      'Elektrolyte supplementieren',
      'TUDCA für Leberschutz'
    ],
    expected_effects: [
      'Mobilisiert Fett aus Leber',
      'Erzwingt Verbrennung durch Glukagon-Anteil',
      'Stärkster Gewichtsverlust in Studien',
      'Insulinsensitivität verbessert'
    ],
    warning: 'Phase 2 Trials, nicht zugelassen. GI-Nebenwirkungen bei zu schneller Titration.'
  },
  {
    id: 'autoimmun_reset',
    name: 'Autoimmun-Reset',
    goal: 'Immunsystem resetten, Autoimmun-Erkrankungen lindern',
    category: 'immune',
    protocol_phase: 3,
    peptides: [
      {
        peptide_id: 'kpv',
        peptide_name: 'KPV',
        dosage: '200-500 mcg',
        frequency: 'Täglich SubQ',
        timing: 'Oder oral bei Darm (Colitis)'
      },
      {
        peptide_id: 'thymosin_alpha_1',
        peptide_name: 'Thymosin Alpha 1',
        dosage: '1.6 mg',
        frequency: '2x/Woche (Prävention) oder täglich (akut)',
        timing: 'Standard-Vial'
      },
      {
        peptide_id: 'thymalin',
        peptide_name: 'Thymalin',
        dosage: '10 mg',
        frequency: 'Täglich für 10 Tage',
        timing: 'Radikal-Kur, Effekt 6-12 Monate'
      },
      {
        peptide_id: 'foxo4_dri',
        peptide_name: 'FOXO4-DRI',
        dosage: '3-5 mg',
        frequency: 'Jeden 2. Tag für 1 Woche',
        timing: 'Senolytikum, dann lange Pause'
      }
    ],
    duration_weeks: 4,
    critical_rules: [
      'FOXO4-DRI = pulsatil, nicht dauerhaft!',
      'Thymalin nur als 10-Tage-Kur',
      'Blutbild vorher/nachher'
    ],
    expected_effects: [
      'Systemische Entzündung ↓',
      'Thymus-Regeneration',
      'Zombie-Zellen eliminiert',
      'Immunsystem-Reset'
    ],
    warning: 'Fortgeschrittenes Protokoll. Nur für erfahrene User mit ärztlicher Begleitung.'
  },
  {
    id: 'perfekter_schlaf',
    name: 'Perfekter Schlaf',
    goal: 'Zirbeldrüse reparieren, Melatonin-Synthese maximieren',
    category: 'sleep',
    protocol_phase: 3,
    peptides: [
      {
        peptide_id: 'epitalon',
        peptide_name: 'Epitalon (Variante A)',
        dosage: '10 mg/Tag für 10-20 Tage',
        frequency: 'Alle 6 Monate',
        timing: 'Khavinson-Protokoll'
      },
      {
        peptide_id: 'epitalon',
        peptide_name: 'Epitalon (Variante B)',
        dosage: '100-500 mcg',
        frequency: 'Jeden Abend',
        timing: 'Low-Dose Erhaltung'
      },
      {
        peptide_id: 'pinealon',
        peptide_name: 'Pinealon',
        dosage: '5-10 mg oral oder 100+ mcg SubQ',
        frequency: 'Morgens/Mittags',
        timing: 'Fokus + indirekter Schlaf-Support'
      }
    ],
    duration_weeks: 2,
    critical_rules: [
      'Epitalon nur 2-3x pro Jahr als Kur',
      'Oder low-dose Erhaltung möglich',
      'DSIP gilt als ineffektiv - nicht empfohlen'
    ],
    expected_effects: [
      'Melatonin-Produktion ↑',
      'Telomere geschützt',
      'Circadianer Rhythmus stabilisiert',
      'Tiefschlaf verbessert'
    ],
    warning: 'Research-only. Epitalon-Kuren zeitlich begrenzen.'
  },
  {
    id: 'nootropics_stack',
    name: 'Nootropics',
    goal: 'BDNF-Steigerung, Lernen, Angstlösung',
    category: 'nootropic',
    protocol_phase: 2,
    peptides: [
      {
        peptide_id: 'semax',
        peptide_name: 'Semax',
        dosage: '200-600 mcg nasal',
        frequency: '2x täglich',
        timing: 'Morgens + Mittags'
      },
      {
        peptide_id: 'selank',
        peptide_name: 'Selank',
        dosage: '200-400 mcg nasal',
        frequency: '2x täglich',
        timing: 'Anxiolytisch, keine Sedierung'
      }
    ],
    duration_weeks: 4,
    critical_rules: [
      '4 Wochen on, 2 Wochen off',
      'Nasal: 1-2 Tropfen pro Nasenloch',
      'Nicht abends (können wach halten)'
    ],
    expected_effects: [
      'BDNF massiv erhöht',
      'Fokus und Klarheit',
      'Angst reduziert ohne Sedierung',
      'Neuroprotektion'
    ],
    warning: 'In Russland zugelassen, in EU als Research Chemical. Import auf eigenes Risiko.'
  },
  {
    id: 'wolverine_healing',
    name: 'Wolverine (Healing)',
    goal: 'Maximale Tissue Repair bei Verletzungen',
    category: 'healing',
    protocol_phase: 2,
    peptides: [
      {
        peptide_id: 'bpc_157',
        peptide_name: 'BPC-157',
        dosage: '250-500 mcg',
        frequency: '1-2x täglich',
        timing: 'Nahe der Verletzungsstelle'
      },
      {
        peptide_id: 'tb_500',
        peptide_name: 'TB-500',
        dosage: '2-5 mg',
        frequency: '2x pro Woche',
        timing: 'Systemische Injektion'
      }
    ],
    duration_weeks: 6,
    critical_rules: [
      'BPC-157 lokal, TB-500 systemisch',
      'Können in einer Spritze kombiniert werden',
      'Steriles Arbeiten!',
      'Loading Phase: Höhere Frequenz erste 2 Wochen'
    ],
    expected_effects: [
      'Beschleunigte Wundheilung',
      'Sehnen-/Bänder-Regeneration',
      'Reduzierte Fibrose',
      'Anti-inflammatorisch'
    ],
    warning: 'Research-only. Beliebter Stack bei Athleten für Verletzungsrehabilitation.'
  },
  {
    id: 'looksmaxxing',
    name: 'Looksmaxxing',
    goal: 'Skin Anti-Aging, Kollagen, Mitochondrien für Aussehen',
    category: 'longevity',
    protocol_phase: 3,
    peptides: [
      {
        peptide_id: 'ghk_cu',
        peptide_name: 'GHK-Cu',
        dosage: '1-2 mg',
        frequency: 'Täglich oder zyklisch',
        timing: 'SubQ oder topisch'
      },
      {
        peptide_id: 'epitalon',
        peptide_name: 'Epitalon',
        dosage: '5-10 mg',
        frequency: '10-20 Tage Kur',
        timing: 'Abends'
      },
      {
        peptide_id: 'mots_c',
        peptide_name: 'MOTS-c',
        dosage: '5-10 mg',
        frequency: '2-3x pro Woche',
        timing: 'Vor Training'
      },
      {
        peptide_id: 'ss_31',
        peptide_name: 'SS-31',
        dosage: '5 mg',
        frequency: '2x pro Woche',
        timing: 'Mitochondrien-Repair'
      }
    ],
    duration_weeks: 8,
    critical_rules: [
      'GHK-Cu auch als Serum topisch nutzbar',
      'Kollagen + Vitamin C supplementieren',
      'Ausreichend Schlaf für Regeneration'
    ],
    expected_effects: [
      'Kollagen-Synthese ↑',
      'Haut-Elastizität verbessert',
      'Mitochondrien regeneriert',
      'Allgemeines Anti-Aging'
    ],
    warning: 'Teures Protokoll. Research-only. Für Longevity-Enthusiasten.'
  }
];

export const getStackById = (id: string): PeptideStack | undefined => {
  return PEPTIDE_STACKS.find(s => s.id === id);
};

export const getStacksByCategory = (category: PeptideStack['category']): PeptideStack[] => {
  return PEPTIDE_STACKS.filter(s => s.category === category);
};

export const getStacksByPhase = (phase: 2 | 3): PeptideStack[] => {
  return PEPTIDE_STACKS.filter(s => s.protocol_phase === phase);
};
