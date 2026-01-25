/**
 * Topic Module - Central export point
 * ARES 3.0: Topic State Machine for fluid conversation management
 */

// Types
export type {
  Topic,
  TopicState,
  TopicCategory,
  TopicStatus,
  TopicShiftSignal,
  TopicTransition,
} from './types.ts';

export { TOPIC_SHIFT_PHRASES, CATEGORY_KEYWORDS } from './types.ts';

// Detector
export {
  detectTopicShift,
  detectTopicCategory,
  generateTopicName,
  areTopicsSimilar,
} from './topicDetector.ts';

// Manager
export {
  createInitialTopicState,
  processMessage,
  resolveTopic,
  getPausedTopicsForFollowup,
  generateReturnPrompt,
  buildTopicContextPrompt,
} from './topicManager.ts';
