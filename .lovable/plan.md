
# ARES Elefantengedächtnis 2.0 - Finaler Implementierungsplan

## Executive Summary

Das aktuelle Memory-System hat kritische Schwächen:

| Problem | Ist-Zustand | Soll-Zustand |
|---------|-------------|--------------|
| **History-Limit** | 2 Stellen: `.limit(20)` und `.limit(30)` | Einheitlich `.limit(50)` + Token-Budget |
| **Rolling Summary** | Existiert in DB, wird IGNORIERT | Aktiv geladen + in Prompt injiziert |
| **Summary Generation** | Keine automatische Generierung | Trigger bei >40 Nachrichten |
| **formatConversationHistory** | Schneidet Responses auf 200 Zeichen | Volle Responses, token-budgetiert |

---

## Architektur-Übersicht

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. LOAD RAW MESSAGES (.limit(50) statt 20/30)                              │
│     + Rolling Summary aus coach_conversation_memory (AKTIVIEREN!)           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. TOKEN-BASED WINDOW (NEU)                                                │
│     Budget: 2000 Token für Recent History                                   │
│     Budget: 500 Token für Rolling Summary                                   │
│     Logik: Neueste zuerst, älteste werden abgeschnitten                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. INTELLIGENT CONTEXT BUILDER                                             │
│     Prompt Structure:                                                       │
│     [Rolling Summary] ~500 Token (komprimierte ältere Gespräche)            │
│     [Recent History] ~2000 Token (neueste Nachrichten)                      │
│     TOTAL: ~2500 Token für Gesprächskontext                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. POST-RESPONSE: Summary Trigger                                          │
│     Wenn rawConversations.length > 40: generateRollingSummary (async)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Token-Based Conversation Window

### Neue Datei: `supabase/functions/_shared/context/conversationWindow.ts`

**Interfaces:**
```typescript
export interface ConversationPair {
  message: string;      // User-Nachricht
  response: string;     // ARES-Antwort
  created_at?: string;  // Timestamp
}

export interface WindowResult {
  pairs: ConversationPair[];    // Ausgewählte Paare (chronologisch)
  totalTokens: number;          // Verbrauchte Token
  trimmedCount: number;         // Abgeschnittene Paare
  rollingSummary: string | null; // Formatierte Summary
}
```

**Konstanten:**
```typescript
const TOKEN_BUDGET_HISTORY = 2000;  // Token für Recent Messages
const TOKEN_BUDGET_SUMMARY = 500;   // Token für Rolling Summary
const CHARS_PER_TOKEN = 4;          // Approximation
const MIN_PAIRS_GUARANTEED = 3;     // Mindestens 3 Paare immer laden
```

**Hauptfunktionen:**
```typescript
// Token-Schätzung
function estimateTokens(text: string): number;

// Hauptlogik: Wählt Nachrichten nach Token-Budget
function buildTokenBudgetedHistory(
  pairs: ConversationPair[],
  rollingSummary: string | null,
  maxTokens?: number
): WindowResult;

// Formatiert für System Prompt
function formatConversationContext(result: WindowResult): string;
```

**Output-Format:**
```markdown
## ZUSAMMENFASSUNG BISHERIGER GESPRÄCHE
[Rolling Summary - komprimierte ältere Gespräche, falls vorhanden]

## GESPRÄCHSVERLAUF (Letzte X Austausche)
**WICHTIG: Du erinnerst dich an diese Gespräche!**

**User**: [Nachricht vollständig]
**ARES**: [Antwort vollständig, nicht abgeschnitten!]
---
```

---

## Phase 2: Rolling Summary Generator

### Änderungen in `coach-orchestrator-enhanced/memory.ts`

**Neue Funktion: `generateRollingSummary`**

```typescript
export async function generateRollingSummary(
  supaClient: SupabaseClient,
  userId: string,
  coachId: string,
  oldMessages: { message: string; response: string }[]
): Promise<void>;
```

**Logik:**
1. Mindestens 10 Paare erforderlich
2. Maximal 20 Paare für Summary (älteste)
3. Lovable AI Gateway (Gemini 3 Flash) für schnelle Zusammenfassung
4. Upsert in `coach_conversation_memory`
5. Maximale Summary-Länge: ~150 Wörter

**Prompt für LLM:**
```
Fasse dieses Coaching-Gespräch präzise zusammen.
Fokus auf: Hauptthemen, wichtige Entscheidungen, User-Ziele, Fortschritte.
Maximal 150 Wörter, auf Deutsch.
```

---

## Phase 3: Orchestrator Integration

### Änderungen in `coach-orchestrator-enhanced/index.ts`

**3.1 Import hinzufügen:**
```typescript
import { 
  buildTokenBudgetedHistory, 
  formatConversationContext,
  type WindowResult 
} from '../_shared/context/conversationWindow.ts';
import { loadRollingSummary, generateRollingSummary } from './memory.ts';
```

**3.2 Limit erhöhen (2 Stellen!):**
- Zeile 1028: `.limit(30)` → `.limit(50)`
- Zeile 2630: `.limit(20)` → `.limit(50)`

**3.3 Rolling Summary laden (nach Zeile 2637):**
```typescript
// NEU: Rolling Summary laden für komprimierte ältere Gespräche
const rollingSummary = await loadRollingSummary(supaSvc, user.id, coachId);
if (rollingSummary) {
  console.log('[ARES-MEMORY] Rolling Summary loaded:', rollingSummary.length, 'chars');
}
```

**3.4 Token-budgetierte History erstellen:**
```typescript
// Statt: conversationHistory direkt nutzen
// NEU: Token-Budgeting anwenden
const windowResult = buildTokenBudgetedHistory(
  conversationHistory,
  rollingSummary,
  2500  // Gesamt-Token-Budget
);

console.log(`[ARES-MEMORY] Window: ${windowResult.pairs.length} pairs, ` +
            `${windowResult.totalTokens} tokens, ${windowResult.trimmedCount} trimmed`);
```

**3.5 Bestehende formatConversationHistory ersetzen:**
Die bestehende Funktion (Zeile 1381-1395) schneidet Responses auf 200 Zeichen ab. 
Wir ersetzen sie durch `formatConversationContext(windowResult)` die:
- Volle Responses behält (Token-Budget kontrolliert Länge)
- Rolling Summary voranstellt

**3.6 Post-Response Summary-Trigger (nach Memory Extraction, ~Zeile 3070):**
```typescript
// Summary-Generation wenn viele Nachrichten akkumuliert
const rawMessageCount = rawConversations?.length || 0;

if (rawMessageCount > 40 && !rollingSummary) {
  // Fire & Forget - blockiert Response nicht
  generateRollingSummary(
    supaSvc,
    user.id,
    coachId,
    conversationHistory.slice(0, 20)  // Älteste 20 Paare
  )
    .then(() => console.log('[ARES-MEMORY] Rolling Summary generated'))
    .catch(err => console.warn('[ARES-MEMORY] Summary generation failed:', err));
}
```

---

## Phase 4: Context Index Export

### Änderungen in `_shared/context/index.ts`

```typescript
// NEU: Token-Based Conversation Window
export {
  buildTokenBudgetedHistory,
  formatConversationContext,
  estimateTokens,
  type ConversationPair,
  type WindowResult,
} from './conversationWindow.ts';
```

---

## Betroffene Dateien

| Datei | Aktion | Änderungen |
|-------|--------|------------|
| `_shared/context/conversationWindow.ts` | **CREATE** | Token-Budget-Logik (~130 LOC) |
| `_shared/context/index.ts` | **EDIT** | +5 neue Exports |
| `coach-orchestrator-enhanced/memory.ts` | **EDIT** | +generateRollingSummary (~50 LOC) |
| `coach-orchestrator-enhanced/index.ts` | **EDIT** | Limits erhöhen, Summary laden, Window anwenden, Trigger |

---

## Sicherheits-Garantien

1. **Minimum-Garantie:** Mindestens 3 Paare werden IMMER geladen (auch bei Budget-Überschreitung)
2. **Maximum-Cap:** Rolling Summary auf 500 Token begrenzt
3. **Fallback:** Bei Fehlern → alte Logik weiter funktionsfähig
4. **Async Summary:** Generierung blockiert Response nicht

---

## Erwartetes Ergebnis

### Vorher (starres 20-Nachrichten-Limit, abgeschnittene Responses):
```
User: "Wie war das mit meiner Übelkeit von vorhin?"
ARES: "Was für eine Übelkeit? Erzähl mir mehr."  
// ❌ Vergessen nach 20+ Nachrichten
```

### Nachher (Token-budgetiert + Rolling Summary):
```
[System Prompt enthält:]
## ZUSAMMENFASSUNG BISHERIGER GESPRÄCHE
Der User klagte über Übelkeit nach der Reta-Injektion. Wir besprachen 
Ingwer und weniger Wasser. Er plant das Training umzustellen.

## GESPRÄCHSVERLAUF (Letzte 12 Austausche)
[Token-optimierte neueste Gespräche, volle Responses]

User: "Wie war das mit meiner Übelkeit von vorhin?"
ARES: "Die Übelkeit heute Morgen nach der Reta-Injektion? 
Wir hatten Ingwer und weniger Wasser um die Injektion besprochen. 
Hat sich das gebessert?"  
// ✅ Erinnert sich!
```

---

## Implementierungsreihenfolge

1. **conversationWindow.ts** erstellen
2. **context/index.ts** Exports aktualisieren
3. **memory.ts** um generateRollingSummary erweitern
4. **coach-orchestrator-enhanced/index.ts**:
   - Imports hinzufügen
   - Limits auf 50 erhöhen (2 Stellen!)
   - Rolling Summary laden
   - Token-budgetierte History erstellen
   - formatConversationHistory durch formatConversationContext ersetzen
   - Post-Response Summary-Trigger
5. **Deploy Edge Functions**
6. **Testen** mit langen Gesprächen (>40 Nachrichten)

---

## Erfolgsmetriken

Nach Implementation tracken:
- **Token-Utilization:** % des 2500-Token-Budgets genutzt
- **Trim-Rate:** Wie oft werden Nachrichten abgeschnitten?
- **Summary-Hit-Rate:** Wie oft wird Rolling Summary geladen?
- **Summary-Generation-Rate:** Wie oft wird neue Summary generiert?
