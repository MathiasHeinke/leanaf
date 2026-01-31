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
  hasShoppingList?: boolean; // Flag for custom bloodwork rendering
}

export const LIFE_IMPACT_DATA: Record<string, ExtendedChecklistData> = {
  toxin_free: {
    key: 'toxin_free',
    impact: {
      years: 15,
      label: '+10 bis +15 Jahre',
      color: 'success',
    },
    whyTitle: 'Biochemischer Reset',
    whyContent: [
      'Alkohol stoppt Fettverbrennung sofort – ohne Alkohol kann Retatrutid voll wirken.',
      'Ohne Alkohol: Volle REM-Schlaf-Regeneration für optimale Hormonproduktion.',
      'Ohne Alkohol: Keine Aromatisierung von Testosteron zu Östrogen – keine Gynäkomastie.',
      'Ohne Nikotin: Gefäße sind weit offen – Citrullin, Cialis und TRT wirken optimal.',
      'Ohne Rauchen: Kollagen bleibt intakt, GHK-Cu kann aufbauen statt reparieren.',
      'Ohne Plastik/Teflon: Keine endokrinen Disruptoren – stabiles Testosteron und Schilddrüse.',
      'Mit Sauna (≥80°C): Heat Shock Proteins aktiviert – die zelluläre Reparatur-Truppe.',
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
    aresQuote: 'Toxinfrei leben bringt dir bis zu 15 zusätzliche Lebensjahre. Das ist der größte Hebel im ganzen Protokoll.',
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
      years: 5,
      label: '+3 bis +5 Jahre',
      color: 'success',
    },
    whyTitle: 'Biologische Brandherde löschen',
    whyContent: [
      'Sanierte Zähne = keine offene Wunde mehr, die dauerhaft Bakterien ins Blut schickt.',
      'Ohne Parodontitis: Deutlich geringeres Herzinfarkt-Risiko.',
      'Ohne Amalgam: Kein Quecksilber mehr, das dein Nervensystem belastet.',
      'Mit Clean Beauty: Keine hormonaktiven Stoffe mehr, die dein System durcheinanderbringen.',
    ],
    subItems: [
      { label: 'Professionelle Zahnreinigung erledigt', explanation: 'Bevor zum Kardiologen – erst zum Zahnarzt' },
      { label: 'Parodontitis behandelt', explanation: 'Chronische Entzündung = permanenter Stress' },
      { label: 'Amalgam fachgerecht entfernt', explanation: 'Nur durch spezialisierten Zahnarzt' },
      { label: 'Clean Beauty', explanation: 'Nur Inhaltsstoffe, die man theoretisch essen könnte' },
      { label: 'Mineralischen Sonnenschutz', explanation: 'Keine chemischen Filter mit hormoneller Wirkung' },
    ],
    aresQuote: 'Mit einem sanierten Körper gewinnst du 3-5 Jahre Lebenszeit. Keine offenen Baustellen mehr.',
  },
  
  psycho_hygiene: {
    key: 'psycho_hygiene',
    impact: {
      years: 10,
      label: '+10 Jahre',
      color: 'success',
    },
    whyTitle: 'Psycho-Neuro-Immunologie',
    whyContent: [
      'Ein stabiles Umfeld ist der stärkste Schutzfaktor gegen Herzkrankheiten – stärker als Nichtrauchen!',
      'Niedriges Cortisol = Testosteron und Progesteron können optimal wirken.',
      'Ein "Safe Haven" senkt chronischen Stress und damit Entzündungsmarker.',
      'Tiefe, langjährige Bindungen senken den Entzündungsmarker IL-6 messbar.',
      'Du bist der Durchschnitt der 5 Menschen, mit denen du dich umgibst – wähle weise.',
    ],
    subItems: [
      { label: 'Safe Haven etabliert', explanation: 'Partner/Umfeld das echte Sicherheit gibt' },
      { label: 'Energievampire eliminiert', explanation: 'Toxische Menschen radikal entfernt' },
      { label: 'Beziehung geklärt', explanation: 'Kein dauerhafter Konflikt zu Hause' },
      { label: 'Stress-Job addressiert', explanation: 'Cortisol macht jede Intervention wirkungslos' },
      { label: 'Tägliche mentale Routine', explanation: 'Journaling, Meditation oder Atemübungen' },
    ],
    aresQuote: 'Ein stabiles Umfeld bringt dir 10 Jahre. Stress eliminieren ist der zweitgrößte Hebel.',
  },
  
  digital_hygiene: {
    key: 'digital_hygiene',
    impact: {
      years: 2,
      label: '+2 Jahre',
      color: 'success',
    },
    whyTitle: 'Dopamin-Reset',
    whyContent: [
      'Ohne Doomscrolling: Amygdala entspannt, Cortisol sinkt auf gesundes Niveau.',
      'Ohne Blaulicht vor dem Schlafen: Volle Melatonin-Produktion für regenerativen Schlaf.',
      'Ohne ständige Benachrichtigungen: Fokussierte Aufmerksamkeit, weniger Stress.',
      'Morgens ohne Handy: Proaktiver Start in den Tag statt reaktiver Modus.',
    ],
    subItems: [
      { label: 'Schlafzimmer = handyfreie Zone', explanation: 'Handy lädt in anderem Raum' },
      { label: 'Morgens 60min kein Input', explanation: 'Journaling statt Social Media' },
      { label: 'Screen-Time Limits aktiv', explanation: 'Feste Zeiten für digitale Geräte' },
      { label: 'Benachrichtigungen deaktiviert', explanation: 'Nur wirklich wichtige Apps' },
      { label: 'Kein Doomscrolling', explanation: 'Bewusster, zeitlich begrenzter Konsum' },
    ],
    aresQuote: 'Digitale Hygiene bringt dir 2 Jahre. Dein Gehirn dankt es dir.',
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
      years: 5,
      label: '+5 Jahre',
      color: 'success',
    },
    whyTitle: 'Viszeralfett eliminieren',
    whyContent: [
      'Weniger Bauchfett = weniger Entzündungsstoffe im Körper.',
      'Niedriger KFA = bessere Insulinsensitivität, höheres Testosteron, weniger Östrogen.',
      'Stabile Glukose unter 140 mg/dl = keine Gefäß-Glykation.',
      'Weniger Fett = weniger Speicher für fettlösliche Toxine.',
    ],
    subItems: [
      { label: 'KFA bekannt', explanation: 'Messung durch Caliper, DEXA oder Waage mit Impedanz' },
      { label: 'KFA <20% (Männer)', explanation: 'Ideal: <15%' },
      { label: 'KFA <25% (Frauen)', explanation: 'Ideal: <20%' },
      { label: 'Trend fallend', explanation: 'Mindestens 1 Messung zeigt Verbesserung' },
    ],
    aresQuote: 'Niedriger KFA bringt dir 5 Jahre. Dein Bauchfett arbeitet dann FÜR dich.',
  },
  
  bloodwork_baseline: {
    key: 'bloodwork_baseline',
    impact: {
      years: 0,
      label: 'Baseline',
      color: 'success',
    },
    whyTitle: 'Die ARES Einkaufsliste: Kugelsicher & Kosteneffizient',
    whyContent: [
      'Ohne Baseline keine Optimierung – du musst wissen wo du stehst bevor du losläufst.',
      'Die richtige Marker-Kombination spart Geld und liefert maximale Information für den Arzt.',
      'Mit diesen Werten hast du die perfekte Munition für das Online-Rezept (TRT/Reta).',
      'PSA ist Pflicht – kein Arzt verschreibt Testosteron ohne Prostata-Nachweis.',
      'Hämatokrit ist bei TRT der wichtigste Sicherheitsmarker: Blut darf nicht zu "Honig" werden.',
      'Lipase überwacht die Bauchspeicheldrüse – kritisch bei GLP-1 Agonisten wie Retatrutid.',
    ],
    subItems: [
      // Basis-Paket
      { label: 'Großes Blutbild (inkl. Hämatokrit)', explanation: 'Bei TRT = Sicherheitsmarker Nr. 1' },
      { label: 'Leberwerte (ALT, AST, GGT)', explanation: 'Entgiftungskapazität prüfen' },
      { label: 'Nierenwerte (Kreatinin, eGFR)', explanation: 'Filtrationsleistung' },
      { label: 'Stoffwechsel (HbA1c)', explanation: 'Langzeit-Blutzucker (Glykation)' },
      { label: 'Entzündung (hsCRP)', explanation: 'Chronische Entzündung erkennen' },
      { label: 'Cholesterin-Profil (HDL, LDL, Trig)', explanation: 'Kardiovaskuläres Risiko' },
      // TRT Türöffner
      { label: 'Testosteron (Gesamt)', explanation: 'Diagnose-Grundlage für TRT' },
      { label: 'LH + FSH', explanation: 'Primär vs. sekundärer Mangel' },
      { label: 'Estradiol (E2)', explanation: 'Baseline für Aromatase-Management' },
      { label: 'PSA', explanation: '⚠️ Prostata-Sicherheit – PFLICHT vor TRT!' },
      { label: 'Lipase', explanation: 'Pankreas-Check für Retatrutid' },
    ],
    aresQuote: 'Blinde Optimierung ist Glücksspiel. Diese Einkaufsliste ist dein Kompass – der Arzt sieht: "Patient ist informiert, Prostata okay, Mangel belegt."',
    // Flag for custom rendering
    hasShoppingList: true,
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

  profile_complete: {
    key: 'profile_complete',
    impact: {
      years: 0,
      label: 'Fundament',
      color: 'success',
    },
    whyTitle: 'Dein Ausgangspunkt',
    whyContent: [
      'Ohne vollständiges Profil keine personalisierten Empfehlungen.',
      'Basisdaten (Gewicht, Größe, Alter) sind die Grundlage für alle Berechnungen.',
      'Lifestyle-Daten ermöglichen präzise Toxin-Analyse und Risikobewertung.',
      'Der Disclaimer schützt dich und uns rechtlich.',
      'ARES braucht diese Daten um dir optimal zu helfen.',
    ],
    subItems: [
      { label: 'Basisdaten erfasst', explanation: 'Gewicht, Größe, Alter, Geschlecht, Aktivität' },
      { label: 'Lifestyle-Screening abgeschlossen', explanation: 'Rauchen, Alkohol, Substanzen – ehrlich für dich selbst' },
      { label: 'Disclaimer akzeptiert', explanation: 'Rechtliche Verantwortung verstanden und bestätigt' },
    ],
    aresQuote: 'Ohne Daten bin ich blind. Gib mir die Infos – dann zeig ich dir den Weg.',
  },
};

// Intro quotes for the Phase 0 header
export const PHASE0_INTRO = {
  title: 'Via Negativa: Erst entfernen, was schadet',
  subtitle: 'Das Multiplikator-Prinzip der Langlebigkeit',
  formula: '0 (Lifestyle) × 10 (Rapamycin) = 0',
  mainQuote: 'Willst du 120+ werden und die beste Version von dir selbst? Dann gibt es keine Verhandlung. Shit in = Shit out.',
  warningQuote: 'Sie können ein schlechtes Fundament nicht wegspritzen. Die Protokolle sind der Turbolader – aber Sie müssen erst den Motor stellen und die Karosserie entrosten.',
};
