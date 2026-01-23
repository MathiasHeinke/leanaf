import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserPersona {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  dial_energy: number;
  dial_directness: number;
  dial_humor: number;
  dial_warmth: number;
  dial_depth: number;
  dial_challenge: number;
  dial_opinion: number;
  dialect: string | null;
  phrases: string[];
  language_style: string | null;
}

const DEFAULT_PERSONA: UserPersona = {
  id: 'lester',
  name: 'LESTER',
  icon: '💡',
  description: 'Der Wissenschafts-Nerd mit Charme',
  dial_energy: 7,
  dial_directness: 7,
  dial_humor: 8,
  dial_warmth: 6,
  dial_depth: 10,
  dial_challenge: 5,
  dial_opinion: 9,
  dialect: null,
  phrases: ['Okay, pass auf...', 'Die Wissenschaft sagt...'],
  language_style: 'Erklärt wie ein kluger Freund',
};

export function useUserPersona() {
  const { user } = useAuth();
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPersona() {
      if (!user) {
        setPersona(DEFAULT_PERSONA);
        setLoading(false);
        return;
      }

      try {
        // 1. User-Selection laden
        const { data: selection } = await supabase
          .from('user_persona_selection')
          .select('persona_id')
          .eq('user_id', user.id)
          .single();

        const personaId = selection?.persona_id || 'lester';

        // 2. Persona-Details laden
        const { data, error } = await supabase
          .from('coach_personas')
          .select('id, name, icon, description, dial_energy, dial_directness, dial_humor, dial_warmth, dial_depth, dial_challenge, dial_opinion, dialect, phrases, language_style')
          .eq('id', personaId)
          .single();

        if (error || !data) {
          console.warn('[useUserPersona] Persona not found, using default:', personaId);
          setPersona(DEFAULT_PERSONA);
        } else {
          setPersona({
            id: data.id,
            name: data.name,
            icon: data.icon,
            description: data.description,
            dial_energy: data.dial_energy ?? 5,
            dial_directness: data.dial_directness ?? 5,
            dial_humor: data.dial_humor ?? 5,
            dial_warmth: data.dial_warmth ?? 5,
            dial_depth: data.dial_depth ?? 5,
            dial_challenge: data.dial_challenge ?? 5,
            dial_opinion: data.dial_opinion ?? 5,
            dialect: data.dialect,
            phrases: Array.isArray(data.phrases) ? data.phrases as string[] : [],
            language_style: data.language_style,
          });
        }
      } catch (err) {
        console.error('[useUserPersona] Error:', err);
        setPersona(DEFAULT_PERSONA);
      } finally {
        setLoading(false);
      }
    }

    loadPersona();
  }, [user]);

  return { persona, loading };
}
