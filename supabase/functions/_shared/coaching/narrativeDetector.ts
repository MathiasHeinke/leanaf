/**
 * Narrative Detector - Situational Intelligence System
 * 
 * Unterscheidet zwischen:
 * - VENTING: User drückt Frustration aus, aber ohne Excuse ("Mann, war das stressig!")
 * - HONEST ADMISSION: User gibt Fehler ehrlich zu ("Hab's verkackt, sorry")
 * - EXCUSE: User nutzt Kausalität um Verfehlung zu rechtfertigen ("konnte nicht trainieren WEIL Stress")
 * 
 * Nur bei EXCUSE wird der Reality Audit aktiviert.
 */

export type ExcuseType = 
  | 'excuse_time'      // "keine Zeit", "kam nicht dazu"
  | 'excuse_energy'    // "müde", "erschöpft"
  | 'excuse_emotional' // "brauchte das", "Nervennahrung"
  | 'excuse_external'  // "Chef", "Partner", "Wetter"
  | 'rationalization'; // "muss auch mal", "ist ja okay"

export interface NarrativeAnalysis {
  /** Wurde eine Excuse erkannt? (Trigger für Reality Audit) */
  detected: boolean;
  /** Nur Venting ohne Excuse (kein Trigger) */
  isVenting: boolean;
  /** Ehrliche Admission ohne Rechtfertigung (kein Trigger) */
  isHonestAdmission: boolean;
  /** Typ der Excuse (wenn detected = true) */
  excuseType: ExcuseType | null;
  /** Die erkannte Aussage */
  originalClaim: string;
  /** Konfidenz der Erkennung (0-1) */
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kausalitäts-Patterns - Diese zeigen "weil X, habe ich Y nicht gemacht"
 */
const CAUSALITY_PATTERNS = [
  /\bweil\b/i,
  /\baber\b/i,
  /\beigentlich\b/i,
  /\bmusste\b/i,
  /\bkonnte nicht\b/i,
  /\bhatte keine\b/i,
  /\bdeswegen\b/i,
  /\bdarum\b/i,
  /\bdeshalb\b/i,
  /\bdaher\b/i,
  /\bsonst\b/i,
  /\bdurch\b.*\bnicht\b/i,
  /\bwegen\b/i,
];

/**
 * Negative Keywords - Typische Ausreden-Begriffe
 */
const EXCUSE_KEYWORDS: Record<ExcuseType, RegExp[]> = {
  excuse_time: [
    /\bzeit\b/i,
    /\bkam nicht dazu\b/i,
    /\bnicht geschafft\b/i,
    /\bzu viel zu tun\b/i,
    /\btermine?\b/i,
    /\bspät\b/i,
    /\bhektisch\b/i,
  ],
  excuse_energy: [
    /\bmüde\b/i,
    /\berschöpft\b/i,
    /\bkaputt\b/i,
    /\bplatt\b/i,
    /\bkeine energie\b/i,
    /\bausgepowert\b/i,
    /\bfertig\b/i,
    /\bkraftlos\b/i,
  ],
  excuse_emotional: [
    /\bstress\b/i,
    /\bgestresst\b/i,
    /\bbrauchte das\b/i,
    /\bbrauchte\b/i,
    /\bnervennahrung\b/i,
    /\bbelohnung\b/i,
    /\btrost\b/i,
    /\bfrust\b/i,
    /\bseelenheil\b/i,
    /\bgönnen\b/i,
    /\bverdient\b/i,
  ],
  excuse_external: [
    /\bchef\b/i,
    /\barbeit\b/i,
    /\bpartner\b/i,
    /\bfreunde?\b/i,
    /\bfamilie\b/i,
    /\bkinder?\b/i,
    /\bwetter\b/i,
    /\bregen\b/i,
    /\bkalt\b/i,
    /\bkrank\b/i,
    /\bkollegen?\b/i,
  ],
  rationalization: [
    /\bmal okay\b/i,
    /\bist ja mal\b/i,
    /\bmuss auch\b.*\bleben\b/i,
    /\beine ausnahme\b/i,
    /\bausnahmsweise\b/i,
    /\bnicht so schlimm\b/i,
    /\begal\b/i,
    /\bjeder mal\b/i,
    /\bman darf\b/i,
  ],
};

/**
 * Ehrliche Admissions - Diese sind KEINE Excuses
 */
const HONEST_ADMISSION_PATTERNS = [
  /\bhab('s|es)? verkackt\b/i,
  /\bwar mein fehler\b/i,
  /\bhab versagt\b/i,
  /\bhab('s)? nicht gemacht\b/i,
  /\bhab zu viel\b/i,
  /\bzu wenig\b/i,
  /\bhab geschummelt\b/i,
  /\bwar lecker\b/i,  // "Hab Pizza gegessen, war lecker" - ehrlich, keine Excuse
  /\bhatte lust\b/i,  // "Hatte Lust drauf" - ehrlich, keine Excuse
  /\bwollte ich\b/i,
  /\bhatte bock\b/i,
  /\bsorry\b/i,
  /\btut mir leid\b/i,
  /\bgeb zu\b/i,
  /\bist passiert\b/i,
  /\bhab nicht\b.*\bgeschafft\b/i, // ohne "weil"
];

/**
 * Venting Patterns - Frustration ausdrücken ohne Excuse
 */
const VENTING_PATTERNS = [
  /^mann\b/i,
  /^uff\b/i,
  /^puh\b/i,
  /^boah\b/i,
  /\bwar (echt|so|mega|voll|total) stressig\b/i,
  /\bwas für ein tag\b/i,
  /\bharter tag\b/i,
  /\bbin (so|echt|mega|voll) müde\b/i,
  /\bnerven liegen blank\b/i,
  /\bfühle mich (schlecht|mies|beschissen)\b/i,
];

/**
 * Failure Keywords - Zeigt an, dass etwas nicht erreicht wurde
 */
const FAILURE_INDICATORS = [
  /\bnicht trainiert\b/i,
  /\bnicht geschafft\b/i,
  /\bnicht gemacht\b/i,
  /\bzu viel gegessen\b/i,
  /\büber\s*(meinem?)?\s*ziel\b/i,
  /\bverpasst\b/i,
  /\bausgelassen\b/i,
  /\bgesündigt\b/i,
  /\bgecheatet\b/i,
  /\bcheat\b/i,
  /\bdrüber\b/i,
  /\bschwach geworden\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DETECTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analysiert eine User-Nachricht auf Narratives/Excuses
 * 
 * @param message - Die User-Nachricht
 * @returns NarrativeAnalysis mit detected, isVenting, isHonestAdmission, excuseType
 */
export function detectNarrative(message: string): NarrativeAnalysis {
  const text = message.toLowerCase().trim();
  
  // Standardfall: Keine Narrative erkannt
  const defaultResult: NarrativeAnalysis = {
    detected: false,
    isVenting: false,
    isHonestAdmission: false,
    excuseType: null,
    originalClaim: '',
    confidence: 0,
  };
  
  // Leere Nachrichten ignorieren
  if (text.length < 5) {
    return defaultResult;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 1: Check für ehrliche Admission (kein Trigger)
  // ═══════════════════════════════════════════════════════════════════════════════
  const isHonestAdmission = HONEST_ADMISSION_PATTERNS.some(p => p.test(text));
  
  // Wenn ehrlich UND keine Kausalität → kein Trigger
  const hasCausality = CAUSALITY_PATTERNS.some(p => p.test(text));
  
  if (isHonestAdmission && !hasCausality) {
    return {
      ...defaultResult,
      isHonestAdmission: true,
      confidence: 0.8,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 2: Check für Venting (kein Trigger)
  // ═══════════════════════════════════════════════════════════════════════════════
  const isVenting = VENTING_PATTERNS.some(p => p.test(text));
  const hasFailureIndicator = FAILURE_INDICATORS.some(p => p.test(text));
  
  // Venting ohne Failure-Indikator = nur Dampf ablassen
  if (isVenting && !hasFailureIndicator && !hasCausality) {
    return {
      ...defaultResult,
      isVenting: true,
      confidence: 0.7,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHRITT 3: Check für EXCUSE (Trigger!)
  // Bedingung: Kausalitäts-Pattern + Excuse-Keyword + (optional: Failure-Indicator)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (!hasCausality) {
    // Ohne Kausalität ("weil", "aber", "musste") → keine Excuse
    return defaultResult;
  }
  
  // Finde welcher Excuse-Typ passt
  let detectedExcuseType: ExcuseType | null = null;
  let matchedKeyword = '';
  let confidence = 0.5;
  
  for (const [excuseType, patterns] of Object.entries(EXCUSE_KEYWORDS) as [ExcuseType, RegExp[]][]) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        detectedExcuseType = excuseType;
        matchedKeyword = match[0];
        confidence = 0.75;
        
        // Erhöhe Konfidenz wenn auch Failure-Indicator vorhanden
        if (hasFailureIndicator) {
          confidence = 0.9;
        }
        break;
      }
    }
    if (detectedExcuseType) break;
  }
  
  // Wenn keine Excuse-Keywords aber Kausalität → niedrige Konfidenz
  if (!detectedExcuseType && hasCausality && hasFailureIndicator) {
    // z.B. "Hab nicht trainiert, aber egal" → Rationalization
    detectedExcuseType = 'rationalization';
    confidence = 0.6;
  }
  
  // Finale Entscheidung
  if (detectedExcuseType) {
    return {
      detected: true,
      isVenting: false,
      isHonestAdmission: false,
      excuseType: detectedExcuseType,
      originalClaim: matchedKeyword || extractRelevantClause(text),
      confidence,
    };
  }
  
  return defaultResult;
}

/**
 * Extrahiert den relevanten Teil der Aussage für das Prompt
 */
function extractRelevantClause(text: string): string {
  // Versuche den Teil nach "weil" oder "aber" zu extrahieren
  const causalityMatch = text.match(/(?:weil|aber|musste|konnte nicht|wegen)\s+(.{5,50})/i);
  if (causalityMatch) {
    return causalityMatch[1].trim();
  }
  // Fallback: Ersten 50 Zeichen
  return text.slice(0, 50);
}

/**
 * Beschreibt den Excuse-Typ für das Prompt
 */
export function getExcuseTypeDescription(type: ExcuseType): string {
  const descriptions: Record<ExcuseType, string> = {
    excuse_time: 'Zeit-Ausrede ("keine Zeit", "kam nicht dazu")',
    excuse_energy: 'Energie-Ausrede ("müde", "erschöpft")',
    excuse_emotional: 'Emotionale Ausrede ("Stress", "brauchte das")',
    excuse_external: 'Externe Schuldzuweisung ("Chef", "Partner", "Wetter")',
    rationalization: 'Rationalisierung ("muss auch leben", "ist ja mal okay")',
  };
  return descriptions[type];
}
