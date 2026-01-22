/**
 * Coach Personas System - Main Export
 * Phase 1 Foundation
 * 
 * Zentrale Export-Datei für das Persona-System.
 * Importiere alles von hier:
 * 
 * import { loadUserPersona, CoachPersona, PERSONA_IDS } from '../_shared/persona/index.ts';
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
