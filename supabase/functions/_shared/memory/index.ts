/**
 * Memory Module - Central export point
 * 
 * Das Memory Extraction System extrahiert automatisch Erkenntnisse aus User-Nachrichten,
 * speichert sie in der Datenbank und erkennt Muster.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   extractInsightsFromMessage, 
 *   saveInsights, 
 *   loadRelevantInsights,
 *   detectPatterns,
 *   runMemoryCleanup
 * } from '../_shared/memory/index.ts';
 * ```
 */

// Types
export type {
  ExtractedInsight,
  UserInsight,
  DetectedPattern,
  UserPattern,
  InsightCategory,
  ImportanceLevel,
  InsightSource
} from './types.ts';

export { INSIGHT_CATEGORIES } from './types.ts';

// Extractor
export { extractInsightsFromMessage } from './memoryExtractor.ts';

// Store
export { 
  saveInsights, 
  loadRelevantInsights, 
  getAllUserInsights,
  getExistingInsightStrings,
  // ARES 3.0 PRO: Time-aware memory
  formatTimeAgo,
  formatInsightWithTime,
  buildTimeAwareMemorySection
} from './memoryStore.ts';

// Pattern Detection
export { 
  detectPatterns, 
  loadUnaddressedPatterns,
  markPatternAddressed 
} from './patternDetector.ts';

// Cleanup
export {
  runMemoryCleanup,
  cleanupExpiredInsights,
  cleanupStaleInsights,
  cleanupAddressedPatterns
} from './cleanup.ts';
