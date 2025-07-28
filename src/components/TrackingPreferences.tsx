import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Settings, Utensils, Weight, Moon, Droplets, Dumbbell, Pill } from 'lucide-react';

interface TrackingPreference {
  id: string;
  tracking_type: string;
  is_enabled: boolean;
  display_order: number;
}

const trackingOptions = [
  {
    type: 'meal_input',
    label: 'Ernährung & Mahlzeiten',
    description: 'Mahlzeiten und Lebensmittel eingeben',
    icon: Utensils,
    isDefault: true
  },
  {
    type: 'weight_tracking',
    label: 'Gewicht',
    description: 'Körpergewicht täglich verfolgen',
    icon: Weight,
    isDefault: false
  },
  {
    type: 'sleep_tracking',
    label: 'Schlaf',
    description: 'Schlafqualität und -dauer erfassen',
    icon: Moon,
    isDefault: false
  },
  {
    type: 'fluid_tracking',
    label: 'Flüssigkeiten',
    description: 'Trinkmenge und Getränke tracken',
    icon: Droplets,
    isDefault: false
  },
  {
    type: 'workout_tracking',
    label: 'Training',
    description: 'Workouts und Übungen dokumentieren',
    icon: Dumbbell,
    isDefault: false
  },
  {
    type: 'supplement_tracking',
    label: 'Nahrungsergänzung',
    description: 'Supplements und Vitamine verfolgen',
    icon: Pill,
    isDefault: false
  }
];

export const TrackingPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<TrackingPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_tracking_preferences')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order');

      if (error) throw error;

      // Wenn keine Präferenzen existieren, erstelle Standard-Präferenzen
      if (!data || data.length === 0) {
        await createDefaultPreferences();
        return;
      }

      setPreferences(data);
    } catch (error) {
      console.error('Error loading tracking preferences:', error);
      toast.error('Fehler beim Laden der Tracking-Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user) return;

    try {
      const defaultPrefs = trackingOptions.map((option, index) => ({
        user_id: user.id,
        tracking_type: option.type,
        is_enabled: option.isDefault,
        display_order: index + 1
      }));

      const { data, error } = await supabase
        .from('user_tracking_preferences')
        .insert(defaultPrefs)
        .select();

      if (error) throw error;

      setPreferences(data);
      toast.success('Standard-Tracking-Einstellungen erstellt');
    } catch (error) {
      console.error('Error creating default preferences:', error);
      toast.error('Fehler beim Erstellen der Standard-Einstellungen');
    }
  };

  const updatePreference = async (trackingType: string, enabled: boolean) => {
    if (!user) return;

    setUpdating(trackingType);

    try {
      const { error } = await supabase
        .from('user_tracking_preferences')
        .update({ is_enabled: enabled })
        .eq('user_id', user.id)
        .eq('tracking_type', trackingType);

      if (error) throw error;

      setPreferences(prev => 
        prev.map(pref => 
          pref.tracking_type === trackingType 
            ? { ...pref, is_enabled: enabled }
            : pref
        )
      );

      toast.success(enabled ? 'Tracking aktiviert' : 'Tracking deaktiviert');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Fehler beim Aktualisieren der Einstellung');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tracking-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-muted animate-pulse rounded" />
                  <div className="space-y-1">
                    <div className="w-32 h-4 bg-muted animate-pulse rounded" />
                    <div className="w-48 h-3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
                <div className="w-10 h-6 bg-muted animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Tracking-Einstellungen
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Wählen Sie aus, welche Daten Sie verfolgen möchten. Nur aktivierte Bereiche werden in der App angezeigt.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trackingOptions.map(option => {
            const preference = preferences.find(p => p.tracking_type === option.type);
            const IconComponent = option.icon;
            const isEnabled = preference?.is_enabled || false;
            const isUpdating = updating === option.type;

            return (
              <div 
                key={option.type}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  option.isDefault ? 'bg-muted/50 border-muted-foreground/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`h-5 w-5 ${
                    option.isDefault ? 'text-muted-foreground' : 'text-primary'
                  }`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-medium ${
                        option.isDefault ? 'text-muted-foreground' : ''
                      }`}>
                        {option.label}
                      </h4>
                      {option.isDefault && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          Standard
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${
                      option.isDefault ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`}>
                      {option.description}
                    </p>
                  </div>
                </div>
                
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => updatePreference(option.type, checked)}
                  disabled={option.isDefault || isUpdating}
                  className={option.isDefault ? 'opacity-50' : ''}
                />
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Hinweis:</strong> Die Ernährungseingabe ist immer aktiviert, da sie die Kernfunktion der App darstellt. 
            Andere Tracking-Bereiche können je nach Ihren Zielen und Präferenzen aktiviert oder deaktiviert werden.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};