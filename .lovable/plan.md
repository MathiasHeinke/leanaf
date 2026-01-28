

# Fix: ARES Streaming - Fehlende Situational Intelligence

## Diagnose

Die `ares-streaming` Edge Function ist eine **abgespeckte Version** des `coach-orchestrator-enhanced`. Zwei kritische Features fehlen vollstaendig:

### Problem 1: Greeting-Suppression fehlt

**intelligentPromptBuilder.ts (Zeilen 240-267):**
```text
== KRITISCH: GESPRAECHSFLUSS ==
Dies ist KEINE neue Session - ihr seid bereits im Gespraech!

VERBOTEN am Antwort-Anfang:
- Begruessungen: "Guten Morgen", "Hey", "Hallo", "Moin", "Hi"
- Anreden mit Name: "Also Mathias...", "Okay Mathias..."
- Session-Opener: "Schoen dass du fragst", "Gute Frage"
- Energie-Intros: "Schnall dich an", "Los gehts"
```

**ares-streaming `buildStreamingSystemPrompt()` (Zeilen 293-407):**
- Hat Conversation History ✓
- Hat Style Override ✓  
- Hat KEINE GESPRAECHSFLUSS-Regeln ✗
- Keine dynamische Vertrautheit ✗

**Ergebnis:** ARES sagt "Guten Morgen, Mathias!" obwohl ihr bereits im Gespraech seid.

### Problem 2: Narrative Detection fehlt

**coach-orchestrator-enhanced (Zeilen 111-119, 1153-1217):**
```typescript
import { detectNarrative, getIdentityContext, ... } from '../_shared/coaching/index.ts';

const narrativeAnalysis = detectNarrative(text);
const identityContext = getIdentityContext(protocolMode);

if (narrativeAnalysis.detected) {
  console.log('[NARRATIVE] Excuse detected: type=' + narrativeAnalysis.excuseType);
}
```
- Importiert detectNarrative() ✓
- Aktiviert Reality Audit bei Excuses ✓
- Gummiband-Prinzip funktioniert ✓

**ares-streaming:**
- Keine Imports von `_shared/coaching/` ✗
- Keine Narrative Detection ✗
- Keine Identity Context ✗
- Kein Reality Audit ✗

**Ergebnis:** "training hat nicht geklappt" triggert keinen Auditor Mode. ARES reagiert als Friend statt Challenge.

---

## Loesung

### Datei: `supabase/functions/ares-streaming/index.ts`

#### Aenderung 1: Imports hinzufuegen (nach Zeile 89)

```typescript
// Phase 11: Situational Intelligence - Reality Audit System (Gummiband-Prinzip)
import {
  detectNarrative,
  getExcuseTypeDescription,
  getIdentityContext,
  buildRealityAuditPrompt,
  type NarrativeAnalysis,
  type IdentityContext,
} from '../_shared/coaching/index.ts';
```

#### Aenderung 2: Narrative Detection aktivieren (nach Zeile 762, nach Semantic Analysis)

Nach der Semantic Analysis wird die Narrative Detection aktiviert:

```typescript
// ═══════════════════════════════════════════════════════════════════
// PHASE 2c: Situational Intelligence - Narrative Detection
// ═══════════════════════════════════════════════════════════════════
const narrativeAnalysis = detectNarrative(text);

// Protocol Mode aus Health Context ableiten
const currentPhase = healthContext?.protocolStatus?.currentPhase ?? 0;
const protocolMode = currentPhase === 0 
  ? 'natural' 
  : currentPhase >= 2 
    ? 'clinical' 
    : 'enhanced';
const identityContext = getIdentityContext(protocolMode);

if (narrativeAnalysis.detected) {
  console.log('[ARES-STREAM] Narrative detected: type=' + narrativeAnalysis.excuseType + 
              ', claim="' + narrativeAnalysis.originalClaim + '"');
  enqueue({ type: 'thinking', step: 'audit', message: 'Reality Check aktiviert...', done: true });
} else if (narrativeAnalysis.isVenting) {
  console.log('[ARES-STREAM] Venting detected (empathy mode)');
} else if (narrativeAnalysis.isHonestAdmission) {
  console.log('[ARES-STREAM] Honest admission detected (no trigger)');
}
```

#### Aenderung 3: buildStreamingSystemPrompt erweitern (Zeilen 293-407)

Die Funktion `buildStreamingSystemPrompt` muss zwei neue Parameter bekommen:

```typescript
function buildStreamingSystemPrompt(
  persona: CoachPersona | ResolvedPersona,
  personaPrompt: string,
  healthContext: UserHealthContext | null,
  knowledgeContext: KnowledgeContext | null,
  bloodworkContext: BloodworkContext | null,
  userInsights: UserInsight[],
  conversationHistory: ConversationMessage[],
  narrativeAnalysis?: NarrativeAnalysis,    // NEU
  identityContext?: IdentityContext          // NEU
): string {
```

#### Aenderung 4: Greeting-Suppression Block einfuegen (nach Zeile 376)

Nach dem Style Override Block kommt die Greeting-Suppression:

```typescript
// ═══════════════════════════════════════════════════════════════════
// GESPRAECHSFLUSS - Keine Begruessungen bei laufender Session
// ═══════════════════════════════════════════════════════════════════
if (conversationHistory.length > 0) {
  parts.push('');
  parts.push('== KRITISCH: GESPRAECHSFLUSS ==');
  parts.push('Dies ist KEINE neue Session - ihr seid bereits im Gespraech!');
  parts.push('');
  parts.push('VERBOTEN am Antwort-Anfang:');
  parts.push('- Begruessungen: "Guten Morgen", "Hey", "Hallo", "Moin", "Hi"');
  parts.push('- Anreden mit Name: "Also Mathias...", "Okay Mathias..."');
  parts.push('- Session-Opener: "Schoen dass du fragst", "Gute Frage"');
  parts.push('- Energie-Intros: "Schnall dich an", "Los gehts", "Lass uns..."');
  parts.push('');
  parts.push('STATTDESSEN - Starte direkt mit dem Inhalt:');
  parts.push('- Bei Fragen: Direkt die Antwort');
  parts.push('- Bei Statements: Direkte Reaktion ("Genau!", "Das stimmt...")');
  parts.push('- Bei Follow-ups: Natuerliche Fortsetzung');
  
  // Dynamische Vertrautheit basierend auf Konversationslaenge
  const msgCount = conversationHistory.length;
  if (msgCount >= 6) {
    parts.push('');
    parts.push('KONVERSATIONS-TIEFE: Intensives Gespraech (6+ Nachrichten)');
    parts.push('Sprich wie ein Freund der seit 10 Minuten mit dir redet.');
    parts.push('Kurze, praegnante Antworten sind OK.');
  } else if (msgCount >= 2) {
    parts.push('');
    parts.push('KONVERSATIONS-TIEFE: Laufendes Gespraech (2-5 Nachrichten)');
    parts.push('Natuerlicher Flow, aber noch nicht ultra-kurz.');
  }
}
```

#### Aenderung 5: Reality Audit Block einfuegen (nach Greeting-Suppression)

```typescript
// ═══════════════════════════════════════════════════════════════════
// REALITY AUDIT - Gummiband-Prinzip (Buddy ↔ Auditor)
// ═══════════════════════════════════════════════════════════════════
if (narrativeAnalysis?.detected && !narrativeAnalysis?.isHonestAdmission) {
  parts.push('');
  parts.push('== REALITY AUDIT AKTIV ==');
  parts.push('');
  parts.push('ERKANNTE NARRATIVE: ' + (narrativeAnalysis.excuseType || 'excuse'));
  parts.push('USER-AUSSAGE: "' + narrativeAnalysis.originalClaim + '"');
  if (identityContext) {
    parts.push('USER IDENTITY: ' + identityContext.label + ' (' + identityContext.protocolMode + ')');
  }
  parts.push('');
  parts.push('### DEINE REAKTION (genau diese Reihenfolge):');
  parts.push('1. ERGEBNIS-CHECK: Nenne das konkrete Ergebnis (zB "Training verpasst")');
  parts.push('2. STORY-BUST: Hinterfrage die Narrative sachlich');
  parts.push('3. IDENTITAETS-REFERENZ: "Dein Protokoll ist nicht kompatibel mit..."');
  parts.push('4. SYSTEM-FRAGE: Frage nach dem Prozess-Fix');
  parts.push('5. BRUECKE ZURUECK: Beende mit aufmunterndem Closer + Emoji');
  parts.push('');
  parts.push('WICHTIG - DAS GUMMIBAND:');
  parts.push('Nach dem Reality Check SOFORT zurueck zu warmem Friend-Modus!');
  parts.push('Der Audit-Teil ist kurz und praezise, dann wieder aufmunternd.');
} else if (narrativeAnalysis?.isVenting) {
  parts.push('');
  parts.push('== EMPATHIE-MODUS ==');
  parts.push('User vented Frustration (ohne Excuse). Sei empathisch!');
  parts.push('Frag nach: "Was war los?" oder "Erzaehl mal."');
  parts.push('KEIN Reality Audit, kein Challenge. Einfach zuhoeren.');
}
```

#### Aenderung 6: Funktionsaufruf aktualisieren (ca. Zeile 768)

Der Aufruf von `buildStreamingSystemPrompt` muss die neuen Parameter enthalten:

```typescript
let baseSystemPrompt = buildStreamingSystemPrompt(
  persona,
  personaPrompt,
  healthContext as UserHealthContext | null,
  knowledgeContext as KnowledgeContext | null,
  bloodworkContext as BloodworkContext | null,
  insightsResult as UserInsight[],
  conversationHistory,
  narrativeAnalysis,    // NEU
  identityContext       // NEU
);
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `supabase/functions/ares-streaming/index.ts` | **EDIT** | Imports + Narrative Detection + Greeting-Suppression + Reality Audit |

---

## Erwartetes Ergebnis

### Vorher (Screenshot)

```
User: "training hat nicht geklappt"

ARES: "Guten Morgen, Mathias! ☕ Okay, tief durchatmen..."
      [Lange wissenschaftliche Erklaerung ohne Challenge]
```

### Nachher

```
User: "training hat nicht geklappt"

ARES: "Okay, Training nicht geschafft - was ist konkret passiert?
       Das ist jetzt der zweite Tag diese Woche ohne mechanischen Reiz.
       Dein Fundament-Protokoll braucht den Trainingsreiz fuer MPS.
       Was muessen wir aendern, damit das morgen klappt? 💪"
```

**Kein Greeting, direkter Einstieg, kurzer Reality Check, dann Bruecke zurueck.**

---

## Technische Details

### Narrative Detection Logik

Die `detectNarrative()` Funktion erkennt:

| Typ | Trigger | Beispiel | ARES Reaktion |
|-----|---------|----------|---------------|
| `excuse_time` | "weil" + Zeit-Keywords | "Konnte nicht, weil keine Zeit" | Reality Audit |
| `excuse_energy` | "weil" + Energie-Keywords | "War zu muede" | Reality Audit |
| `excuse_external` | "weil" + Externe Faktoren | "Chef war schuld" | Reality Audit |
| `rationalization` | Rechtfertigungs-Patterns | "Muss auch mal leben" | Reality Audit |
| `isVenting` | Frustration ohne Excuse | "Mann, war das stressig!" | Empathie |
| `isHonestAdmission` | Ehrliches Eingestaendnis | "Hab's verkackt" | High-Five |

### Identity Context (Gummiband-Kalibrierung)

| Protocol Mode | Challenge Baseline | Beispiel |
|---------------|-------------------|----------|
| `natural` | 5 (moderat) | "Fundament-Builder - Gewohnheiten aufbauen" |
| `enhanced` | 7 (streng) | "GLP-1/Peptide - hoehere Investition = hoehere Erwartung" |
| `clinical` | 9 (Elite) | "TRT/HRT - keine Ausreden, Elite-Standards" |

