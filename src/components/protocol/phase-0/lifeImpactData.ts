/**
 * Phase 0 Life Impact Data - Scientific context from ARES Protocol Document
 * "Shit in = Shit out" - Das Multiplikator-Prinzip der Langlebigkeit
 */

export interface LifeImpact {
  years: number; // Positive = years gained, Negative = years lost
  label: string;
  color: 'destructive' | 'success';
}

export interface ExtendedChecklistData {
  key: string;
  impact: LifeImpact;
  whyTitle: string;
  whyContent: string[];
  subItems: {
    label: string;
    explanation: string;
  }[];
  aresQuote?: string;
}

export const LIFE_IMPACT_DATA: Record<string, ExtendedChecklistData> = {
  toxin_free: {
    key: 'toxin_free',
    impact: {
      years: -15,
      label: '-10 bis -15 Jahre',
      color: 'destructive',
    },
    whyTitle: 'Biochemisches K.O.',
    whyContent: [
      'Alkohol stoppt Fettverbrennung sofort – Retatrutid kann nicht wirken, solange die Leber das Gift abbaut.',
      'Alkohol zerstört REM-Schlaf = keine hormonelle Regeneration möglich.',
      'Alkohol aromatisiert Testosteron zu Östrogen. Ihr Feierabendbier wächst Ihnen Brüste (Gynäkomastie).',
      'Nikotin verengt Gefäße (Vasokonstriktion) – macht Citrullin, Cialis und TRT wirkungslos.',
      'Rauchen zerstört Kollagen schneller als GHK-Cu es aufbauen kann. Rauchen = Falten.',
      'Endokrine Disruptoren (PFOA, BPA, Phthalate) aus Plastik/Teflon senken Testosteron und stören Schilddrüse.',
      'Sauna bei ≥80°C aktiviert Heat Shock Proteins (HSPs) – die zelluläre Reparatur-Truppe.',
      'Finnische Kuopio-Studie (20+ Jahre): 4-7× Sauna/Woche senkt Gesamtmortalität um ~40%, Demenz um 65%.',
      'Sauna erhöht Puls auf 120-150 bpm – fast identisch mit Zone 2 Cardio, nur entspannter.',
      'Im Schweiß werden Schwermetalle (Blei, Cadmium) und BPA ausgeschieden.',
    ],
    subItems: [
      { label: 'Kein Rauchen/Vaping', explanation: 'Nikotin verengt Gefäße – Vollgas mit angezogener Handbremse' },
      { label: 'Alkohol 0 (max. 2×/Jahr)', explanation: 'Nur zu besonderen Anlässen (Hochzeit/Silvester)' },
      { label: 'Keine heißen Speisen aus Plastik/Alu', explanation: 'Hitze löst Weichmacher und Neurotoxine' },
      { label: 'Teflon-Pfannen ersetzt', explanation: 'Edelstahl, Gusseisen oder Keramik nutzen' },
      { label: 'Naturfasern auf der Haut', explanation: 'Kein Polyester (Mikroplastik wird transdermal aufgenommen)' },
      { label: 'Wasserfilter installiert', explanation: 'Leitungswasser enthält Medikamentenrückstände' },
      { label: 'Regelmäßig Sauna (≥80°C)', explanation: '4-7×/Woche – Heat Shock Proteins, -40% Mortalität (Kuopio-Studie)' },
    ],
    aresQuote: 'Retatrutid und TRT sind wirkungslos wenn du rauchst und trinkst. Du kannst ein schlechtes Fundament nicht wegspritzen.',
  },
  
  sleep_score: {
    key: 'sleep_score',
    impact: {
      years: 5,
      label: '+3 bis +5 Jahre',
      color: 'success',
    },
    whyTitle: 'Gehirn-Wäsche',
    whyContent: [
      'Schlaf ist nicht "Ausruhen" – Schlaf ist aktive Entgiftung des Gehirns.',
      'Das Glymphatische System: Im Tiefschlaf schrumpfen Gehirnzellen und Hirnwasser spült toxische Proteine (Beta-Amyloid → Alzheimer) aus.',
      'Ohne REM-Schlaf keine hormonelle Regeneration – Testosteron, Wachstumshormon werden nachts produziert.',
      'Chronischer Schlafmangel erhöht Cortisol und Entzündungsmarker massiv.',
    ],
    subItems: [
      { label: '≥7h Gesamtschlaf', explanation: 'Jeden Tag, keine Ausnahmen am Wochenende' },
      { label: '≥1.5h Tiefschlaf (wenn trackbar)', explanation: 'Die kritische Phase für Entgiftung' },
      { label: 'Vor 22 Uhr ins Bett', explanation: 'Optimale Ausrichtung an natürlichem Biorhythmus' },
      { label: 'Stockdunkel', explanation: 'Melatonin-Schutz – auch Standby-LEDs stören' },
      { label: 'Kühle 16-18°C', explanation: 'Kerntemperatur muss sinken für Tiefschlaf' },
      { label: 'Kein Blaulicht 2h vor Bett', explanation: 'Oder Blueblocker-Brille tragen' },
    ],
    aresQuote: 'Im Schlaf reparierst du dich. Wer schlecht schläft, altert schneller – Punkt.',
  },
  
  bio_sanierung: {
    key: 'bio_sanierung',
    impact: {
      years: -5,
      label: '-3 bis -5 Jahre',
      color: 'destructive',
    },
    whyTitle: 'Biologische Brandherde',
    whyContent: [
      'Eine unentdeckte Parodontitis ist eine permanente offene Wunde von der Größe eines Handtellers.',
      'Bakterien wandern vom Mundraum direkt in die Herzklappen – erhöhtes Herzinfarkt-Risiko.',
      'Amalgamfüllungen enthalten Quecksilber, ein potentes Neurotoxin.',
      'Was Sie auf die Haut schmieren, landet im Blut – Parabene und chemische Filter wirken hormonell.',
    ],
    subItems: [
      { label: 'Professionelle Zahnreinigung erledigt', explanation: 'Bevor zum Kardiologen – erst zum Zahnarzt' },
      { label: 'Parodontitis behandelt', explanation: 'Chronische Entzündung = permanenter Stress' },
      { label: 'Amalgam fachgerecht entfernt', explanation: 'Nur durch spezialisierten Zahnarzt' },
      { label: 'Clean Beauty', explanation: 'Nur Inhaltsstoffe, die man theoretisch essen könnte' },
      { label: 'Mineralischen Sonnenschutz', explanation: 'Keine chemischen Filter mit hormoneller Wirkung' },
    ],
    aresQuote: 'Dein Mund ist das Tor zu deinem Körper. Eine Baustelle dort vergiftet alles andere.',
  },
  
  psycho_hygiene: {
    key: 'psycho_hygiene',
    impact: {
      years: -10,
      label: '-10 Jahre',
      color: 'destructive',
    },
    whyTitle: 'Psycho-Neuro-Immunologie',
    whyContent: [
      'Eine toxische Beziehung ist der stärkste Prädiktor für Herzkrankheiten – stärker als Rauchen!',
      'Stress (Cortisol) frisst Testosteron und Progesteron zum Frühstück.',
      'Sie brauchen keine "aufregende" Beziehung, sondern einen "Safe Haven".',
      'Langjährige, tiefe Bindungen senken den Entzündungsmarker IL-6.',
      'Sie sind der Durchschnitt der 5 Menschen, mit denen Sie sich umgeben.',
    ],
    subItems: [
      { label: 'Safe Haven etabliert', explanation: 'Partner/Umfeld das echte Sicherheit gibt' },
      { label: 'Energievampire eliminiert', explanation: 'Toxische Menschen radikal entfernt' },
      { label: 'Beziehung geklärt', explanation: 'Kein dauerhafter Konflikt zu Hause' },
      { label: 'Stress-Job addressiert', explanation: 'Cortisol macht jede Intervention wirkungslos' },
      { label: 'Tägliche mentale Routine', explanation: 'Journaling, Meditation oder Atemübungen' },
    ],
    aresQuote: 'Dein Cortisol ist so hoch, dass das Testosteron wirkungslos verpufft. Erst Stress-Quellen eliminieren.',
  },
  
  digital_hygiene: {
    key: 'digital_hygiene',
    impact: {
      years: -2,
      label: '-2 Jahre',
      color: 'destructive',
    },
    whyTitle: 'Dopamin-Detox',
    whyContent: [
      'Doomscrolling hält Ihre Amygdala (Angstzentrum) dauerhaft aktiv → chronisches Cortisol.',
      'Blaues Licht vor dem Schlafen unterdrückt Melatonin-Produktion.',
      'Ständige Benachrichtigungen fragmentieren Aufmerksamkeit und erhöhen Stress.',
      'Morgens direkt am Handy = reaktiver statt proaktiver Start in den Tag.',
    ],
    subItems: [
      { label: 'Schlafzimmer = handyfreie Zone', explanation: 'Handy lädt in anderem Raum' },
      { label: 'Morgens 60min kein Input', explanation: 'Journaling statt Social Media' },
      { label: 'Screen-Time Limits aktiv', explanation: 'Feste Zeiten für digitale Geräte' },
      { label: 'Benachrichtigungen deaktiviert', explanation: 'Nur wirklich wichtige Apps' },
      { label: 'Kein Doomscrolling', explanation: 'Bewusster, zeitlich begrenzter Konsum' },
    ],
    aresQuote: 'Dein Handy programmiert dein Gehirn. Entscheide du, wer die Kontrolle hat.',
  },
  
  protein_training: {
    key: 'protein_training',
    impact: {
      years: 5,
      label: '+5 Jahre',
      color: 'success',
    },
    whyTitle: 'Die drei Säulen der Leistung',
    whyContent: [
      'Muskelmasse korreliert direkt mit der Überlebensdauer. Starke Muskeln = längeres Leben.',
      'Ab 40 verlieren Sie Muskeln (Sarkopenie). Protein stoppt diesen Abbau.',
      'VO2max ist der stärkste statistische Prädiktor für ein langes Leben.',
      'Zone 2 Cardio vermehrt Mitochondrien – die Kraftwerke deiner Zellen.',
      '"Spazieren gehen" reicht nicht. Wir brauchen spezifische Reize für spezifische Systeme.',
    ],
    subItems: [
      { label: 'Zone 2 Cardio: 150+ Min/Woche', explanation: 'Puls bei dem man reden aber nicht singen kann' },
      { label: 'Krafttraining: 3×/Woche schwer', explanation: '5-10 Wiederholungen, progressive Überlastung' },
      { label: 'VO2max: 1×/Woche Intervalle', explanation: 'Puls >90% – fast am Limit' },
      { label: 'Protein: 1.2-2g/kg Körpergewicht', explanation: 'Jeden Tag, nicht nur an Trainingstagen' },
    ],
    aresQuote: 'Protein ist Struktur. Wer fettfrei isst, kastriert sich chemisch.',
  },
  
  kfa_trend: {
    key: 'kfa_trend',
    impact: {
      years: -5,
      label: '-5 Jahre',
      color: 'destructive',
    },
    whyTitle: 'Viszeralfett = Metabolische Zeitbombe',
    whyContent: [
      'Bauchfett ist hormonell aktiv und produziert Entzündungsstoffe.',
      'Hoher KFA korreliert mit Insulinresistenz, erhöhtem Östrogen und niedrigem Testosteron.',
      'Jede Glukose-Spitze über 140 mg/dl karamellisiert Ihre Gefäße (Glykation).',
      'Körperfett speichert fettlösliche Toxine – je mehr Fett, desto mehr Giftdepot.',
    ],
    subItems: [
      { label: 'KFA bekannt', explanation: 'Messung durch Caliper, DEXA oder Waage mit Impedanz' },
      { label: 'KFA <20% (Männer)', explanation: 'Ideal: <15%' },
      { label: 'KFA <25% (Frauen)', explanation: 'Ideal: <20%' },
      { label: 'Trend fallend', explanation: 'Mindestens 2 Messungen zeigen Verbesserung' },
    ],
    aresQuote: 'Ihr Bauchfett ist eine Hormonfabrik die gegen Sie arbeitet.',
  },
  
  bloodwork_baseline: {
    key: 'bloodwork_baseline',
    impact: {
      years: 0,
      label: 'Baseline',
      color: 'success',
    },
    whyTitle: 'Ohne Baseline keine Optimierung',
    whyContent: [
      'Du musst wissen wo du stehst bevor du losläufst.',
      'Blutwerte zeigen versteckte Probleme: Entzündungen, Insulinresistenz, Hormon-Imbalancen.',
      'Regelmäßige Kontrollen zeigen ob Interventionen wirken.',
      'Sicherheit bei Supplementen und Peptiden – Leber und Niere müssen überwacht werden.',
    ],
    subItems: [
      { label: 'Testosteron (frei + gesamt)', explanation: 'Hormonstatus Basis' },
      { label: 'Estradiol (E2)', explanation: 'Testo:E2 Ratio wichtig' },
      { label: 'HbA1c', explanation: 'Langzeit-Blutzucker (Glykation)' },
      { label: 'hsCRP', explanation: 'Entzündungsmarker' },
      { label: 'Leberwerte (AST, ALT, GGT)', explanation: 'Entgiftungskapazität' },
      { label: 'Hämatokrit', explanation: 'Wichtig bei TRT' },
    ],
    aresQuote: 'Blinde Optimierung ist Glücksspiel. Daten sind dein Kompass.',
  },

  tracking_measurement: {
    key: 'tracking_measurement',
    impact: {
      years: 0,
      label: 'Fundament',
      color: 'success',
    },
    whyTitle: 'Wer nicht misst, weiß nichts',
    whyContent: [
      'Ohne Daten keine Optimierung – du weißt nicht ob Interventionen wirken.',
      'Wearables machen unsichtbare Veränderungen sichtbar (HRV, Schlafphasen, Resting HR).',
      'Ein Journal dokumentiert Energie, Stimmung, Nebenwirkungen – Pattern Recognition.',
      'Regelmäßige Blut- und Hormontests zeigen versteckte Probleme BEVOR Symptome auftreten.',
      'Trends über Zeit sind wichtiger als Einzelwerte – nur mit Daten erkennst du sie.',
      'ARES erwartet Daten. Ohne Daten keine personalisierten Empfehlungen.',
    ],
    subItems: [
      { label: 'Wearable nutzen', explanation: 'Apple Watch, Oura, Whoop – Schlaf, HRV, Aktivität tracken' },
      { label: 'Gewicht/KFA regelmäßig tracken', explanation: 'Mind. 1× pro Woche, besser täglich morgens nüchtern' },
      { label: 'Mahlzeiten erfassen', explanation: 'Makros kennen – App oder Dashboard nutzen' },
      { label: 'Training dokumentieren', explanation: 'Jede Session eintragen (im Dashboard)' },
      { label: 'Bluttest alle 3-6 Monate', explanation: 'Marker verfolgen, Trends erkennen, Sicherheit' },
      { label: 'Journal führen (optional)', explanation: 'Energie, Stimmung, Besonderheiten notieren' },
    ],
    aresQuote: 'Wer nicht misst, weiß nichts. Und wer nichts weiß, kann nichts ändern.',
  },
};

// Intro quotes for the Phase 0 header
export const PHASE0_INTRO = {
  title: 'Via Negativa: Erst entfernen, was schadet',
  subtitle: 'Das Multiplikator-Prinzip der Langlebigkeit',
  formula: '0 (Lifestyle) × 10 (Rapamycin) = 0',
  mainQuote: 'Willst du 120+ werden und die beste Version von dir selbst? Dann gibt es keine Verhandlung. ARES erträgt keine Heuchler – er will Macher. Shit in = Shit out.',
  warningQuote: 'Sie können ein schlechtes Fundament nicht wegspritzen. Die Protokolle sind der Turbolader – aber Sie müssen erst den Motor stellen und die Karosserie entrosten.',
};
