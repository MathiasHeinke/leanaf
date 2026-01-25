/**
 * Topic Detector
 * ARES 3.0: Erkennt Themenwechsel und kategorisiert Nachrichten
 */

import { 
  TopicCategory, 
  TopicShiftSignal, 
  TOPIC_SHIFT_PHRASES, 
  CATEGORY_KEYWORDS 
} from './types.ts';

/**
 * Detect if message contains a topic shift signal
 */
export function detectTopicShift(message: string): TopicShiftSignal | null {
  const lowerMessage = message.toLowerCase();
  
  for (const [phrase, type] of Object.entries(TOPIC_SHIFT_PHRASES)) {
    if (lowerMessage.includes(phrase)) {
      return {
        type,
        confidence: type === 'explicit' ? 0.9 : type === 'implicit' ? 0.7 : 0.5,
        detectedPhrase: phrase,
      };
    }
  }
  
  // Check for question patterns that might indicate shift
  const questionPatterns = [
    /^(?:was|wie|warum|wann|wo|wer|welche?)\s/i,
    /\?$/,
  ];
  
  const isQuestion = questionPatterns.some(p => p.test(message.trim()));
  if (isQuestion && message.length < 100) {
    return {
      type: 'question',
      confidence: 0.4,
    };
  }
  
  return null;
}

/**
 * Detect the primary topic category from message content
 */
export function detectTopicCategory(message: string): { 
  category: TopicCategory; 
  confidence: number;
  matchedKeywords: string[];
} {
  const lowerMessage = message.toLowerCase();
  const scores: Record<TopicCategory, { score: number; keywords: string[] }> = {} as any;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matched = keywords.filter(kw => lowerMessage.includes(kw));
    scores[category as TopicCategory] = {
      score: matched.length,
      keywords: matched,
    };
  }
  
  // Find highest scoring category
  let bestCategory: TopicCategory = 'general';
  let bestScore = 0;
  let bestKeywords: string[] = [];
  
  for (const [category, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestCategory = category as TopicCategory;
      bestKeywords = data.keywords;
    }
  }
  
  // Calculate confidence based on keyword density
  const wordCount = message.split(/\s+/).length;
  const confidence = Math.min(0.95, 0.3 + (bestScore / Math.max(1, wordCount)) * 2);
  
  return {
    category: bestCategory,
    confidence: bestScore > 0 ? confidence : 0.2,
    matchedKeywords: bestKeywords,
  };
}

/**
 * Generate a human-readable topic name from detected category and keywords
 */
export function generateTopicName(
  category: TopicCategory, 
  keywords: string[],
  message: string
): string {
  const categoryNames: Record<TopicCategory, string> = {
    training: 'Training',
    nutrition: 'Ernährung',
    supplements: 'Supplements',
    sleep: 'Schlaf',
    hormones: 'Hormone',
    bloodwork: 'Blutwerte',
    mindset: 'Mindset',
    recovery: 'Regeneration',
    lifestyle: 'Lifestyle',
    protocol: 'Protokoll',
    general: 'Allgemein',
  };
  
  // Try to make it more specific based on keywords
  if (keywords.length > 0) {
    const mainKeyword = keywords[0];
    return `${categoryNames[category]}: ${mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1)}`;
  }
  
  return categoryNames[category];
}

/**
 * Check if two topics are likely the same (for deduplication)
 */
export function areTopicsSimilar(
  topic1: { category: TopicCategory; name: string },
  topic2: { category: TopicCategory; name: string }
): boolean {
  if (topic1.category !== topic2.category) return false;
  
  // Same category, check name similarity
  const name1 = topic1.name.toLowerCase();
  const name2 = topic2.name.toLowerCase();
  
  return name1 === name2 || name1.includes(name2) || name2.includes(name1);
}
