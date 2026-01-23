/**
 * Context Module - Entry Point
 * Exportiert alle Context-bezogenen Funktionen und Typen
 */

export {
  loadUserHealthContext,
  identifyKnowledgeGaps,
  generatePromptSummary,
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
