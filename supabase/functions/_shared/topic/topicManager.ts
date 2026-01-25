/**
 * Topic State Manager
 * ARES 3.0: Verwaltet aktive, pausierte und archivierte Themen
 */

import { 
  Topic, 
  TopicState, 
  TopicCategory, 
  TopicTransition,
  TopicShiftSignal 
} from './types.ts';
import { 
  detectTopicShift, 
  detectTopicCategory, 
  generateTopicName,
  areTopicsSimilar 
} from './topicDetector.ts';

const MAX_SECONDARY_TOPICS = 3;
const MAX_ARCHIVED_TOPICS = 10;
const TOPIC_TIMEOUT_MINUTES = 30;

/**
 * Create initial empty topic state
 */
export function createInitialTopicState(): TopicState {
  return {
    primary: null,
    secondary: [],
    archived: [],
    lastShiftAt: null,
    shiftCount: 0,
  };
}

/**
 * Create a new topic from message analysis
 */
function createTopic(
  category: TopicCategory,
  name: string,
  message: string
): Topic {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    category,
    status: 'active',
    depth: 0,
    startedAt: now,
    lastActiveAt: now,
    keyPoints: [],
    userQuestions: message.endsWith('?') ? [message] : [],
    pendingFollowups: [],
  };
}

/**
 * Process a new message and update topic state
 */
export function processMessage(
  state: TopicState,
  message: string,
  isUserMessage: boolean
): { 
  newState: TopicState; 
  transition: TopicTransition | null;
  shiftDetected: TopicShiftSignal | null;
} {
  const now = new Date().toISOString();
  let newState = { ...state };
  let transition: TopicTransition | null = null;
  
  // Detect potential topic shift
  const shiftSignal = isUserMessage ? detectTopicShift(message) : null;
  
  // Detect topic category
  const { category, confidence, matchedKeywords } = detectTopicCategory(message);
  const topicName = generateTopicName(category, matchedKeywords, message);
  
  // Determine if we need to switch topics
  const shouldSwitch = 
    shiftSignal?.confidence && shiftSignal.confidence > 0.6 ||
    (category !== 'general' && 
     newState.primary && 
     newState.primary.category !== category &&
     confidence > 0.7);
  
  if (shouldSwitch && isUserMessage) {
    // Check if we're returning to an existing topic
    const existingSecondary = newState.secondary.find(t => 
      areTopicsSimilar({ category, name: topicName }, t)
    );
    
    if (existingSecondary) {
      // Resume existing topic
      transition = {
        from: newState.primary,
        to: existingSecondary,
        reason: 'user_initiated',
        timestamp: now,
      };
      
      // Move current primary to secondary
      if (newState.primary) {
        newState.primary.status = 'paused';
        newState.primary.lastActiveAt = now;
        newState.secondary = [newState.primary, ...newState.secondary.filter(t => t.id !== existingSecondary.id)];
      }
      
      // Promote existing topic to primary
      existingSecondary.status = 'active';
      existingSecondary.lastActiveAt = now;
      existingSecondary.depth = Math.min(3, existingSecondary.depth + 1);
      newState.primary = existingSecondary;
      
    } else {
      // Create new topic
      const newTopic = createTopic(category, topicName, message);
      
      transition = {
        from: newState.primary,
        to: newTopic,
        reason: shiftSignal ? 'user_initiated' : 'natural_flow',
        timestamp: now,
      };
      
      // Move current primary to secondary
      if (newState.primary) {
        newState.primary.status = 'paused';
        newState.primary.lastActiveAt = now;
        newState.secondary = [newState.primary, ...newState.secondary];
      }
      
      // Set new topic as primary
      newState.primary = newTopic;
    }
    
    newState.lastShiftAt = now;
    newState.shiftCount++;
    
  } else if (newState.primary) {
    // Continue with current topic - update depth and activity
    newState.primary.lastActiveAt = now;
    if (isUserMessage && message.length > 50) {
      newState.primary.depth = Math.min(3, newState.primary.depth + 0.5);
    }
    if (message.endsWith('?') && isUserMessage) {
      newState.primary.userQuestions.push(message);
    }
    
  } else if (category !== 'general') {
    // No primary topic yet, create one
    newState.primary = createTopic(category, topicName, message);
  }
  
  // Trim secondary topics
  if (newState.secondary.length > MAX_SECONDARY_TOPICS) {
    const toArchive = newState.secondary.slice(MAX_SECONDARY_TOPICS);
    toArchive.forEach(t => {
      t.status = 'archived';
    });
    newState.archived = [...toArchive, ...newState.archived].slice(0, MAX_ARCHIVED_TOPICS);
    newState.secondary = newState.secondary.slice(0, MAX_SECONDARY_TOPICS);
  }
  
  return { newState, transition, shiftDetected: shiftSignal };
}

/**
 * Mark current topic as resolved
 */
export function resolveTopic(state: TopicState): TopicState {
  if (!state.primary) return state;
  
  const now = new Date().toISOString();
  const newState = { ...state };
  
  newState.primary.status = 'resolved';
  newState.primary.resolvedAt = now;
  newState.archived = [newState.primary, ...newState.archived].slice(0, MAX_ARCHIVED_TOPICS);
  
  // Promote first secondary to primary
  if (newState.secondary.length > 0) {
    newState.primary = newState.secondary[0];
    newState.primary.status = 'active';
    newState.primary.lastActiveAt = now;
    newState.secondary = newState.secondary.slice(1);
  } else {
    newState.primary = null;
  }
  
  return newState;
}

/**
 * Get paused topics that might need follow-up
 */
export function getPausedTopicsForFollowup(state: TopicState): Topic[] {
  const now = Date.now();
  const timeoutMs = TOPIC_TIMEOUT_MINUTES * 60 * 1000;
  
  return state.secondary.filter(topic => {
    const pausedTime = now - new Date(topic.lastActiveAt).getTime();
    return pausedTime < timeoutMs && topic.depth > 1;
  });
}

/**
 * Generate a natural return prompt for paused topics
 */
export function generateReturnPrompt(topic: Topic): string {
  const pausedMinutes = Math.round(
    (Date.now() - new Date(topic.lastActiveAt).getTime()) / 60000
  );
  
  const timeContext = pausedMinutes < 5 
    ? 'gerade eben'
    : pausedMinutes < 15 
      ? 'vor ein paar Minuten'
      : 'vorhin';
  
  const categoryPhrases: Record<string, string[]> = {
    training: [
      `Wollen wir nochmal auf dein Training zurückkommen?`,
      `Beim Training hatten wir ${timeContext} noch einen offenen Punkt...`,
    ],
    nutrition: [
      `Zur Ernährung wollte ich noch was sagen...`,
      `${timeContext} hatten wir noch über Ernährung gesprochen...`,
    ],
    supplements: [
      `Bei den Supplements waren wir noch nicht fertig...`,
      `Zu deiner Supplement-Frage von ${timeContext}...`,
    ],
    default: [
      `Kurz zurück zu ${topic.name}...`,
      `${timeContext} hatten wir noch über ${topic.name} gesprochen...`,
    ],
  };
  
  const phrases = categoryPhrases[topic.category] || categoryPhrases.default;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Build prompt section for topic context
 */
export function buildTopicContextPrompt(state: TopicState): string {
  if (!state.primary && state.secondary.length === 0) {
    return '';
  }
  
  let prompt = '\n<current-topic-context>\n';
  
  if (state.primary) {
    prompt += `AKTUELLES THEMA: ${state.primary.name} (Tiefe: ${state.primary.depth}/3)\n`;
    if (state.primary.keyPoints.length > 0) {
      prompt += `Kernpunkte: ${state.primary.keyPoints.join(', ')}\n`;
    }
  }
  
  if (state.secondary.length > 0) {
    prompt += `PAUSIERTE THEMEN: ${state.secondary.map(t => t.name).join(', ')}\n`;
    prompt += 'Hinweis: Bei Gelegenheit natürlich auf pausierte Themen zurückkommen.\n';
  }
  
  prompt += '</current-topic-context>\n';
  
  return prompt;
}
