

# ARES Systemarchitektur-Analyse: Erkannte Inkonsistenzen

## Zusammenfassung

Nach tiefgehender Analyse der ARES-Architektur wurden **7 kritische Inkonsistenzen** zwischen den Hauptmodulen identifiziert. Diese führen zu inkonsistentem Verhalten je nachdem, welcher Codepfad genutzt wird.

---

## Erkannte Inkonsistenzen

### 1. Response Budget Calculator fehlt im Streaming

| Modul | Status | Auswirkung |
|-------|--------|------------|
| `coach-orchestrator-enhanced` | ✓ Hat `calculateResponseBudget()` | Dynamische Antwortlänge basierend auf Topic-Expertise |
| `ares-streaming` | ✗ Fehlt komplett | Antwortet immer mit gleicher Länge unabhängig von User-Expertise |

**Problem:** Wenn ein User bereits "Expert" bei Creatin ist, sollte ARES nicht erneut die Grundlagen erklären. Im Streaming-Modus fehlt diese Logik komplett.

**Betroffene Dateien:**
- `ares-streaming/index.ts` importiert `calculateResponseBudget` NICHT
- `intelligentPromptBuilder.ts` Zeilen 291-296 hat die Integration

---

### 2. Topic State Machine nicht im Streaming

| Modul | Status | Auswirkung |
|-------|--------|------------|
| `coach-orchestrator-enhanced` | ✓ Hat Topic State Machine | Erkennt Topic-Wechsel, pausierte Themen, Follow-up Prompts |
| `ares-streaming` | ✗ Fehlt komplett | Kein Topic-Tracking, keine natürlichen Übergänge |

**Problem:** ARES kann im Streaming nicht sagen "Wir hatten das Thema Protein vor 2 Tagen angefangen - willst du weitermachen?"

**Imports fehlen in `ares-streaming`:**
```typescript
// Diese fehlen komplett:
import {
  processMessage as processTopicMessage,
  getPausedTopicsForFollowup,
  generateReturnPrompt,
  buildTopicContextPrompt,
} from '../_shared/topic/index.ts';
```

---

### 3. Gamification/XP-System nicht im Streaming

| Modul | Status | Auswirkung |
|-------|--------|------------|
| `coach-orchestrator-enhanced` | ✓ Hat `awardInteractionXP()` | XP für Fragen, Tool-Nutzung, Streak-Boni |
| `ares-streaming` | ✗ Fehlt komplett | Keine XP vergeben bei Streaming-Interaktionen |

**Problem:** Users die primär den Streaming-Modus nutzen (die meisten!) bekommen keine Gamification-Rewards.

---

### 4. Topic Repetition Detection fehlt im Streaming

| Modul | Status | Auswirkung |
|-------|--------|------------|
| `coach-orchestrator-enhanced` | ✓ Hat `extractTopics()`, `loadTopicHistory()`, `updateTopicStats()` | Erkennt wenn Thema >3000 chars in 24h besprochen wurde |
| `ares-streaming` | ✗ Fehlt komplett | "Groundhog Day" - wiederholt dieselben Erklärungen |

**Betroffene Imports:**
```typescript
// Diese fehlen in ares-streaming:
import {
  extractTopics,
  loadTopicHistory,
  updateTopicStats,
  findPrimaryTopic,
  buildTopicExpertiseSection,
} from '../_shared/context/topicTracker.ts';
```

---

### 5. Elefantengedächtnis (Token-Budgeted History) fehlt im Streaming

| Modul | Status | Auswirkung |
|-------|--------|------------|
| `coach-orchestrator-enhanced` | ✓ Hat `buildTokenBudgetedHistory()` | Newest 2000 tokens + 500-token Rolling Summary |
| `ares-streaming` | ✗ Nutzt nur letzte 12 Nachrichten | Verliert Kontext bei langen Sessions |

**Problem:** Im Orchestrator wird bei >40 Nachrichten automatisch eine Rolling Summary generiert. Im Streaming fehlt diese Logik komplett.

---

### 6. Prompt-Builder hat unterschiedliche Inhalte

**`buildIntelligentSystemPrompt()` (Orchestrator) enthält:**
- Mood Detection + Response Guidelines (✓ Zeilen 272-280)
- Topic Expertise Section (✓ Zeilen 284-288)
- Response Budget Section (✓ Zeilen 291-296)
- Reality Audit Prompt (✓ Zeilen 298-336)
- Evidenz-Anforderung mit Studien-Zitaten (✓)
- Blutbild-Protokoll mit konkreten Markern (✓)
- Vorberechnete Metriken (TDEE, Protein) (✓)

**`buildStreamingSystemPrompt()` (Streaming) enthält:**
- Greeting-Suppression (✓ Zeilen 390-419)
- Reality Audit (✓ Zeilen 422-450)
- Response Rules (✓ Zeilen 453-472)
- Vision Instructions (✓)

**FEHLT im Streaming:**
- ✗ Mood Detection Prompt Section
- ✗ Topic Expertise Section
- ✗ Response Budget Constraints
- ✗ Evidenz-Anforderung (Studien-Zitate)
- ✗ Blutbild-Protokoll Referenzen
- ✗ Vorberechnete Metriken
- ✗ Ausführliche Coaching-Regeln

---

### 7. RAG/Knowledge Loading unterschiedlich

| Modul | Status | Auswirkung |
|-------|--------|------------|
| `coach-orchestrator-enhanced` | Hat `fetchRagSources()` mit Embeddings | Semantische Suche in Wissensdatenbank |
| `ares-streaming` | Hat `loadRelevantKnowledge()` | Keyword-basierte Suche (weniger präzise) |

**Problem:** Der Orchestrator nutzt OpenAI Embeddings für RAG, das Streaming nutzt eine simplere Keyword-Suche.

---

## Betroffene Module (Priorität)

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    ARES SYSTEMARCHITEKTUR                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  coach-orchestrator-enhanced (Blocking)                              │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Narrative Detection      ✓ Response Budget                   │ │
│  │ ✓ Topic State Machine      ✓ Gamification XP                   │ │
│  │ ✓ Token-Budgeted History   ✓ Topic Repetition                  │ │
│  │ ✓ Mood Detection           ✓ RAG Embeddings                    │ │
│  │ ✓ Greeting Suppression     ✓ Evidence Requirements             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ares-streaming (SSE)                                                │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Narrative Detection      ✗ Response Budget                   │ │
│  │ ✗ Topic State Machine      ✗ Gamification XP                   │ │
│  │ ✗ Token-Budgeted History   ✗ Topic Repetition                  │ │
│  │ ✗ Mood Detection           ✗ RAG Embeddings                    │ │
│  │ ✓ Greeting Suppression     ✗ Evidence Requirements             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ares-research (SSE)                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Persona TL;DR Wrapper    ✗ Keine ARES Context Integration    │ │
│  │ ✗ Keine Memory             ✗ Keine Health Context              │ │
│  │ ✗ Keine Bloodwork          ✗ Keine Protocol Awareness          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Empfohlene Priorisierung

### Phase A: Kritische Parität (Sofort)

1. **Response Budget → Streaming** (verhindert Wiederholungen)
2. **Topic Tracking → Streaming** (verhindert "Groundhog Day")
3. **Gamification → Streaming** (Users verlieren XP)

### Phase B: Wichtige Parität (Kurzfristig)

4. **Token-Budgeted History** (lange Sessions verlieren Kontext)
5. **Mood Detection im Streaming Prompt**
6. **Evidence Requirements im Streaming Prompt**

### Phase C: Architektur-Entscheidung (Mittelfristig)

**Option A: Streaming als "abgespeckte" Version akzeptieren**
- Pro: Schneller, weniger Latenz
- Con: Unterschiedliches Verhalten verwirrt User

**Option B: Streaming auf volle Parität bringen**
- Pro: Konsistentes Verhalten
- Con: Höhere Latenz, mehr Komplexität

**Option C: Unified Prompt Builder**
- Einen einzigen `buildAresSystemPrompt()` der von beiden Modulen genutzt wird
- Pro: Garantierte Konsistenz, weniger Code-Duplikation
- Con: Refactoring-Aufwand

---

## Technische Umsetzung (Phase A)

### 1. Response Budget in Streaming integrieren

**Datei:** `supabase/functions/ares-streaming/index.ts`

```typescript
// Zeile ~55 - Import hinzufügen
import {
  calculateResponseBudget,
  type BudgetResult,
  type BudgetFactors,
} from '../_shared/ai/responseBudget.ts';

import {
  extractTopics,
  loadTopicHistory,
  findPrimaryTopic,
  type TopicContext,
} from '../_shared/context/topicTracker.ts';
```

**Nach Semantic Analysis (Zeile ~860):**
```typescript
// PHASE 2e: Response Budget berechnen
let responseBudget: BudgetResult | null = null;
if (semanticAnalysis) {
  const budgetFactors: BudgetFactors = {
    userMessageLength: text.length,
    primaryTopic: null, // TODO: Load from topic history
    intent: semanticAnalysis.intent,
    detailLevel: semanticAnalysis.required_detail_level,
    timeOfDay: getTimeOfDay() === 'evening' ? 'evening' : 'day',
  };
  responseBudget = calculateResponseBudget(budgetFactors);
}
```

### 2. Gamification in Streaming integrieren

**Nach Response-Streaming (ca. Zeile 1100):**
```typescript
// PHASE 6: Gamification - Award XP
EdgeRuntime.waitUntil((async () => {
  try {
    const xpResult = await awardInteractionXP(supaSvc, userId, {
      toolsUsed: [], // Streaming hat keine Tools
      messageText: text,
      streakDays: healthContext?.basics?.streak || 0,
    });
    if (xpResult) {
      console.log('[ARES-STREAM] XP awarded:', xpResult.totalXP);
    }
  } catch (e) {
    console.warn('[ARES-STREAM] XP award failed:', e);
  }
})());
```

### 3. Topic Tracking Grundlagen hinzufügen

**Imports erweitern:**
```typescript
import {
  extractTopics,
  loadTopicHistory,
  updateTopicStats,
  findPrimaryTopic,
  buildTopicExpertiseSection,
} from '../_shared/context/index.ts';
```

**Nach Context-Loading:**
```typescript
// PHASE 2f: Topic Analysis
const detectedTopics = extractTopics(text);
const topicContexts = new Map<string, TopicContext>();

if (detectedTopics.length > 0) {
  const topicHistory = await loadTopicHistory(userId, supaSvc, detectedTopics);
  for (const [topic, context] of topicHistory) {
    topicContexts.set(topic, context);
  }
}

// Übergebe an buildStreamingSystemPrompt
```

---

## Betroffene Dateien (Zusammenfassung)

| Datei | Aktion | Aufwand |
|-------|--------|---------|
| `supabase/functions/ares-streaming/index.ts` | **MAJOR EDIT** | Hoch |
| `supabase/functions/_shared/context/streamingPromptBuilder.ts` | **CREATE** (optional) | Mittel |

---

## Erwartetes Ergebnis

### Vorher (Inkonsistentes Verhalten)

```
Orchestrator: "Du bist Expert bei Creatin - kurz: 5g täglich, fertig."
Streaming:    "Creatin Monohydrat ist ein... [500 Wort Erklärung]"
```

### Nachher (Konsistentes Verhalten)

```
Beide: "Du bist Expert bei Creatin - kurz: 5g täglich, fertig."
```

Beide Module reagieren gleich auf Expertise-Level, Topic-Historie, und Mood-Kontext.

