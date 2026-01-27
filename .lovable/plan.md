

# AI-Native Persona Adaptation: Semantic Router Integration

## Ueberblick

Diese Implementierung integriert den bestehenden **Semantic Router** (`semanticRouter.ts`) in den `coach-orchestrator-enhanced`, um Lesters "Wissenschafts-Dial" dynamisch zu steuern. Anstatt Regex oder Wort-Zaehlerei zu nutzen, verwendet das System die KI-Intelligenz des Semantic Routers, um die gewuenschte Antwort-Tiefe zu erkennen.

## Architektur-Fluss

```text
User: "Ok, passt"
      │
      ▼
┌─────────────────────────────────────┐
│ loadUserPersonaWithContext()        │
│   │                                 │
│   ├─ text.length < 200?             │
│   │   │                             │
│   │   └─► analyzeConversationContext│
│   │       (Gemini 2.5 Flash)        │
│   │       ─► intent=confirmation    │
│   │       ─► detail=ultra_short     │
│   │                                 │
│   └─► resolvePersonaWithContext()   │
│       mit detailLevel               │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│ resolvePersonaWithContext()         │
│   detailLevel === 'ultra_short'     │
│   ─► depth: 10 * 0.3 = 3            │
│   ─► opinion: 9 * 0.5 = 5           │
│   Modifier: 'ultra_short_reduction' │
└─────────────────────────────────────┘
      │
      ▼
Lester: "Top! Was steht als naechstes an?"
        (statt 3 Absaetze Wissenschaft)
```

---

## Schritt 1: Types erweitern

**Datei:** `supabase/functions/_shared/persona/types.ts`

Das Interface `PersonaResolutionContext` bekommt zwei neue Felder:

```typescript
export interface PersonaResolutionContext {
  topic?: string;
  mood?: 'positive' | 'neutral' | 'frustrated' | 'overwhelmed';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  userTenure?: number;
  // NEU: Semantic Router AI-Native Detection
  detailLevel?: 'ultra_short' | 'concise' | 'moderate' | 'extensive';
  intent?: string;
}
```

---

## Schritt 2: Resolution Logic mit Depth-Modulation

**Datei:** `supabase/functions/_shared/persona/promptBuilder.ts`

In `resolvePersonaWithContext()` (Zeile 247-309) wird ein neuer Block am Anfang eingefuegt, der basierend auf `detailLevel` die Dials anpasst:

### Modulations-Logik:

| Detail Level | Depth Multiplier | Opinion Multiplier | Effekt bei Lester (depth=10) |
|--------------|------------------|--------------------|-----------------------------|
| `ultra_short` | 0.3 (Min 2) | 0.5 (Min 2) | depth=3, opinion=5 |
| `concise` | 0.5 (Min 3) | 0.6 (Min 3) | depth=5, opinion=6 |
| `moderate` | 0.7 (Min 4) | 0.8 (Min 4) | depth=7, opinion=7 |
| `extensive` | 1.0 (keine Reduktion) | 1.0 | depth=10, opinion=9 |

### Code-Aenderung:

```typescript
// In resolvePersonaWithContext(), VOR den topic-basierten Anpassungen:

// AI-Native Detail Level Modulation (Semantic Router Integration)
if (context.detailLevel) {
  switch (context.detailLevel) {
    case 'ultra_short':
      // Bestaetigung: Wissenschafts-Regler stark runter
      baseDials.depth = Math.max(2, Math.round(baseDials.depth * 0.3));
      baseDials.opinion = Math.max(2, Math.round(baseDials.opinion * 0.5));
      appliedModifiers.push('semantic_ultra_short');
      break;
    case 'concise':
      // Kurze Antwort: Moderate Reduktion
      baseDials.depth = Math.max(3, Math.round(baseDials.depth * 0.5));
      baseDials.opinion = Math.max(3, Math.round(baseDials.opinion * 0.6));
      appliedModifiers.push('semantic_concise');
      break;
    case 'moderate':
      // Standard: Leichte Reduktion fuer Balance
      baseDials.depth = Math.max(4, Math.round(baseDials.depth * 0.7));
      baseDials.opinion = Math.max(4, Math.round(baseDials.opinion * 0.8));
      appliedModifiers.push('semantic_moderate');
      break;
    case 'extensive':
      // Deep Dive: Volle Wissenschafts-Power!
      // Keine Reduktion - Lester darf voll aufdrehen
      appliedModifiers.push('semantic_extensive_full');
      break;
  }
}
```

---

## Schritt 3: Orchestrator Integration

**Datei:** `supabase/functions/coach-orchestrator-enhanced/index.ts`

### 3a. Neue Imports (nach Zeile 83):

```typescript
// Phase 10: Semantic Router for AI-Native Complexity Detection
import {
  analyzeConversationContext,
  getDetailLevelInstruction,
  type ConversationAnalysis,
  type DetailLevel,
} from '../_shared/ai/semanticRouter.ts';
```

### 3b. loadUserPersonaWithContext erweitern (Zeile 1095-1129):

Die Funktion wird erweitert, um den Semantic Router aufzurufen und das Ergebnis in den PersonaResolutionContext zu integrieren:

**Aenderungen:**
1. Zusaetzlichen Parameter `lastBotMessage` fuer Kontext
2. Semantic Router Aufruf wenn text.length < 200
3. detailLevel und intent in resolutionContext einfuegen
4. Rueckgabe um semanticAnalysis erweitern

```typescript
async function loadUserPersonaWithContext(
  userId: string,
  moodContext: UserMoodContext,
  text: string,
  lastBotMessage?: string | null  // NEU
): Promise<{ 
  persona: CoachPersona | ResolvedPersona; 
  personaPrompt: string;
  semanticAnalysis?: ConversationAnalysis;  // NEU
}> {
  try {
    const persona = await loadUserPersona(userId);
    
    // NEU: Semantic Router fuer AI-Native Complexity Detection
    let semanticAnalysis: ConversationAnalysis | null = null;
    
    if (text.length < 200) {  // Latenz-Optimierung: Skip bei langen Texten
      try {
        semanticAnalysis = await analyzeConversationContext(text, lastBotMessage, {
          timeout: 2500,
          fallbackOnError: true
        });
        console.log('[PERSONA-SEMANTIC] Analysis: intent=' + semanticAnalysis.intent + 
                    ', detail=' + semanticAnalysis.required_detail_level);
      } catch (e) {
        console.warn('[PERSONA-SEMANTIC] Analysis failed, continuing without:', e);
      }
    }
    
    // Build resolution context MIT Semantic Router Ergebnis
    const resolutionContext: PersonaResolutionContext = {
      mood: detectMoodFromContext(moodContext, text),
      timeOfDay: getTimeOfDayForPersona(),
      userTenure: moodContext.streak || 0,
      topic: detectTopicFromText(text),
      // NEU: Semantic Router Ergebnis
      detailLevel: semanticAnalysis?.required_detail_level,
      intent: semanticAnalysis?.intent,
    };
    
    const resolvedPersona = resolvePersonaWithContext(persona, resolutionContext);
    console.log('[PERSONA] Applied modifiers: ' + (resolvedPersona.appliedModifiers.join(', ') || 'none'));
    
    const personaPrompt = buildPersonaPrompt(resolvedPersona, resolutionContext);
    
    return { persona: resolvedPersona, personaPrompt, semanticAnalysis };
  } catch (error) {
    // Fallback...
  }
}
```

### 3c. Main Handler Update (Zeile 2559-2567):

Die lastBotMessage aus der Conversation History extrahieren und uebergeben:

```typescript
// Letzte Bot-Nachricht fuer Semantic Router Kontext
const lastBotMessage = rawConversations?.find(m => m.message_role === 'assistant')?.message_content || null;

const { persona: userPersona, personaPrompt, semanticAnalysis } = await loadUserPersonaWithContext(
  user.id,
  userMoodContext,
  text,
  lastBotMessage  // NEU
).catch((e) => {
  console.warn('[ARES-WARN] loadUserPersonaWithContext failed:', e);
  return { persona: null, personaPrompt: '', semanticAnalysis: undefined };
});
```

### 3d. Detail Level Instruction zum Prompt hinzufuegen (Optional, fuer extra Sicherheit):

Im `buildAresPrompt` kann die Detail-Level-Anweisung zusaetzlich eingefuegt werden:

```typescript
// In buildAresPrompt, wenn semanticAnalysis verfuegbar:
if (semanticAnalysis) {
  const lengthInstruction = getDetailLevelInstruction(
    semanticAnalysis.required_detail_level,
    semanticAnalysis.intent
  );
  // Vor den System-Prompt prependen
}
```

---

## Ergebnis-Beispiele

| User sagt | Semantic Analysis | Lester Depth | Lester-Antwort |
|-----------|-------------------|--------------|----------------|
| "Ok, danke" | intent=confirmation, detail=ultra_short | 3 | "Top! Was steht als naechstes an?" |
| "Was essen?" | intent=question, detail=concise | 5 | "Protein-Snack wuerd ich sagen. Quark oder Eier?" |
| "Hab Hunger" | intent=followup, detail=concise | 5 | "Trink erstmal ein Glas Wasser." |
| "Warum ist Schlaf wichtig?" | intent=deep_dive, detail=extensive | 10 | *Volle Wissenschafts-Erklaerung mit Studien* |

---

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `supabase/functions/_shared/persona/types.ts` | `detailLevel` + `intent` zu PersonaResolutionContext |
| `supabase/functions/_shared/persona/promptBuilder.ts` | Depth-Modulation in resolvePersonaWithContext |
| `supabase/functions/coach-orchestrator-enhanced/index.ts` | Semantic Router Import + Integration |

---

## Vorteile dieser Loesung

| Aspekt | Regex-Ansatz | AI-Native (Semantic Router) |
|--------|--------------|----------------------------|
| "Warum?" erkennen | 1 Wort = "kurz" | Erkennt als deep_dive |
| "Ok ne passt" | Unklar | Erkennt als confirmation |
| Kontext-Awareness | Keine | Nutzt lastBotMessage |
| Latenz | 0ms | ~150-300ms (Fast-Path) / ~400ms (LLM) |
| Wartbarkeit | Regex pflegen | Prompt anpassen |

Der Semantic Router nutzt bereits einen **Fast-Path** fuer bekannte Patterns ("ok", "danke", etc.) mit 0ms Latenz. Nur bei unklaren Nachrichten wird das LLM (Gemini 2.5 Flash) aufgerufen.

