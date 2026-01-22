/**
 * Coach Personas System - Main Export
 * Phase 1 Foundation + Phase 2 Integration
 * 
 * Zentrale Export-Datei für das Persona-System.
 * Importiere alles von hier:
 * 
 * import { 
 *   loadUserPersona, 
 *   buildPersonaPrompt, 
 *   applyDialect,
 *   CoachPersona, 
 *   PERSONA_IDS 
 * } from '../_shared/persona/index.ts';
 */

// Types
export type {
  CoachPersona,
  CoachPersonaRow,
  PersonalityDials,
  PersonaExampleResponse,
  PersonaPreview,
  ResolvedPersona,
  PersonaResolutionContext,
  UserPersonaSelection,
  PersonaId,
} from './types.ts';

// Constants
export { PERSONA_IDS, DEFAULT_PERSONA_ID } from './types.ts';

// Loader Functions
export {
  loadPersona,
  loadUserPersona,
  getAllPersonas,
  getAllPersonaPreviews,
  saveUserPersonaSelection,
  mapRowToPersona,
  generatePersonalitySummary,
} from './loader.ts';

// Prompt Builder (Phase 2)
export {
  buildPersonaPrompt,
  getDialDescription,
  selectPhrases,
  resolvePersonaWithContext,
} from './promptBuilder.ts';

// Dialect Processor (Phase 2)
export {
  applyDialect,
  applySoftDialect,
  applyStrongDialect,
  isDialectSupported,
  getSupportedDialects,
  HESSISCH_INTERJECTIONS,
} from './dialectProcessor.ts';
