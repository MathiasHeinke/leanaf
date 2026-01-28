/**
 * Coaching Module - Situational Intelligence System
 * 
 * Exportiert alle Coaching-bezogenen Funktionen:
 * - Narrative Detection (Venting vs. Excuse vs. Honest Admission)
 * - Identity Checker (Protocol Mode als Identitäts-Standard)
 */

// Narrative Detector
export {
  detectNarrative,
  getExcuseTypeDescription,
  type NarrativeAnalysis,
  type ExcuseType,
} from './narrativeDetector.ts';

// Identity Checker
export {
  getIdentityContext,
  buildIdentityPromptSection,
  buildRealityAuditPrompt,
  loadUserProtocolMode,
  type IdentityContext,
  type ProtocolMode,
} from './identityChecker.ts';
