// Bloodwork System Module - Phase 5
// Central exports for ARES bloodwork integration

export { loadBloodworkContext, formatBloodworkForPrompt } from './bloodworkLoader.ts';
export { evaluateMarkers, getStatusDisplay, isCriticalStatus } from './markerEvaluator.ts';
export { detectTrends, formatTrend, getTrendSummary } from './trendDetector.ts';
export type { 
  BloodworkEntry, 
  BloodworkContext, 
  MarkerEvaluation, 
  BloodworkTrend,
  ReferenceRange,
  MarkerStatus 
} from './types.ts';
