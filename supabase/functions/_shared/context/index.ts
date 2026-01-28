/**
 * Context Module - Entry Point
 * Exportiert alle Context-bezogenen Funktionen und Typen
 */

export {
  loadUserHealthContext,
  identifyKnowledgeGaps,
  generatePromptSummary,
  parseProtocolStatus,
  type UserHealthContext,
} from './userContextLoader.ts';

export {
  buildIntelligentSystemPrompt,
  convertConversationHistory,
  generateSituationalInstructions,
  getCurrentGermanDate,
  type ConversationMessage,
  type IntelligentPromptConfig,
} from './intelligentPromptBuilder.ts';

// ARES 3.0 Response Intelligence - Topic Tracker
export {
  extractTopics,
  loadTopicHistory,
  updateTopicStats,
  findPrimaryTopic,
  buildTopicExpertiseSection,
  TOPIC_PATTERNS,
  type TopicContext,
  type TopicLevel,
} from './topicTracker.ts';
