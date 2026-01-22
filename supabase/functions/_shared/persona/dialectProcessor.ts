/**
 * Coach Personas System - Dialekt Post-Processing
 * Phase 2: Orchestrator Integration
 * 
 * Dieses Modul wendet Dialekt-Transformationen auf LLM-Antworten an.
 * Primär für RÜHL's hessischen Dialekt entwickelt.
 * 
 * WICHTIG: Diese Transformationen werden NACH der LLM-Antwort angewendet,
 * um die Antwort sprachlich anzupassen ohne die Bedeutung zu verändern.
 */

/**
 * Dialekt-Ersetzungsregeln
 * Format: [RegEx-Pattern, Ersetzung]
 */
interface DialectRule {
  pattern: RegExp;
  replacement: string;
}

/**
 * Hessische Dialekt-Regeln für RÜHL
 * Inspiriert von Markus Rühl's Sprachstil
 */
const HESSISCH_RULES: DialectRule[] = [
  // Grundlegende Ersetzungen
  { pattern: /\bnicht\b/gi, replacement: 'net' },
  { pattern: /\bdas\b/gi, replacement: 'des' },
  { pattern: /\bwas\b/gi, replacement: 'was' }, // Bleibt gleich, aber...
  { pattern: /\betwas\b/gi, replacement: 'ebbes' },
  { pattern: /\bein bisschen\b/gi, replacement: 'e bissje' },
  { pattern: /\bein wenig\b/gi, replacement: 'e bissje' },
  { pattern: /\bauch\b/gi, replacement: 'aa' },
  { pattern: /\bjetzt\b/gi, replacement: 'jetzt' }, // Kann auch "jetzerd" sein
  { pattern: /\bheute\b/gi, replacement: 'heut' },
  { pattern: /\baber\b/gi, replacement: 'awwer' },
  { pattern: /\bwirklich\b/gi, replacement: 'wirklich' }, // Kann auch "werklich" sein
  { pattern: /\bkein\b/gi, replacement: 'kää' },
  { pattern: /\bkeine\b/gi, replacement: 'kää' },
  { pattern: /\bkeinen\b/gi, replacement: 'kään' },
  
  // Verbformen
  { pattern: /\bhaben\b/gi, replacement: 'hawwe' },
  { pattern: /\bhast\b/gi, replacement: 'hascht' },
  { pattern: /\bhat\b/gi, replacement: 'hat' }, // Oft gleich
  { pattern: /\bgehen\b/gi, replacement: 'gehe' },
  { pattern: /\bgehst\b/gi, replacement: 'gehscht' },
  { pattern: /\bmachen\b/gi, replacement: 'mache' },
  { pattern: /\bmachst\b/gi, replacement: 'machscht' },
  { pattern: /\bsagen\b/gi, replacement: 'sage' },
  { pattern: /\bsagst\b/gi, replacement: 'sagscht' },
  { pattern: /\bkannst\b/gi, replacement: 'kannscht' },
  { pattern: /\bmusst\b/gi, replacement: 'musscht' },
  { pattern: /\bwillst\b/gi, replacement: 'willscht' },
  
  // Endungen
  { pattern: /\bich\b/gi, replacement: 'isch' },
  { pattern: /\bdich\b/gi, replacement: 'disch' },
  { pattern: /\bmich\b/gi, replacement: 'misch' },
  
  // Fragewörter
  { pattern: /\bwarum\b/gi, replacement: 'warum' }, // Kann "worum" sein
  { pattern: /\bwo\b/gi, replacement: 'wo' },
  
  // Artikel und Pronomen
  { pattern: /\bder\b/gi, replacement: 'der' }, // Oft gleich
  { pattern: /\bdie\b/gi, replacement: 'die' }, // Oft gleich
  { pattern: /\bein\s+(?=[A-ZÄÖÜ])/gi, replacement: 'e ' }, // "ein Training" → "e Training"
  { pattern: /\beine\s+/gi, replacement: 'e ' },
  { pattern: /\beinen\s+/gi, replacement: 'en ' },
  
  // Typische Füllwörter/Verstärker (sehr sparsam)
  { pattern: /\bsehr\s+gut\b/gi, replacement: 'richtig gut' },
  { pattern: /\bwirklich\s+gut\b/gi, replacement: 'echt gut' },
];

/**
 * Hessische Interjektionen/Ausrufe für RÜHL
 * Diese werden NICHT automatisch eingefügt, sondern sollten
 * über phrase_frequency gesteuert werden
 */
export const HESSISCH_INTERJECTIONS = [
  'Ei gude wie!',
  'Des is doch kä Problem!',
  'Alla hopp!',
  'Gude!',
  'Ei jo!',
  'Was machscht du?',
  'Des geht!',
  'Komm, pack mer\'s!',
];

/**
 * Wendet Dialekt-Regeln auf einen Text an
 * 
 * @param text - Der Original-Text (LLM-Antwort)
 * @param dialect - Der anzuwendende Dialekt (z.B. 'hessisch')
 * @param intensity - Intensität der Transformation (0.0-1.0), Standard 0.5
 * @returns Der transformierte Text
 */
export function applyDialect(
  text: string,
  dialect: string | null,
  intensity: number = 0.5
): string {
  // Kein Dialekt oder leerer Text → Original zurückgeben
  if (!dialect || !text || text.trim() === '') {
    return text;
  }
  
  // Normalisiere den Dialekt-Namen
  const normalizedDialect = dialect.toLowerCase().trim();
  
  // Wähle die passenden Regeln
  let rules: DialectRule[];
  
  switch (normalizedDialect) {
    case 'hessisch':
    case 'hesse':
    case 'frankfurterisch':
      rules = HESSISCH_RULES;
      break;
    default:
      // Unbekannter Dialekt → Original zurückgeben
      console.log(`[Dialect] Unknown dialect: ${dialect}, returning original text`);
      return text;
  }
  
  // Intensitäts-basierte Anwendung
  // Bei niedriger Intensität nur einen Teil der Regeln anwenden
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  const rulesToApply = Math.max(1, Math.round(rules.length * clampedIntensity));
  const selectedRules = rules.slice(0, rulesToApply);
  
  // Wende die Regeln an
  let result = text;
  
  for (const rule of selectedRules) {
    result = result.replace(rule.pattern, (match) => {
      // Preserve case of first letter
      if (match[0] === match[0].toUpperCase()) {
        return rule.replacement.charAt(0).toUpperCase() + rule.replacement.slice(1);
      }
      return rule.replacement;
    });
  }
  
  return result;
}

/**
 * Prüft ob ein Dialekt unterstützt wird
 */
export function isDialectSupported(dialect: string | null): boolean {
  if (!dialect) return false;
  
  const supported = ['hessisch', 'hesse', 'frankfurterisch'];
  return supported.includes(dialect.toLowerCase().trim());
}

/**
 * Gibt alle unterstützten Dialekte zurück
 */
export function getSupportedDialects(): string[] {
  return ['hessisch'];
}

/**
 * Wendet einen "sanften" Dialekt an - nur die häufigsten Ersetzungen
 * Gut für natürlichere Ergebnisse
 */
export function applySoftDialect(text: string, dialect: string | null): string {
  return applyDialect(text, dialect, 0.3);
}

/**
 * Wendet einen "starken" Dialekt an - alle Ersetzungen
 * Kann zu sehr starkem Dialekt führen
 */
export function applyStrongDialect(text: string, dialect: string | null): string {
  return applyDialect(text, dialect, 0.8);
}
