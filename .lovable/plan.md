

# ARES Response Intelligence System - Finaler Plan

## Ziel

ARES stoppt "Groundhog Day"-Erklärungen. Wenn du Retatrutide zum 50. Mal erwähnst, bekommst du eine Pro-Level Kurzantwort statt Wikipedia.

---

## Architektur-Übersicht

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER MESSAGE                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEMANTIC ROUTER (bestehend)                                                │
│  - Fast-Path Detection (ok, ja, danke)                                      │
│  - LLM Intent Classification                                                │
│  - Output: intent, detail_level, sentiment                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOPIC TRACKER (NEU)                                                        │
│  - Extrahiert Topics aus Nachricht (Regex-Patterns)                         │
│  - Lädt user_topic_history aus DB                                           │
│  - Bestimmt expert_level pro Topic                                          │
│  - Output: TopicContext { topic, level, lastDeepDive, mentionCount }        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESPONSE BUDGET CALCULATOR (NEU)                                           │
│  - Inputs: userMsgLength, topicLevel, lastDeepDive, intent                  │
│  - Logic: Base 1500 * expert_modifier * recency_modifier                    │
│  - Output: max_chars, budget_reason                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  INTELLIGENT PROMPT BUILDER (erweitert)                                     │
│  - Bestehende Sections (Persona, Context, Memory, Mood)                     │
│  + NEU: == USER TOPIC EXPERTISE == Section                                  │
│  + NEU: == RESPONSE BUDGET == Section                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LLM (Gemini Flash/Pro)                                                     │
│  - Respektiert Budget-Constraints                                           │
│  - Nutzt Topic-Expertise für Tiefe                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST-RESPONSE: Topic Stats Update                                          │
│  - Aktualisiert user_topic_history via RPC                                  │
│  - Upgraded expert_level wenn Schwellen erreicht                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema

### Neue Tabelle: `user_topic_history`

```sql
CREATE TABLE public.user_topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mention_count INTEGER DEFAULT 1,
  total_chars_exchanged INTEGER DEFAULT 0,
  last_deep_dive_at TIMESTAMPTZ,
  expert_level TEXT DEFAULT 'novice' 
    CHECK (expert_level IN ('novice', 'intermediate', 'expert')),
  first_mentioned_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, topic)
);

-- Schneller Lookup
CREATE INDEX idx_user_topic_lookup ON user_topic_history(user_id, topic);

-- RLS Policy
ALTER TABLE user_topic_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own topic history" ON user_topic_history
  FOR ALL USING (auth.uid() = user_id);
```

### RPC Funktion: `increment_topic_stats`

```sql
CREATE OR REPLACE FUNCTION increment_topic_stats(
  p_user_id UUID,
  p_topic TEXT,
  p_chars INTEGER,
  p_is_deep_dive BOOLEAN DEFAULT FALSE
) RETURNS void AS $$
DECLARE
  v_current_count INTEGER;
  v_new_level TEXT;
BEGIN
  INSERT INTO user_topic_history (user_id, topic, mention_count, total_chars_exchanged, last_deep_dive_at)
  VALUES (
    p_user_id, 
    p_topic, 
    1, 
    p_chars, 
    CASE WHEN p_is_deep_dive THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, topic) DO UPDATE SET
    mention_count = user_topic_history.mention_count + 1,
    total_chars_exchanged = user_topic_history.total_chars_exchanged + p_chars,
    last_deep_dive_at = CASE 
      WHEN p_is_deep_dive THEN now() 
      ELSE user_topic_history.last_deep_dive_at 
    END,
    updated_at = now();
  
  -- Level Upgrade Logic
  SELECT mention_count INTO v_current_count 
  FROM user_topic_history 
  WHERE user_id = p_user_id AND topic = p_topic;
  
  v_new_level := CASE
    WHEN v_current_count >= 20 THEN 'expert'
    WHEN v_current_count >= 8 THEN 'intermediate'
    ELSE 'novice'
  END;
  
  UPDATE user_topic_history 
  SET expert_level = v_new_level 
  WHERE user_id = p_user_id AND topic = p_topic;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Phase 2: Topic Tracker

### Neue Datei: `supabase/functions/_shared/context/topicTracker.ts`

```typescript
/**
 * Topic Tracker - Erkennt und trackt User-Expertise pro Thema
 */

export type TopicLevel = 'novice' | 'intermediate' | 'expert';

export interface TopicContext {
  topic: string;
  level: TopicLevel;
  mentionCount: number;
  totalCharsExchanged: number;
  lastDeepDive: Date | null;
  hoursSinceDeepDive: number | null;
}

// Topic Pattern Definitions
export const TOPIC_PATTERNS: Record<string, RegExp> = {
  retatrutide: /retatrutide|reta|glp-?1|tirzepatide|semaglutide|ozempic|wegovy/i,
  sleep: /schlaf|sleep|rem|tiefschlaf|einschlafen|aufwachen|insomnia/i,
  training: /training|workout|krafttraining|cardio|hypertrophie|vo2max|deload/i,
  protein: /protein|eiweiß|aminosäure|leucin|whey|casein/i,
  nutrition: /ernährung|kalorien|makros|defizit|surplus|tdee|carb/i,
  cortisol: /cortisol|stress|nebenniere|hpa|ashwagandha/i,
  bioage: /bio.?age|biologisches?\s*alter|dunedin|pace|longevity|aging/i,
  hormones: /hormon|testosteron|östrogen|thyroid|insulin|igf/i,
  supplements: /supplement|vitamin|mineral|magnesium|zink|omega/i,
  bloodwork: /blutbild|blutwerte|labor|ferritin|hba1c|leberwerte/i,
};

/**
 * Extrahiert alle erkannten Topics aus einer Nachricht
 */
export function extractTopics(message: string): string[] {
  const detected: string[] = [];
  
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(message)) {
      detected.push(topic);
    }
  }
  
  return detected;
}

/**
 * Lädt Topic-History für einen User aus der Datenbank
 */
export async function loadTopicHistory(
  supaClient: any,
  userId: string,
  topics: string[]
): Promise<Map<string, TopicContext>> {
  if (topics.length === 0) return new Map();
  
  const { data, error } = await supaClient
    .from('user_topic_history')
    .select('*')
    .eq('user_id', userId)
    .in('topic', topics);
  
  if (error) {
    console.warn('[TopicTracker] Failed to load history:', error);
    return new Map();
  }
  
  const result = new Map<string, TopicContext>();
  const now = Date.now();
  
  for (const row of data || []) {
    const lastDeepDive = row.last_deep_dive_at 
      ? new Date(row.last_deep_dive_at) 
      : null;
    
    result.set(row.topic, {
      topic: row.topic,
      level: row.expert_level as TopicLevel,
      mentionCount: row.mention_count,
      totalCharsExchanged: row.total_chars_exchanged,
      lastDeepDive,
      hoursSinceDeepDive: lastDeepDive 
        ? (now - lastDeepDive.getTime()) / (1000 * 60 * 60)
        : null,
    });
  }
  
  return result;
}

/**
 * Aktualisiert Topic-Stats nach einer Konversation
 */
export async function updateTopicStats(
  supaClient: any,
  userId: string,
  topics: string[],
  responseLength: number
): Promise<void> {
  const isDeepDive = responseLength > 1500;
  const charsPerTopic = Math.ceil(responseLength / Math.max(1, topics.length));
  
  for (const topic of topics) {
    try {
      await supaClient.rpc('increment_topic_stats', {
        p_user_id: userId,
        p_topic: topic,
        p_chars: charsPerTopic,
        p_is_deep_dive: isDeepDive,
      });
    } catch (err) {
      console.warn('[TopicTracker] Failed to update stats for', topic, err);
    }
  }
}
```

---

## Phase 3: Response Budget Calculator

### Neue Datei: `supabase/functions/_shared/ai/responseBudget.ts`

```typescript
/**
 * Response Budget Calculator
 * Berechnet dynamisches Zeichenbudget basierend auf Kontext
 */

import type { TopicContext, TopicLevel } from '../context/topicTracker.ts';
import type { DetailLevel, IntentType } from './semanticRouter.ts';

export interface BudgetFactors {
  userMessageLength: number;
  primaryTopic: TopicContext | null;
  intent: IntentType;
  detailLevel: DetailLevel;
  timeOfDay: 'morning' | 'day' | 'evening';
}

export interface BudgetResult {
  maxChars: number;
  maxTokens: number;
  reason: string;
  constraints: string[];  // Für Prompt-Injection
}

// Expertise Multipliers (Gemini's Idea)
const LEVEL_MULTIPLIERS: Record<TopicLevel, number> = {
  novice: 1.0,       // Volle Erklärung
  intermediate: 0.7, // Basics überspringen
  expert: 0.5,       // Nur Updates, keine Grundlagen
};

// Recency Multipliers
function getRecencyMultiplier(hoursSinceDeepDive: number | null): number {
  if (hoursSinceDeepDive === null) return 1.0;  // Noch nie deep dive
  if (hoursSinceDeepDive < 24) return 0.4;       // < 24h → stark kürzen
  if (hoursSinceDeepDive < 72) return 0.6;       // < 3 Tage → kürzen
  if (hoursSinceDeepDive < 168) return 0.8;      // < 1 Woche → leicht kürzen
  return 1.0;                                     // > 1 Woche → normal
}

export function calculateResponseBudget(factors: BudgetFactors): BudgetResult {
  // Base Budget nach Detail Level
  const BASE_BUDGETS: Record<DetailLevel, number> = {
    ultra_short: 400,
    concise: 800,
    moderate: 1500,
    extensive: 2500,
  };
  
  let budget = BASE_BUDGETS[factors.detailLevel];
  const constraints: string[] = [];
  const reasons: string[] = [];
  
  // 1. Expertise Modifier
  if (factors.primaryTopic) {
    const levelMult = LEVEL_MULTIPLIERS[factors.primaryTopic.level];
    if (levelMult < 1.0) {
      budget *= levelMult;
      constraints.push(`User ist ${factors.primaryTopic.level.toUpperCase()} bei ${factors.primaryTopic.topic} - KEINE Grundlagen erklaeren`);
      reasons.push(`Expert-Level: ${factors.primaryTopic.level}`);
    }
    
    // 2. Recency Modifier
    const recencyMult = getRecencyMultiplier(factors.primaryTopic.hoursSinceDeepDive);
    if (recencyMult < 1.0) {
      budget *= recencyMult;
      const hours = Math.round(factors.primaryTopic.hoursSinceDeepDive || 0);
      constraints.push(`Thema wurde vor ${hours}h ausfuehrlich besprochen - NUR neue Infos`);
      reasons.push(`Recent deep-dive: ${hours}h ago`);
    }
  }
  
  // 3. Short Message + Confirmation = Hard Cap (Gemini's Idea)
  if (factors.userMessageLength < 50 && factors.intent === 'confirmation') {
    budget = Math.min(budget, 300);
    constraints.push('Kurze Bestaetigung - max 2-3 Saetze');
    reasons.push('Short confirmation');
  }
  
  // 4. Evening = Shorter
  if (factors.timeOfDay === 'evening') {
    budget *= 0.85;
    reasons.push('Evening mode');
  }
  
  // Floor & Ceiling
  budget = Math.max(200, Math.min(budget, 3000));
  
  return {
    maxChars: Math.round(budget),
    maxTokens: Math.round(budget / 4),  // ~4 chars per token
    reason: reasons.join(', ') || 'Standard budget',
    constraints,
  };
}

/**
 * Generiert den Budget-Prompt-Abschnitt für die System Message
 */
export function buildBudgetPromptSection(budget: BudgetResult): string {
  const lines = [
    '== RESPONSE BUDGET ==',
    `Constraint: STRIKT UNTER ${budget.maxChars} Zeichen (~${budget.maxTokens} tokens)`,
    `Grund: ${budget.reason}`,
  ];
  
  if (budget.constraints.length > 0) {
    lines.push('');
    lines.push('WICHTIG:');
    budget.constraints.forEach(c => lines.push(`- ${c}`));
  }
  
  return lines.join('\n');
}
```

---

## Phase 4: Prompt Builder Integration

### Erweiterte Section in `intelligentPromptBuilder.ts`

```typescript
// NEU: Import TopicTracker & Budget
import { 
  extractTopics, 
  loadTopicHistory,
  type TopicContext 
} from './topicTracker.ts';
import { 
  calculateResponseBudget, 
  buildBudgetPromptSection,
  type BudgetResult 
} from '../ai/responseBudget.ts';

// Neue Prompt-Section (nach COACHING-REGELN, vor RAG WISSEN)

function buildTopicExpertiseSection(
  topicContexts: Map<string, TopicContext>
): string {
  if (topicContexts.size === 0) return '';
  
  const lines = [
    '== USER TOPIC EXPERTISE ==',
    '(Passe Erklaerungstiefe entsprechend an!)',
  ];
  
  for (const [topic, ctx] of topicContexts) {
    const lastDeepDive = ctx.hoursSinceDeepDive 
      ? `Letzter Deep-Dive: vor ${Math.round(ctx.hoursSinceDeepDive)}h` 
      : 'Noch nie ausfuehrlich besprochen';
    
    const instruction = ctx.level === 'expert'
      ? 'KEINE BASICS erklaeren!'
      : ctx.level === 'intermediate'
      ? 'Grundlagen kurz halten.'
      : 'Kann ausfuehrlich erklaert werden.';
    
    lines.push(`- ${topic.toUpperCase()}: ${ctx.level.toUpperCase()} (${ctx.mentionCount}x erwaehnt). ${lastDeepDive}. ${instruction}`);
  }
  
  return lines.join('\n');
}
```

---

## Phase 5: Orchestrator Integration

### Änderungen in `coach-orchestrator-enhanced/index.ts`

```typescript
// Nach Semantic Router, vor Prompt Building:

// 1. Extract Topics
const detectedTopics = extractTopics(message);
console.log('[ARES] Detected topics:', detectedTopics);

// 2. Load Topic History
const topicHistory = await loadTopicHistory(svcClient, userId, detectedTopics);

// 3. Find Primary Topic (most mentioned)
let primaryTopic: TopicContext | null = null;
let maxMentions = 0;
for (const ctx of topicHistory.values()) {
  if (ctx.mentionCount > maxMentions) {
    maxMentions = ctx.mentionCount;
    primaryTopic = ctx;
  }
}

// 4. Calculate Budget
const budget = calculateResponseBudget({
  userMessageLength: message.length,
  primaryTopic,
  intent: conversationAnalysis.intent,
  detailLevel: conversationAnalysis.required_detail_level,
  timeOfDay: getCurrentTimeOfDay(),
});

console.log('[ARES] Response budget:', budget);

// 5. Inject into Prompt Builder Config
const systemPrompt = buildIntelligentSystemPrompt({
  ...existingConfig,
  topicContexts: topicHistory,  // NEU
  responseBudget: budget,        // NEU
});

// ... LLM Call ...

// 6. Post-Response: Update Topic Stats
const responseLength = finalResponse.length;
await updateTopicStats(svcClient, userId, detectedTopics, responseLength);
```

---

## Betroffene Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `user_topic_history` | MIGRATION | Neue Tabelle + RPC |
| `_shared/context/topicTracker.ts` | NEW | Topic Extraction & History |
| `_shared/ai/responseBudget.ts` | NEW | Budget Calculator |
| `_shared/context/intelligentPromptBuilder.ts` | EDIT | +Topic Expertise Section, +Budget Section |
| `_shared/context/index.ts` | EDIT | Exports für neue Module |
| `coach-orchestrator-enhanced/index.ts` | EDIT | Integration aller Komponenten |

---

## Erwartetes Ergebnis

### Vorher (Retatrutide zum 50. Mal):

```text
User: "Wie war das nochmal mit Reta und Schlaf?"

ARES: [2000+ Zeichen]
Retatrutide ist ein Triple-Agonist der GLP-1, GIP und Glukagon-Rezeptoren aktiviert...
Der Wirkmechanismus basiert auf...
Bezüglich Schlaf gibt es mehrere Aspekte zu beachten...
[Volle Wikipedia-Erklärung]
```

### Nachher:

```text
User: "Wie war das nochmal mit Reta und Schlaf?"

[System Prompt enthält:]
== USER TOPIC EXPERTISE ==
- RETATRUTIDE: EXPERT (47x erwaehnt). Letzter Deep-Dive: vor 3h. KEINE BASICS erklaeren!

== RESPONSE BUDGET ==
Constraint: STRIKT UNTER 400 Zeichen
Grund: Expert-Level: expert, Recent deep-dive: 3h ago

ARES: [~350 Zeichen]
"Hatten wir vorhin - GLP-1 kann REM beeinflussen. Dein Tiefschlaf war 
diese Woche stabil bei 1.2h, also keine Auffälligkeiten. Gibt's was 
Neues das du beobachtet hast? Konkrete Einschlafprobleme oder eher 
Durchschlafen?"
```

---

## Implementierungs-Reihenfolge

1. **Database Migration** - Tabelle + RPC erstellen
2. **topicTracker.ts** - Topic Extraction & DB-Anbindung
3. **responseBudget.ts** - Budget-Logik
4. **intelligentPromptBuilder.ts** - Neue Sections integrieren
5. **coach-orchestrator-enhanced** - Alles zusammenführen
6. **Deploy & Test** - Edge Functions deployen

---

## Metriken für Erfolg

Nach Implementation tracken wir:
- Durchschnittliche Response-Länge pro Topic
- Deep-Dive-Rate bei Expert-Level Topics (Ziel: < 20%)
- User-Feedback/Engagement nach Antworten

