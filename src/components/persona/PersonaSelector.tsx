import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Loader2 } from 'lucide-react';
import PersonaCard, { PersonaPreview } from './PersonaCard';

// Default personas (fallback if DB is empty)
const DEFAULT_PERSONAS: PersonaPreview[] = [
  {
    id: 'standard',
    name: 'ARES Standard',
    icon: '⚡',
    description: 'Ausgewogen, professionell und motivierend. Der perfekte Einstieg für alle.',
    example_quote: 'Guter Fortschritt heute! Lass uns das Momentum nutzen und weiter Gas geben.',
    is_active: true,
    energy: 6,
    directness: 6,
    humor: 5,
    warmth: 6,
  },
  {
    id: 'krieger',
    name: 'KRIEGER',
    icon: '🛡️',
    description: 'Spartanisch, diszipliniert, keine Ausreden. Für alle, die harte Ansagen brauchen.',
    example_quote: 'Ausreden sind Gift. Du weißt was zu tun ist. Also tu es.',
    is_active: true,
    energy: 9,
    directness: 10,
    humor: 2,
    warmth: 3,
  },
  {
    id: 'ruehl',
    name: 'RÜHL',
    icon: '💪',
    description: 'Locker, humorvoll, mit hessischem Charme. Motivation mit einem Augenzwinkern.',
    example_quote: 'Ei gude wie! Des war doch schon ganz ordentlich. Morgen knallen wir noch eine Schippe drauf!',
    is_active: true,
    energy: 8,
    directness: 7,
    humor: 10,
    warmth: 7,
  },
  {
    id: 'sanft',
    name: 'SANFT',
    icon: '🌱',
    description: 'Einfühlsam, verständnisvoll, geduldig. Für sensible Phasen und sanften Support.',
    example_quote: 'Es ist völlig okay, mal einen schwierigen Tag zu haben. Was zählt ist, dass du dranbleibst.',
    is_active: true,
    energy: 4,
    directness: 3,
    humor: 4,
    warmth: 10,
  },
];

interface PersonaSelectorProps {
  className?: string;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ className }) => {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<PersonaPreview[]>(DEFAULT_PERSONAS);
  const [selectedId, setSelectedId] = useState<string>('standard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load personas from DB
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const { data, error } = await supabase
          .from('coach_personas')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.warn('Could not load personas from DB, using defaults:', error);
          return;
        }

        if (data && data.length > 0) {
          const mappedPersonas: PersonaPreview[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            icon: p.icon || '⚡',
            description: p.description || '',
            example_quote: p.example_responses?.[0] || '',
            is_active: p.is_active,
            energy: p.energy || 5,
            directness: p.directness || 5,
            humor: p.humor || 5,
            warmth: p.warmth || 5,
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
        const { data, error } = await supabase
          .from('user_persona_selection')
          .select('persona_id')
          .eq('user_id', user.id)
          .maybeSingle();

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
      const { error } = await supabase
        .from('user_persona_selection')
        .upsert({
          user_id: user.id,
          persona_id: personaId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

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
