import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Loader2 } from 'lucide-react';
import PersonaCard, { PersonaPreview } from './PersonaCard';

// Default personas (fallback if DB is empty) - matches new 4-persona system
const DEFAULT_PERSONAS: PersonaPreview[] = [
  {
    id: 'lester',
    name: 'LESTER',
    icon: '💡',
    description: 'Der Wissenschafts-Nerd mit Charme. Tiefes Fachwissen, verständlich erklärt.',
    example_quote: 'Okay, pass auf, das ist interessant... Die Wissenschaft sagt...',
    is_active: true,
    energy: 7,
    directness: 7,
    humor: 8,
    warmth: 6,
  },
  {
    id: 'ares',
    name: 'ARES',
    icon: '⚔️',
    description: 'Spartanisch, diszipliniert, keine Ausreden. Für alle, die harte Ansagen brauchen.',
    example_quote: 'Keine Ausreden. Du weißt was zu tun ist. Disziplin schlägt Motivation.',
    is_active: true,
    energy: 8,
    directness: 10,
    humor: 3,
    warmth: 4,
  },
  {
    id: 'markus',
    name: 'MARKUS',
    icon: '💪',
    description: 'Locker, humorvoll, mit hessischem Charme. Motivation mit einem Augenzwinkern.',
    example_quote: 'Ei gude wie! Des is doch kä Problem! Weißte was ich mein?',
    is_active: true,
    energy: 9,
    directness: 8,
    humor: 10,
    warmth: 6,
  },
  {
    id: 'freya',
    name: 'FREYA',
    icon: '🌸',
    description: 'Einfühlsam, verständnisvoll, geduldig. Für sensible Phasen und sanften Support.',
    example_quote: 'Es ist völlig okay. Ich verstehe das. Jeder kleine Schritt zählt.',
    is_active: true,
    energy: 5,
    directness: 4,
    humor: 5,
    warmth: 10,
  },
];

interface PersonaSelectorProps {
  className?: string;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ className }) => {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<PersonaPreview[]>(DEFAULT_PERSONAS);
  const [selectedId, setSelectedId] = useState<string>('lester'); // Default to LESTER
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load personas from DB
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const { data, error } = await (supabase
          .from('coach_personas' as any)
          .select('*')
          .eq('is_active', true)
          .order('sort_order') as unknown as Promise<{ data: any[] | null; error: any }>);

        if (error) {
          console.warn('Could not load personas from DB, using defaults:', error);
          return;
        }

        if (data && data.length > 0) {
          const mappedPersonas: PersonaPreview[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            icon: p.icon || '⚡',
            description: p.description || p.bio_short || '',
            example_quote: p.example_responses?.[0]?.response || p.catchphrase || '',
            is_active: p.is_active !== false,
            // Map dial_* columns from DB
            energy: p.dial_energy ?? 5,
            directness: p.dial_directness ?? 5,
            humor: p.dial_humor ?? 5,
            warmth: p.dial_warmth ?? 5,
          }));
          setPersonas(mappedPersonas);
        }
      } catch (err) {
        console.error('Error loading personas:', err);
      }
    };

    loadPersonas();
  }, []);

  // Load user's current selection
  useEffect(() => {
    const loadUserSelection = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase
          .from('user_persona_selection' as any)
          .select('persona_id')
          .eq('user_id', user.id)
          .maybeSingle() as unknown as Promise<{ data: { persona_id: string } | null; error: any }>);

        if (error && error.code !== 'PGRST116') {
          console.warn('Could not load user persona selection:', error);
        }

        if (data?.persona_id) {
          setSelectedId(data.persona_id);
        }
      } catch (err) {
        console.error('Error loading user selection:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserSelection();
  }, [user?.id]);

  // Handle persona selection
  const handleSelect = async (personaId: string) => {
    if (!user?.id) {
      toast.error('Bitte melde dich an, um eine Persona auszuwählen');
      return;
    }

    const persona = personas.find(p => p.id === personaId);
    if (!persona?.is_active) {
      toast.info('Diese Persona ist noch nicht verfügbar');
      return;
    }

    // Optimistic update
    const previousId = selectedId;
    setSelectedId(personaId);
    setSaving(true);

    try {
      const { error } = await (supabase
        .from('user_persona_selection' as any)
        .upsert({
          user_id: user.id,
          persona_id: personaId,
          selected_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        }) as unknown as Promise<{ error: any }>);

      if (error) throw error;

      toast.success(`Coach-Persona auf "${persona.name}" geändert`);
    } catch (err) {
      console.error('Error saving persona selection:', err);
      // Rollback on error
      setSelectedId(previousId);
      toast.error('Fehler beim Speichern der Persona-Auswahl');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-purple-500 rounded-xl flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg md:text-xl font-bold">Coach-Persona</h2>
          <p className="text-sm text-muted-foreground">Wähle den Stil deines KI-Coaches</p>
        </div>
        {saving && (
          <Loader2 className="h-4 w-4 animate-spin ml-auto text-muted-foreground" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            isSelected={selectedId === persona.id}
            onSelect={() => handleSelect(persona.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PersonaSelector;
