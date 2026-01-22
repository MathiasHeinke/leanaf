/**
 * Coach Personas System - Loader Functions
 * Phase 1 Foundation
 * 
 * Dieses Modul enthält alle Funktionen zum Laden von Personas:
 * - loadPersona(personaId) - Lädt eine spezifische Persona
 * - loadUserPersona(userId) - Lädt die User-Persona mit Fallback auf STANDARD
 * - getAllPersonas() - Lädt alle aktiven Personas für UI-Auswahl
 * - mapRowToPersona() - Utility zum Mapping von DB-Rows
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  CoachPersona,
  CoachPersonaRow,
  PersonalityDials,
  PersonaPreview,
  UserPersonaSelection,
  DEFAULT_PERSONA_ID,
  PERSONA_IDS,
} from './types.ts';

// Supabase Admin Client (für Service Role Zugriff)
function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Mapped eine DB Row zu einem CoachPersona Objekt
 */
export function mapRowToPersona(row: CoachPersonaRow): CoachPersona {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    dials: {
      energy: row.dial_energy,
      directness: row.dial_directness,
      humor: row.dial_humor,
      warmth: row.dial_warmth,
      depth: row.dial_depth,
      challenge: row.dial_challenge,
      opinion: row.dial_opinion,
    },
    phraseFrequency: row.phrase_frequency,
    languageStyle: row.language_style,
    dialect: row.dialect,
    phrases: row.phrases || [],
    exampleResponses: row.example_responses || [],
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Erstellt eine Kurzbeschreibung der Persönlichkeit basierend auf den Dials
 */
export function generatePersonalitySummary(dials: PersonalityDials): string {
  const traits: string[] = [];
  
  if (dials.energy >= 8) traits.push('energetisch');
  else if (dials.energy <= 3) traits.push('ruhig');
  
  if (dials.directness >= 8) traits.push('direkt');
  else if (dials.directness <= 3) traits.push('einfühlsam');
  
  if (dials.humor >= 8) traits.push('humorvoll');
  
  if (dials.warmth >= 8) traits.push('warm');
  else if (dials.warmth <= 3) traits.push('sachlich');
  
  if (dials.challenge >= 8) traits.push('fordernd');
  else if (dials.challenge <= 3) traits.push('sanft');
  
  if (dials.opinion >= 8) traits.push('meinungsstark');
  
  return traits.length > 0 ? traits.join(', ') : 'ausgewogen';
}

/**
 * Lädt eine spezifische Persona anhand ihrer ID
 * 
 * @param personaId - Die Persona ID (z.B. 'STANDARD', 'KRIEGER')
 * @returns Die Persona oder null wenn nicht gefunden
 */
export async function loadPersona(personaId: string): Promise<CoachPersona | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('coach_personas')
    .select('*')
    .eq('id', personaId)
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    console.error(`[Persona] Error loading persona ${personaId}:`, error?.message);
    return null;
  }
  
  return mapRowToPersona(data as CoachPersonaRow);
}

/**
 * Lädt die Persona eines Users mit Fallback auf STANDARD
 * 
 * @param userId - Die User UUID
 * @returns Die User-Persona (garantiert nicht null durch Fallback)
 */
export async function loadUserPersona(userId: string): Promise<CoachPersona> {
  const supabase = getSupabaseAdmin();
  
  // 1. Versuche User-Selection zu laden
  const { data: selection, error: selectionError } = await supabase
    .from('user_persona_selection')
    .select('persona_id')
    .eq('user_id', userId)
    .single();
  
  let personaId = DEFAULT_PERSONA_ID;
  
  if (!selectionError && selection?.persona_id) {
    personaId = selection.persona_id;
  }
  
  // 2. Lade die ausgewählte Persona
  const persona = await loadPersona(personaId);
  
  // 3. Fallback auf STANDARD wenn die ausgewählte Persona nicht existiert
  if (!persona) {
    console.warn(`[Persona] Persona ${personaId} not found for user ${userId}, falling back to STANDARD`);
    const standardPersona = await loadPersona(DEFAULT_PERSONA_ID);
    
    if (!standardPersona) {
      // Absolute Fallback: Erstelle eine Standard-Persona in-memory
      console.error('[Persona] CRITICAL: STANDARD persona not found in DB!');
      return createDefaultPersonaFallback();
    }
    
    return standardPersona;
  }
  
  return persona;
}

/**
 * Lädt alle aktiven Personas für die UI-Auswahl
 * Sortiert nach sort_order
 * 
 * @returns Array aller aktiven Personas
 */
export async function getAllPersonas(): Promise<CoachPersona[]> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('coach_personas')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  
  if (error || !data) {
    console.error('[Persona] Error loading all personas:', error?.message);
    return [];
  }
  
  return (data as CoachPersonaRow[]).map(mapRowToPersona);
}

/**
 * Lädt alle Personas als Preview für die UI-Auswahl (vereinfacht)
 * 
 * @returns Array von PersonaPreview Objekten
 */
export async function getAllPersonaPreviews(): Promise<PersonaPreview[]> {
  const personas = await getAllPersonas();
  
  return personas.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    personalitySummary: generatePersonalitySummary(p.dials),
  }));
}

/**
 * Speichert die Persona-Auswahl eines Users
 * 
 * @param userId - Die User UUID
 * @param personaId - Die gewählte Persona ID
 * @returns true wenn erfolgreich, false bei Fehler
 */
export async function saveUserPersonaSelection(
  userId: string,
  personaId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  
  // Prüfe ob Persona existiert
  const persona = await loadPersona(personaId);
  if (!persona) {
    console.error(`[Persona] Cannot save selection: Persona ${personaId} not found`);
    return false;
  }
  
  // Upsert (insert or update)
  const { error } = await supabase
    .from('user_persona_selection')
    .upsert({
      user_id: userId,
      persona_id: personaId,
      selected_at: new Date().toISOString(),
    });
  
  if (error) {
    console.error(`[Persona] Error saving selection for user ${userId}:`, error.message);
    return false;
  }
  
  console.log(`[Persona] User ${userId} selected persona ${personaId}`);
  return true;
}

/**
 * Erstellt eine Standard-Persona als absoluter Fallback
 * Wird nur verwendet wenn die DB nicht erreichbar ist
 */
function createDefaultPersonaFallback(): CoachPersona {
  return {
    id: PERSONA_IDS.STANDARD,
    name: 'ARES Standard',
    description: 'Dein ausgewogener Coach',
    icon: '⚖️',
    dials: {
      energy: 6,
      directness: 6,
      humor: 5,
      warmth: 6,
      depth: 6,
      challenge: 6,
      opinion: 5,
    },
    phraseFrequency: 5,
    languageStyle: 'Professionell und freundlich.',
    dialect: null,
    phrases: ['Lass uns das anschauen', 'Guter Punkt'],
    exampleResponses: [],
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
