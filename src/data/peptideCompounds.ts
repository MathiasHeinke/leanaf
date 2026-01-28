// ARES Peptid-Datenbank v3.0
// 30+ Peptide mit Dosierungen, Protokollen und Bezugsquellen

export interface PeptideCompound {
  id: string;
  name: string;
  category: 'healing' | 'longevity' | 'nootropic' | 'gh_secretagogue' | 'metabolic' | 'immune' | 'testo' | 'skin';
  description: string;
  mechanism: string;
  impact_score: number;
  protocol_phase: 2 | 3;
  dosage_research: string;
  frequency: string;
  administration_route: 'subcutaneous' | 'intramuscular' | 'nasal' | 'oral' | 'topical';
  cycle_protocol: string;
  timing_notes: string;
  synergies: string[];
  warnings: string[];
  legal_status: 'research_only' | 'rx_required' | 'approved_other_countries' | 'banned';
}

export const PEPTIDE_COMPOUNDS: PeptideCompound[] = [
  // REGENERATION & HEALING
  {
    id: 'bpc_157',
    name: 'BPC-157',
    category: 'healing',
    description: 'Body Protection Compound - Tissue Repair Peptid',
    mechanism: 'Stimuliert Angiogenese, beschleunigt Wundheilung, schützt Darmschleimhaut',
    impact_score: 8.5,
    protocol_phase: 2,
    dosage_research: '250-500 mcg/Tag',
    frequency: '1-2x täglich',
    administration_route: 'subcutaneous',
    cycle_protocol: '4-8 Wochen on, dann Pause',
    timing_notes: 'Nahe der Verletzungsstelle injizieren. Auch oral möglich.',
    synergies: ['TB-500', 'GHK-Cu'],
    warnings: ['Research-only', 'Steriles Arbeiten erforderlich'],
    legal_status: 'research_only'
  },
  {
    id: 'tb_500',
    name: 'TB-500 (Thymosin Beta-4)',
    category: 'healing',
    description: 'Tissue Repair & Anti-Inflammation Peptid',
    mechanism: 'Fördert Zellmigration, reduziert Fibrose, systemische Heilung',
    impact_score: 8.0,
    protocol_phase: 2,
    dosage_research: '2-5 mg 2x/Woche',
    frequency: '2x pro Woche',
    administration_route: 'subcutaneous',
    cycle_protocol: '4-6 Wochen Loading, dann 2x/Monat Erhaltung',
    timing_notes: 'Kann mit BPC-157 in einer Spritze kombiniert werden',
    synergies: ['BPC-157'],
    warnings: ['Research-only', 'Nicht bei aktiven Krebserkrankungen'],
    legal_status: 'research_only'
  },
  {
    id: 'ghk_cu',
    name: 'GHK-Cu (Kupferpeptid)',
    category: 'skin',
    description: 'Skin/Collagen/Anti-Aging Peptid',
    mechanism: 'Stimuliert Kollagen, reduziert Entzündungen, Wundheilung',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '1-2 mg/Tag',
    frequency: 'Täglich oder zyklisch',
    administration_route: 'subcutaneous',
    cycle_protocol: '4 Wochen on, 2 Wochen off',
    timing_notes: 'Auch topisch als Serum erhältlich',
    synergies: ['Epitalon', 'Kollagen'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  },

  // LONGEVITY & TELOMERE
  {
    id: 'epitalon',
    name: 'Epitalon',
    category: 'longevity',
    description: 'Telomerase-Aktivator nach Khavinson',
    mechanism: 'Induziert Telomerase, resettet Zirbeldrüse, korrigiert Chromatinstruktur',
    impact_score: 7.0,
    protocol_phase: 3,
    dosage_research: '5-10 mg/Tag',
    frequency: 'Täglich für 10-20 Tage',
    administration_route: 'subcutaneous',
    cycle_protocol: 'Khavinson: 10mg/Tag für 10 Tage, 2-3x pro Jahr',
    timing_notes: 'Abends für Melatonin-Synergie',
    synergies: ['Pinealon', 'Melatonin'],
    warnings: ['Research-only', 'Nur 2-3x pro Jahr'],
    legal_status: 'research_only'
  },
  {
    id: 'mots_c',
    name: 'MOTS-c',
    category: 'longevity',
    description: 'Exercise Mimetic - mitochondrial kodiertes Peptid',
    mechanism: 'Aktiviert AMPK, verbessert Glukoseverwertung, imitiert Ausdauertraining',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '5-10 mg 2-3x/Woche',
    frequency: '2-3x pro Woche',
    administration_route: 'subcutaneous',
    cycle_protocol: '8 Wochen on, 4 Wochen off',
    timing_notes: '30-60 Min vor Zone 2 Cardio',
    synergies: ['SS-31', 'NMN'],
    warnings: ['Research-only', 'Teuer'],
    legal_status: 'research_only'
  },
  {
    id: 'ss_31',
    name: 'SS-31 (Elamipretide)',
    category: 'longevity',
    description: 'Mitochondrialer Stabilisator - bindet an Cardiolipin',
    mechanism: 'Stabilisiert innere Mitochondrienmembran, reduziert ROS an der Quelle',
    impact_score: 8.0,
    protocol_phase: 2,
    dosage_research: '5 mg 2x/Woche',
    frequency: '2x pro Woche',
    administration_route: 'subcutaneous',
    cycle_protocol: '8 Wochen on, 4 Wochen off',
    timing_notes: 'Vor Ausdauertraining optimal',
    synergies: ['MOTS-c', 'CoQ10'],
    warnings: ['Research-only', 'In klinischen Studien für Herzinsuffizienz'],
    legal_status: 'research_only'
  },

  // NOOTROPICS
  {
    id: 'semax',
    name: 'Semax',
    category: 'nootropic',
    description: 'ACTH-Fragment - BDNF-Hochregulation',
    mechanism: 'Erhöht BDNF massiv, neuroprotektiv, verbessert exekutive Funktionen',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '200-600 mcg/Tag nasal',
    frequency: '1-2x täglich',
    administration_route: 'nasal',
    cycle_protocol: '4 Wochen on, 2 Wochen off',
    timing_notes: '1-2 Tropfen pro Nasenloch morgens',
    synergies: ['Selank', "Lion's Mane"],
    warnings: ['In Russland zugelassen, in EU Research Chemical'],
    legal_status: 'approved_other_countries'
  },
  {
    id: 'selank',
    name: 'Selank',
    category: 'nootropic',
    description: 'Anxiolytisches Peptid - GABA/Serotonin-Modulation',
    mechanism: 'Reduziert Cortisol ohne Sedierung, schützt Hippocampus',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '200-400 mcg/Tag nasal',
    frequency: '1-2x täglich',
    administration_route: 'nasal',
    cycle_protocol: '4 Wochen on, 2 Wochen off',
    timing_notes: 'Morgens und/oder mittags',
    synergies: ['Semax'],
    warnings: ['In Russland zugelassen, in EU Research Chemical'],
    legal_status: 'approved_other_countries'
  },
  {
    id: 'pinealon',
    name: 'Pinealon',
    category: 'nootropic',
    description: 'Zirbeldrüsen-Bioregulator',
    mechanism: 'Reguliert Melatonin-Produktion, schützt Zirbeldrüse',
    impact_score: 6.5,
    protocol_phase: 3,
    dosage_research: '5-10 mg oral oder 100+ mcg SubQ',
    frequency: 'Morgens/Mittags',
    administration_route: 'oral',
    cycle_protocol: '10-30 Tage, dann Pause',
    timing_notes: 'Indirekt schlafunterstützend',
    synergies: ['Epitalon'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  },

  // GH SECRETAGOGUES
  {
    id: 'ipamorelin',
    name: 'Ipamorelin',
    category: 'gh_secretagogue',
    description: 'GH-Releasing Peptid - sanfter GH-Boost',
    mechanism: 'Stimuliert GH-Ausschüttung ohne Cortisol/Prolaktin-Anstieg',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '100-300 mcg 1-3x täglich',
    frequency: '1-3x täglich',
    administration_route: 'subcutaneous',
    cycle_protocol: '8-12 Wochen, dann Pause',
    timing_notes: 'NÜCHTERN! Mind. 2h nach letzter Mahlzeit',
    synergies: ['CJC-1295 no DAC'],
    warnings: ['Research-only', 'Insulin blockiert GH!'],
    legal_status: 'research_only'
  },
  {
    id: 'cjc_1295_no_dac',
    name: 'CJC-1295 no DAC (Mod GRF 1-29)',
    category: 'gh_secretagogue',
    description: 'GHRH-Analog - verlängert GH-Puls',
    mechanism: 'Amplifiziert natürlichen GH-Puls, synergetisch mit Ipamorelin',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '100-300 mcg 1-3x täglich',
    frequency: '1-3x täglich',
    administration_route: 'subcutaneous',
    cycle_protocol: '8-12 Wochen, dann Pause',
    timing_notes: 'Zusammen mit Ipamorelin in einer Spritze',
    synergies: ['Ipamorelin'],
    warnings: ['Research-only', 'Vor dem Schlafen wichtigster Zeitpunkt'],
    legal_status: 'research_only'
  },

  // METABOLIC
  {
    id: 'retatrutide',
    name: 'Retatrutide',
    category: 'metabolic',
    description: 'GLP-1/GIP/Glukagon Triple-Agonist',
    mechanism: 'Appetitreduktion, Fettmobilisierung, Insulinsensitivität',
    impact_score: 8.5,
    protocol_phase: 2,
    dosage_research: '1-12 mg wöchentlich',
    frequency: '1x pro Woche',
    administration_route: 'subcutaneous',
    cycle_protocol: 'Langsam auftitrieren: Start 1-2mg, alle 4 Wochen steigern',
    timing_notes: 'Unabhängig von Mahlzeiten',
    synergies: ['Elektrolyte', 'TUDCA'],
    warnings: ['Phase 2 Trials, nicht zugelassen', 'GI-Nebenwirkungen möglich'],
    legal_status: 'research_only'
  },
  {
    id: 'ara_290',
    name: 'ARA-290',
    category: 'metabolic',
    description: 'EPO-Derivat ohne hämatopoetische Wirkung',
    mechanism: 'Neuroprotektiv, anti-inflammatorisch, bei Nervenschäden',
    impact_score: 6.5,
    protocol_phase: 3,
    dosage_research: '4 mg täglich',
    frequency: 'Täglich (aufgeteilt)',
    administration_route: 'subcutaneous',
    cycle_protocol: '20-30 Tage Kur',
    timing_notes: 'Bei diabetischer Neuropathie oder Nervenschäden',
    synergies: ['Retatrutide'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  },

  // IMMUNE
  {
    id: 'kpv',
    name: 'KPV',
    category: 'immune',
    description: 'Anti-inflammatorisches Tripeptid',
    mechanism: 'Hemmt NF-kB, reduziert systemische Entzündung',
    impact_score: 7.0,
    protocol_phase: 3,
    dosage_research: '200-500 mcg täglich',
    frequency: 'Täglich',
    administration_route: 'subcutaneous',
    cycle_protocol: '4-8 Wochen',
    timing_notes: 'Auch oral bei Darm-Entzündungen (Colitis)',
    synergies: ['Thymosin Alpha 1'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  },
  {
    id: 'thymosin_alpha_1',
    name: 'Thymosin Alpha 1',
    category: 'immune',
    description: 'Thymus-Peptid - Immunmodulation',
    mechanism: 'Aktiviert T-Zellen, stärkt Immunsystem, anti-viral',
    impact_score: 7.5,
    protocol_phase: 3,
    dosage_research: '1.6 mg',
    frequency: '2x/Woche (Prävention) oder täglich (akut)',
    administration_route: 'subcutaneous',
    cycle_protocol: '4-8 Wochen oder nach Bedarf',
    timing_notes: 'Standard-Vial 1.6mg',
    synergies: ['KPV', 'Thymalin'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  },
  {
    id: 'thymalin',
    name: 'Thymalin',
    category: 'immune',
    description: 'Thymus-Bioregulator nach Khavinson',
    mechanism: 'Regeneriert Thymus-Funktion, Immunsystem-Reset',
    impact_score: 7.0,
    protocol_phase: 3,
    dosage_research: '10 mg täglich',
    frequency: 'Täglich für 10 Tage',
    administration_route: 'subcutaneous',
    cycle_protocol: 'Radikal-Kur: 10 Tage, Effekt 6-12 Monate',
    timing_notes: 'Khavinson-Protokoll',
    synergies: ['Thymosin Alpha 1', 'Epitalon'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  },
  {
    id: 'foxo4_dri',
    name: 'FOXO4-DRI',
    category: 'immune',
    description: 'Senolytisches Peptid - eliminiert Zombie-Zellen',
    mechanism: 'Induziert Apoptose in seneszenten Zellen',
    impact_score: 7.0,
    protocol_phase: 3,
    dosage_research: '3-5 mg jeden 2. Tag',
    frequency: 'Jeden 2. Tag für 1 Woche',
    administration_route: 'subcutaneous',
    cycle_protocol: 'Pulsatil: 1 Woche, dann lange Pause',
    timing_notes: 'NICHT dauerhaft!',
    synergies: ['Fisetin', 'Quercetin'],
    warnings: ['Research-only', 'Senolytikum - nur pulsatil!'],
    legal_status: 'research_only'
  },

  // TESTO
  {
    id: 'igf1_lr3',
    name: 'IGF-1 LR3',
    category: 'testo',
    description: 'Long-Acting Insulin-like Growth Factor',
    mechanism: 'Stimuliert Proteinsynthese, Muskelwachstum',
    impact_score: 7.5,
    protocol_phase: 2,
    dosage_research: '20-50 mcg täglich',
    frequency: 'Täglich (Trainingstage)',
    administration_route: 'subcutaneous',
    cycle_protocol: '4 Wochen on, 4 Wochen off',
    timing_notes: 'Post-Workout',
    synergies: ['Kisspeptin-10'],
    warnings: ['Research-only', 'Kann Gynäkomastie fördern!'],
    legal_status: 'research_only'
  },
  {
    id: 'kisspeptin_10',
    name: 'Kisspeptin-10',
    category: 'testo',
    description: 'Hypothalamus-Peptid - LH/FSH Stimulation',
    mechanism: 'Stimuliert GnRH, erhöht LH und FSH akut',
    impact_score: 6.5,
    protocol_phase: 2,
    dosage_research: '100-200 mcg',
    frequency: 'Abends',
    administration_route: 'subcutaneous',
    cycle_protocol: 'Zyklisch',
    timing_notes: 'Spiked akut LH/FSH',
    synergies: ['IGF-1 LR3'],
    warnings: ['Research-only'],
    legal_status: 'research_only'
  }
];

export const getPeptideById = (id: string): PeptideCompound | undefined => {
  return PEPTIDE_COMPOUNDS.find(p => p.id === id);
};

export const getPeptidesByCategory = (category: PeptideCompound['category']): PeptideCompound[] => {
  return PEPTIDE_COMPOUNDS.filter(p => p.category === category);
};

export const getPeptidesByPhase = (phase: 2 | 3): PeptideCompound[] => {
  return PEPTIDE_COMPOUNDS.filter(p => p.protocol_phase === phase);
};
