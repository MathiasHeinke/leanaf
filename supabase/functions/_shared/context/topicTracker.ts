/**
 * Topic Tracker - ARES 3.0 Response Intelligence
 * Erkennt und trackt User-Expertise pro Thema für intelligente Antwortsteuerung
 * 
 * @version 1.0.0
 * @date 2026-01-28
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TopicLevel = 'novice' | 'intermediate' | 'expert';

export interface TopicContext {
  topic: string;
  level: TopicLevel;
  mentionCount: number;
  totalCharsExchanged: number;
  lastDeepDive: Date | null;
  hoursSinceDeepDive: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC PATTERNS - Regex-basierte Themenerkennung
// ═══════════════════════════════════════════════════════════════════════════════

export const TOPIC_PATTERNS: Record<string, RegExp> = {
  // Peptide & GLP-1
  retatrutide: /retatrutide|reta|glp-?1|tirzepatide|semaglutide|ozempic|wegovy|mounjaro/i,
  peptides: /peptid|bpc-?157|tb-?500|ipamorelin|cjc|ghrp|mk-?677|tesamorelin/i,
  
  // Lifestyle & Recovery
  sleep: /schlaf|sleep|rem|tiefschlaf|einschlafen|aufwachen|insomnia|zirkadian/i,
  stress: /cortisol|stress|nebenniere|hpa|ashwagandha|burnout|erschöpfung/i,
  
  // Training
  training: /training|workout|krafttraining|cardio|hypertrophie|vo2max|deload|progressive|split/i,
  
  // Nutrition
  protein: /protein|eiweiß|aminosäure|leucin|whey|casein|bcaa|eaa/i,
  nutrition: /ernährung|kalorien|makros|defizit|surplus|tdee|carb|fett|diät/i,
  fasting: /fasten|fasting|autophagie|intermittent|omad|zeitfenster/i,
  
  // Longevity
  bioage: /bio.?age|biologisches?\s*alter|dunedin|pace|longevity|aging|horvath|epigenet/i,
  rapamycin: /rapamycin|rapa|mtor|sirolimus/i,
  senolytics: /senolytic|dasatinib|quercetin|fisetin|seneszent/i,
  nad: /nad\+?|nmn|nr|nicotinamid|sirtuins?/i,
  
  // Hormones & Bloodwork
  hormones: /hormon|testosteron|östrogen|thyroid|insulin|igf|shbg|dhea/i,
  bloodwork: /blutbild|blutwerte|labor|ferritin|hba1c|leberwerte|lipide|cholesterin/i,
  
  // Supplements
  supplements: /supplement|vitamin|mineral|magnesium|zink|omega|kreatin|creatine/i,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOPIC EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lädt Topic-History für einen User aus der Datenbank
 */
export async function loadTopicHistory(
  supaClient: SupabaseClient,
  userId: string,
  topics: string[]
): Promise<Map<string, TopicContext>> {
  if (topics.length === 0) return new Map();
  
  try {
    const { data, error } = await supaClient
      .from('user_topic_history')
      .select('*')
      .eq('user_id', userId)
      .in('topic', topics);
    
    if (error) {
      console.warn('[TopicTracker] Failed to load history:', error.message);
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
  } catch (err) {
    console.warn('[TopicTracker] Exception loading history:', err);
    return new Map();
  }
}

/**
 * Aktualisiert Topic-Stats nach einer Konversation
 */
export async function updateTopicStats(
  supaClient: SupabaseClient,
  userId: string,
  topics: string[],
  responseLength: number
): Promise<void> {
  if (topics.length === 0) return;
  
  const isDeepDive = responseLength > 1500;
  const charsPerTopic = Math.ceil(responseLength / Math.max(1, topics.length));
  
  for (const topic of topics) {
    try {
      const { error } = await supaClient.rpc('increment_topic_stats', {
        p_user_id: userId,
        p_topic: topic,
        p_chars: charsPerTopic,
        p_is_deep_dive: isDeepDive,
      });
      
      if (error) {
        console.warn('[TopicTracker] Failed to update stats for', topic, ':', error.message);
      }
    } catch (err) {
      console.warn('[TopicTracker] Exception updating stats for', topic, ':', err);
    }
  }
}

/**
 * Findet das primäre Topic (höchste Erwähnungsanzahl)
 */
export function findPrimaryTopic(
  topicHistory: Map<string, TopicContext>
): TopicContext | null {
  let primary: TopicContext | null = null;
  let maxMentions = 0;
  
  for (const ctx of topicHistory.values()) {
    if (ctx.mentionCount > maxMentions) {
      maxMentions = ctx.mentionCount;
      primary = ctx;
    }
  }
  
  return primary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT SECTION BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Baut die Topic Expertise Section für den System Prompt
 */
export function buildTopicExpertiseSection(
  topicContexts: Map<string, TopicContext>
): string {
  if (topicContexts.size === 0) return '';
  
  const lines: string[] = [
    '== USER TOPIC EXPERTISE ==',
    '(Passe Erklaerungstiefe entsprechend an!)',
  ];
  
  for (const [topic, ctx] of topicContexts) {
    const lastDeepDive = ctx.hoursSinceDeepDive !== null
      ? `Letzter Deep-Dive: vor ${Math.round(ctx.hoursSinceDeepDive)}h`
      : 'Noch nie ausfuehrlich besprochen';
    
    const instruction = ctx.level === 'expert'
      ? 'KEINE BASICS erklaeren!'
      : ctx.level === 'intermediate'
      ? 'Grundlagen kurz halten.'
      : 'Kann ausfuehrlich erklaert werden.';
    
    lines.push(
      `- ${topic.toUpperCase()}: ${ctx.level.toUpperCase()} (${ctx.mentionCount}x erwaehnt). ${lastDeepDive}. ${instruction}`
    );
  }
  
  return lines.join('\n');
}
