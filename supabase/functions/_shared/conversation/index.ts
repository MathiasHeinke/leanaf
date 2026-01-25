/**
 * Conversation Module - Central export point
 * 
 * ARES 3.0 PRO: Proaktive Gesprächsführung und Topic-Management
 */

// Conversation Driver
export {
  detectTopic,
  suggestNextTopic,
  buildProactivePromptSection,
  updateConversationState,
  createInitialConversationState,
  TOPIC_CONNECTIONS
} from './conversationDriver.ts';

export type {
  TopicId,
  TopicConnection,
  ConversationState,
  ProactiveSuggestion,
  UserGoals
} from './conversationDriver.ts';
