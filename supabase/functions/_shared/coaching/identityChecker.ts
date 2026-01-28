/**
 * Identity Checker - Protocol Mode als Identitäts-Standard
 * 
 * Nutzt den protocol_mode des Users als Ankerpunkt für die erwartete Verhaltensstandards.
 * Im Reality Audit Modus referenziert ARES diesen Standard.
 */

export type ProtocolMode = 'natural' | 'enhanced' | 'clinical' | 'enhanced,clinical';

export interface IdentityContext {
  /** Der Protocol Mode des Users */
  protocolMode: ProtocolMode;
  /** Menschenlesbares Label für den Modus */
  label: string;
  /** Beschreibung der erwarteten Standards */
  description: string;
  /** Challenge-Baseline (wie streng bei Abweichungen) */
  challengeBaseline: number;
  /** Prompt-Fragment für den Reality Audit */
  promptFragment: string;
}

/**
 * Protocol Mode Konfigurationen
 */
const PROTOCOL_CONFIGS: Record<ProtocolMode, Omit<IdentityContext, 'protocolMode'>> = {
  natural: {
    label: 'Fundament-Builder',
    description: 'Du arbeitest an deinem Fundament. Solide Basis, nachhaltige Gewohnheiten.',
    challengeBaseline: 5,
    promptFragment: 'Du bist im Natural Mode: Fundament und Gewohnheiten stehen im Fokus. Moderate Erwartungen, aber konsequent.',
  },
  enhanced: {
    label: 'Advanced Protocol',
    description: 'Du nutzt Advanced-Protokolle (GLP-1, Peptide). Höhere Investment, höhere Erwartungen.',
    challengeBaseline: 7,
    promptFragment: 'Du bist im Enhanced Mode: Advanced-Protokolle erfordern Advanced-Disziplin. Du investierst – dein Verhalten muss matchen.',
  },
  clinical: {
    label: 'Elite Athlete',
    description: 'Du bist im klinischen Elite-Protokoll (TRT/HRT). Keine Ausreden, Elite-Standards.',
    challengeBaseline: 9,
    promptFragment: 'Du bist im Clinical Mode: Elite-Protokoll = Elite-Disziplin. Keine Ausreden. Performance-Excellence erwartet.',
  },
  'enhanced,clinical': {
    label: 'Peak Performance',
    description: 'Du nutzt das volle Stack: Enhanced + Clinical. Maximum Protocol, Maximum Accountability.',
    challengeBaseline: 9,
    promptFragment: 'Du bist im Peak Performance Mode: Volles Protocol-Stack = maximale Verantwortung. Keine Ausreden, keine Kompromisse.',
  },
};

/**
 * Lädt den Identity Context basierend auf dem protocol_mode
 * 
 * @param protocolMode - Der protocol_mode aus dem User-Profil (z.B. "natural", "enhanced,clinical")
 * @returns IdentityContext mit Label, Description, Challenge-Baseline
 */
export function getIdentityContext(protocolMode: string | null | undefined): IdentityContext {
  // Normalisiere den Mode
  const normalizedMode = normalizeProtocolMode(protocolMode);
  
  const config = PROTOCOL_CONFIGS[normalizedMode];
  
  return {
    protocolMode: normalizedMode,
    ...config,
  };
}

/**
 * Normalisiert den protocol_mode String
 */
function normalizeProtocolMode(mode: string | null | undefined): ProtocolMode {
  if (!mode) return 'natural';
  
  const lower = mode.toLowerCase().trim();
  
  // Check für Combined Mode
  if (lower.includes('enhanced') && lower.includes('clinical')) {
    return 'enhanced,clinical';
  }
  
  // Check für einzelne Modi
  if (lower === 'clinical') return 'clinical';
  if (lower === 'enhanced') return 'enhanced';
  
  return 'natural';
}

/**
 * Generiert den Identity-Teil für den Reality Audit Prompt
 */
export function buildIdentityPromptSection(identity: IdentityContext): string {
  return `
== USER IDENTITY & PROTOCOL ==
Mode: ${identity.label.toUpperCase()} (${identity.protocolMode})
Standard: ${identity.description}
${identity.promptFragment}
`;
}

/**
 * Generiert den Reality Audit Prompt für den erkannten Excuse-Typ
 */
export function buildRealityAuditPrompt(
  identity: IdentityContext,
  excuseType: string,
  originalClaim: string
): string {
  return `
== REALITY AUDIT AKTIV ==
ERKANNTE NARRATIVE: ${excuseType}
USER-AUSSAGE: "${originalClaim}"
USER IDENTITY: ${identity.label} (${identity.protocolMode})

### DEINE REAKTION (genau diese Reihenfolge):
1. ERGEBNIS-CHECK: Nenne das konkrete Ergebnis (z.B. "500kcal über Ziel", "Training verpasst")
2. STORY-BUST: Hinterfrage die Narrative sachlich und mit Fakten
3. IDENTITÄTS-REFERENZ: "Dein ${identity.label}-Protokoll ist nicht kompatibel mit [Verhalten]"
4. SYSTEM-FRAGE: Frage nach dem Prozess-Fix für das nächste Mal
5. BRÜCKE ZURÜCK: Beende mit aufmunterndem Closer + Emoji ("Aber hey, Haken dran. Morgen rocken wir. 💪")

### VERBOTEN in diesem Modus:
- "Ist schon okay", "Sei nicht so hart zu dir"
- "Ich verstehe" OHNE sofortige Korrektur
- Therapeuten-Sprache ("Wie fühlst du dich dabei?")
- Ausreden als valide Gründe akzeptieren

### WICHTIG - DAS GUMMIBAND:
Nach dem Reality Check SOFORT zurück zu Friend-Modus!
Der Audit-Teil ist kurz und präzise, dann wieder warm und aufmunternd.
`;
}

/**
 * Lädt den protocol_mode aus dem User-Profil via Supabase
 * 
 * @param supaClient - Supabase Client
 * @param userId - User ID
 * @returns Der protocol_mode String oder null
 */
export async function loadUserProtocolMode(
  supaClient: any,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supaClient
      .from('profiles')
      .select('protocol_mode')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.warn('[IDENTITY] Failed to load protocol_mode:', error.message);
      return null;
    }
    
    return data?.protocol_mode || null;
  } catch (err) {
    console.warn('[IDENTITY] Exception loading protocol_mode:', err);
    return null;
  }
}
