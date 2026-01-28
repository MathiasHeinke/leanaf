
# ARES Response Intelligence System - Vollständige Implementierung

## Übersicht

Implementierung eines 6-Komponenten-Systems zur intelligenten Antwortsteuerung:
1. **Database Migration** - `user_topic_history` Tabelle + RPC
2. **Topic Tracker** - Erkennung und Tracking von Themen
3. **Response Budget Calculator** - Dynamische Längensteuerung
4. **Prompt Builder Integration** - Neue Sections im System Prompt
5. **Orchestrator Integration** - Zusammenführung aller Komponenten
6. **Admin Analytics Dashboard** - Visualisierung der Daten

---

## Phase 1: Database Migration

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

CREATE INDEX idx_user_topic_lookup ON user_topic_history(user_id, topic);

ALTER TABLE user_topic_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic history" ON user_topic_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON user_topic_history
  FOR ALL USING (auth.role() = 'service_role');
```

### RPC Funktion: `increment_topic_stats`

```sql
CREATE OR REPLACE FUNCTION public.increment_topic_stats(
  p_user_id UUID,
  p_topic TEXT,
  p_chars INTEGER,
  p_is_deep_dive BOOLEAN DEFAULT FALSE
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.increment_topic_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_topic_stats TO service_role;
```

---

## Phase 2: Topic Tracker

### Neue Datei: `supabase/functions/_shared/context/topicTracker.ts`

```typescript
/**
 * Topic Tracker - ARES 3.0 Response Intelligence
 * Erkennt und trackt User-Expertise pro Thema
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

export function extractTopics(message: string): string[] {
  const detected: string[] = [];
  for (const [topic, pattern] of Object.entries(TOPIC_PATTERNS)) {
    if (pattern.test(message)) {
      detected.push(topic);
    }
  }
  return detected;
}

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
 * Response Budget Calculator - ARES 3.0
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
  constraints: string[];
}

const LEVEL_MULTIPLIERS: Record<TopicLevel, number> = {
  novice: 1.0,
  intermediate: 0.7,
  expert: 0.5,
};

function getRecencyMultiplier(hoursSinceDeepDive: number | null): number {
  if (hoursSinceDeepDive === null) return 1.0;
  if (hoursSinceDeepDive < 24) return 0.4;
  if (hoursSinceDeepDive < 72) return 0.6;
  if (hoursSinceDeepDive < 168) return 0.8;
  return 1.0;
}

export function calculateResponseBudget(factors: BudgetFactors): BudgetResult {
  const BASE_BUDGETS: Record<DetailLevel, number> = {
    ultra_short: 400,
    concise: 800,
    moderate: 1500,
    extensive: 2500,
  };
  
  let budget = BASE_BUDGETS[factors.detailLevel] || 1500;
  const constraints: string[] = [];
  const reasons: string[] = [];
  
  if (factors.primaryTopic) {
    const levelMult = LEVEL_MULTIPLIERS[factors.primaryTopic.level];
    if (levelMult < 1.0) {
      budget *= levelMult;
      constraints.push(
        `User ist ${factors.primaryTopic.level.toUpperCase()} bei ${factors.primaryTopic.topic} - KEINE Grundlagen erklaeren`
      );
      reasons.push(`Expert-Level: ${factors.primaryTopic.level}`);
    }
    
    const recencyMult = getRecencyMultiplier(factors.primaryTopic.hoursSinceDeepDive);
    if (recencyMult < 1.0) {
      budget *= recencyMult;
      const hours = Math.round(factors.primaryTopic.hoursSinceDeepDive || 0);
      constraints.push(`Thema wurde vor ${hours}h ausfuehrlich besprochen - NUR neue Infos`);
      reasons.push(`Recent deep-dive: ${hours}h ago`);
    }
  }
  
  if (factors.userMessageLength < 50 && factors.intent === 'confirmation') {
    budget = Math.min(budget, 300);
    constraints.push('Kurze Bestaetigung - max 2-3 Saetze');
    reasons.push('Short confirmation');
  }
  
  if (factors.timeOfDay === 'evening') {
    budget *= 0.85;
    reasons.push('Evening mode');
  }
  
  budget = Math.max(200, Math.min(budget, 3000));
  
  return {
    maxChars: Math.round(budget),
    maxTokens: Math.round(budget / 4),
    reason: reasons.join(', ') || 'Standard budget',
    constraints,
  };
}

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

### Änderungen in `intelligentPromptBuilder.ts`

**Neue Imports am Anfang der Datei:**
```typescript
import type { TopicContext } from './topicTracker.ts';
import type { BudgetResult } from '../ai/responseBudget.ts';
```

**Erweitertes Interface `IntelligentPromptConfig`:**
```typescript
export interface IntelligentPromptConfig {
  // ... bestehende Felder ...
  topicContexts?: Map<string, TopicContext>;
  responseBudget?: BudgetResult;
}
```

**Neue Funktion `buildTopicExpertiseSection`:**
```typescript
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

**Integration in `buildIntelligentSystemPrompt`:**
Nach Abschnitt 6 (MOOD DETECTION), vor Abschnitt 7 (Situational Instructions):
```typescript
// ABSCHNITT 6B: Topic Expertise (NEU)
if (topicContexts && topicContexts.size > 0) {
  sections.push('');
  sections.push(buildTopicExpertiseSection(topicContexts));
}

// ABSCHNITT 6C: Response Budget (NEU)
if (responseBudget) {
  sections.push('');
  sections.push(buildBudgetPromptSection(responseBudget));
}
```

### Änderungen in `context/index.ts`

**Neue Exports:**
```typescript
export {
  extractTopics,
  loadTopicHistory,
  updateTopicStats,
  TOPIC_PATTERNS,
  type TopicContext,
  type TopicLevel,
} from './topicTracker.ts';
```

---

## Phase 5: Orchestrator Integration

### Änderungen in `coach-orchestrator-enhanced/index.ts`

**Neue Imports (am Anfang):**
```typescript
import {
  extractTopics,
  loadTopicHistory,
  updateTopicStats,
  type TopicContext,
} from '../_shared/context/topicTracker.ts';

import {
  calculateResponseBudget,
  buildBudgetPromptSection,
  type BudgetResult,
} from '../_shared/ai/responseBudget.ts';
```

**Integration nach Semantic Router (ca. Zeile 1125-1140):**
```typescript
// TOPIC INTELLIGENCE: Extract and load topic history
const detectedTopics = extractTopics(text);
console.log('[ARES-TOPIC] Detected topics:', detectedTopics);

let topicHistory = new Map<string, TopicContext>();
let primaryTopic: TopicContext | null = null;

if (detectedTopics.length > 0) {
  topicHistory = await loadTopicHistory(svcClient, userId, detectedTopics);
  
  // Find primary topic (most mentioned)
  let maxMentions = 0;
  for (const ctx of topicHistory.values()) {
    if (ctx.mentionCount > maxMentions) {
      maxMentions = ctx.mentionCount;
      primaryTopic = ctx;
    }
  }
  
  if (primaryTopic) {
    console.log('[ARES-TOPIC] Primary topic:', primaryTopic.topic, 
                'level:', primaryTopic.level, 
                'mentions:', primaryTopic.mentionCount);
  }
}

// RESPONSE BUDGET: Calculate based on topic + semantic analysis
const responseBudget = calculateResponseBudget({
  userMessageLength: text.length,
  primaryTopic,
  intent: semanticAnalysis?.intent || 'question',
  detailLevel: semanticAnalysis?.required_detail_level || 'moderate',
  timeOfDay: getTimeOfDay() as 'morning' | 'day' | 'evening',
});

console.log('[ARES-BUDGET] Calculated:', responseBudget.maxChars, 'chars,', 
            responseBudget.reason);
```

**Übergabe an buildIntelligentSystemPrompt (ca. Zeile 1433):**
```typescript
const systemPrompt = buildIntelligentSystemPrompt({
  userContext: healthContext,
  persona: persona,
  conversationHistory: formattedHistory,
  personaPrompt: personaPrompt || '',
  ragKnowledge: ragSources?.knowledge_chunks || [],
  currentMessage: text,
  userInsights: userInsights,
  userPatterns: userPatterns,
  topicContexts: topicHistory,      // NEU
  responseBudget: responseBudget,   // NEU
});
```

**Post-Response Topic Update (nach LLM Response, ca. Zeile 2450):**
```typescript
// Update topic stats after response
if (detectedTopics.length > 0 && finalResponse) {
  await updateTopicStats(svcClient, userId, detectedTopics, finalResponse.length);
  console.log('[ARES-TOPIC] Updated stats for', detectedTopics.length, 'topics');
}
```

---

## Phase 6: Admin Analytics Dashboard

### Neue Datei: `src/pages/Admin/ConversationAnalytics.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TopicStats {
  topic: string;
  total_mentions: number;
  avg_chars: number;
  expert_users: number;
}

export default function ConversationAnalytics() {
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    const { data, error } = await supabase
      .from('user_topic_history')
      .select('topic, mention_count, total_chars_exchanged, expert_level');
    
    if (error) {
      console.error('Failed to load analytics:', error);
      setLoading(false);
      return;
    }

    // Aggregate by topic
    const byTopic = new Map<string, TopicStats>();
    for (const row of data || []) {
      const existing = byTopic.get(row.topic) || {
        topic: row.topic,
        total_mentions: 0,
        avg_chars: 0,
        expert_users: 0,
      };
      existing.total_mentions += row.mention_count;
      existing.avg_chars += row.total_chars_exchanged;
      if (row.expert_level === 'expert') existing.expert_users++;
      byTopic.set(row.topic, existing);
    }

    // Calculate averages
    const stats = Array.from(byTopic.values()).map(s => ({
      ...s,
      avg_chars: Math.round(s.avg_chars / Math.max(1, s.total_mentions)),
    }));

    setTopicStats(stats.sort((a, b) => b.total_mentions - a.total_mentions));
    setLoading(false);
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Conversation Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Topic-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topicStats.slice(0, 5)}
                  dataKey="total_mentions"
                  nameKey="topic"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ topic }) => topic}
                >
                  {topicStats.slice(0, 5).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Durchschnittliche Antwortlänge pro Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicStats.slice(0, 8)}>
                <XAxis dataKey="topic" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_chars" fill="#8884d8" name="Ø Zeichen" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expert-Level Users pro Topic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topicStats.map(stat => (
              <div key={stat.topic} className="p-4 border rounded-lg">
                <div className="font-medium capitalize">{stat.topic}</div>
                <div className="text-2xl font-bold">{stat.expert_users}</div>
                <div className="text-sm text-muted-foreground">Expert Users</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Änderungen in `src/pages/Admin/index.ts`

**Neuer Export:**
```typescript
export { default as ConversationAnalytics } from './ConversationAnalytics';
```

### Änderungen in Router (falls vorhanden)

Route hinzufügen:
```typescript
<Route path="/admin/conversation-analytics" element={<ConversationAnalytics />} />
```

---

## Zusammenfassung der Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| SQL Migration | CREATE | `user_topic_history` Tabelle + `increment_topic_stats` RPC |
| `_shared/context/topicTracker.ts` | CREATE | Topic Extraction & History Loading |
| `_shared/ai/responseBudget.ts` | CREATE | Budget Calculator |
| `_shared/context/intelligentPromptBuilder.ts` | EDIT | +TopicExpertise Section, +Budget Section |
| `_shared/context/index.ts` | EDIT | Neue Exports für topicTracker |
| `coach-orchestrator-enhanced/index.ts` | EDIT | Integration aller Komponenten |
| `src/pages/Admin/ConversationAnalytics.tsx` | CREATE | Analytics Dashboard |
| `src/pages/Admin/index.ts` | EDIT | Export für neue Seite |

---

## Erwartetes Ergebnis

**Vorher** (Retatrutide zum 50. Mal):
```
User: "Wie war das nochmal mit Reta und Schlaf?"
ARES: [2000+ Zeichen Wikipedia-Erklärung]
```

**Nachher**:
```
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
Neues das du beobachtet hast?"
```

---

## Implementierungsreihenfolge

1. **Database Migration** ausführen (Tabelle + RPC)
2. **topicTracker.ts** erstellen
3. **responseBudget.ts** erstellen
4. **intelligentPromptBuilder.ts** erweitern
5. **context/index.ts** Exports aktualisieren
6. **coach-orchestrator-enhanced** integrieren
7. **ConversationAnalytics.tsx** Dashboard erstellen
8. **Edge Functions deployen**
9. **Testen** mit verschiedenen Topic-Szenarien
