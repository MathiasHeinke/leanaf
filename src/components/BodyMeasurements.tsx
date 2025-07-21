import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ruler, Camera, TrendingDown, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BodyMeasurement {
  id: string;
  date: string;
  chest?: number;
  waist?: number;
  belly?: number;
  hips?: number;
  thigh?: number;
  arms?: number;
  neck?: number;
  photo_url?: string;
}

export const BodyMeasurements = () => {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    chest: '',
    waist: '',
    belly: '',
    hips: '',
    thigh: '',
    arms: '',
    neck: ''
  });

  useEffect(() => {
    if (user) {
      loadMeasurements();
    }
  }, [user]);

  const loadMeasurements = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Check if at least one measurement is provided
    const hasAnyMeasurement = Object.values(formData).some(value => value !== '');
    if (!hasAnyMeasurement) {
      toast.error('Bitte mindestens einen Wert eingeben');
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const measurementData = {
        user_id: user.id,
        date: today,
        chest: formData.chest ? parseFloat(formData.chest) : null,
        waist: formData.waist ? parseFloat(formData.waist) : null,
        belly: formData.belly ? parseFloat(formData.belly) : null,
        hips: formData.hips ? parseFloat(formData.hips) : null,
        thigh: formData.thigh ? parseFloat(formData.thigh) : null,
        arms: formData.arms ? parseFloat(formData.arms) : null,
        neck: formData.neck ? parseFloat(formData.neck) : null
      };

      const { error } = await supabase
        .from('body_measurements')
        .upsert(measurementData, { onConflict: 'user_id,date' });

      if (error) throw error;

      toast.success('Körpermaße erfasst! 📏✨');
      
      // Reset form and reload data
      setFormData({
        chest: '',
        waist: '',
        belly: '',
        hips: '',
        thigh: '',
        arms: '',
        neck: ''
      });
      setShowForm(false);
      await loadMeasurements();
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Fehler beim Speichern der Maße');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLastMeasurement = () => {
    return measurements.length > 0 ? measurements[0] : null;
  };

  const getTrend = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous) return null;
    const diff = current - previous;
    return {
      value: Math.abs(diff),
      direction: diff < 0 ? 'down' : diff > 0 ? 'up' : 'same',
      isGood: diff < 0 // For body measurements, decrease is usually good
    };
  };

  const lastMeasurement = getLastMeasurement();
  const secondLastMeasurement = measurements.length > 1 ? measurements[1] : null;

  const measurementFields = [
    { key: 'belly', label: 'Bauchumfang', icon: '🏠', description: 'Über dem Bauchnabel' },
    { key: 'waist', label: 'Taille', icon: '⌛', description: 'Schmalste Stelle' },
    { key: 'chest', label: 'Brust', icon: '💪', description: 'Breiteste Stelle' },
    { key: 'hips', label: 'Hüfte', icon: '🍑', description: 'Breiteste Stelle' },
    { key: 'thigh', label: 'Oberschenkel', icon: '🦵', description: 'Dickste Stelle' },
    { key: 'arms', label: 'Arme', icon: '💪', description: 'Umfang am Bizeps' },
    { key: 'neck', label: 'Hals', icon: '🦒', description: 'Halsumfang' }
  ];

  if (loading) {
    return <Card className="p-6"><div>Lade Körpermaße...</div></Card>;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50/50 via-purple-25/30 to-purple-50/20 dark:from-purple-950/20 dark:via-purple-950/10 dark:to-purple-950/5 border-purple-200/30 dark:border-purple-800/30">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Körpermaße</h3>
              <p className="text-sm text-muted-foreground">Die Waage lügt, Maße nicht!</p>
            </div>
          </div>
          
          {!showForm && (
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Ruler className="h-4 w-4 mr-2" />
              Messen
            </Button>
          )}
        </div>

        {/* Measurement Form */}
        {showForm && (
          <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200/50 dark:border-purple-800/50">
              <h4 className="font-medium mb-3 text-purple-700 dark:text-purple-300">Neue Messung (in cm)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {measurementFields.map(({ key, label, icon, description }) => (
                  <div key={key}>
                    <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2 mb-2">
                      <span>{icon}</span>
                      {label}
                      <span className="text-xs text-muted-foreground">({description})</span>
                    </Label>
                    <Input
                      id={key}
                      type="number"
                      step="0.1"
                      placeholder="z.B. 85.5"
                      value={formData[key as keyof typeof formData]}
                      onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                      className="border-purple-200 dark:border-purple-800"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 mt-4">
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  {isSubmitting ? 'Speichere...' : 'Maße speichern'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="border-purple-200 dark:border-purple-800"
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Last Measurements Display */}
        {lastMeasurement && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Letzte Messung
              </h4>
              <Badge variant="outline" className="border-purple-200 dark:border-purple-800">
                {format(new Date(lastMeasurement.date), 'dd. MMM yyyy', { locale: de })}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {measurementFields.map(({ key, label, icon }) => {
                const current = lastMeasurement[key as keyof BodyMeasurement] as number;
                const previous = secondLastMeasurement?.[key as keyof BodyMeasurement] as number;
                const trend = getTrend(current, previous);
                
                if (!current) return null;
                
                return (
                  <div key={key} className="p-3 bg-white/50 dark:bg-gray-800/30 rounded-xl border border-purple-200/30 dark:border-purple-800/30">
                    <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                      <span>{icon}</span>
                      {label}
                    </div>
                    <div className="text-lg font-bold">{current} cm</div>
                    {trend && (
                      <div className={`text-xs flex items-center gap-1 mt-1 ${
                        trend.isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        <TrendingDown className={`h-3 w-3 ${trend.direction === 'up' ? 'rotate-180' : ''}`} />
                        {trend.direction === 'down' ? '-' : '+'}{trend.value.toFixed(1)} cm
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Motivation */}
            {secondLastMeasurement && (
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-xl border border-purple-200/30 dark:border-purple-800/30">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-700 dark:text-purple-300">Fortschritt</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {measurements.length > 1 ? 
                    "Weiter so! Konsistente Messungen zeigen deinen echten Fortschritt. 💪" :
                    "Erste Messung erfasst! Miss nächste Woche wieder für deinen Fortschritt. 📏"
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {measurements.length === 0 && !showForm && (
          <div className="text-center py-8">
            <Ruler className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h4 className="font-medium mb-2">Noch keine Messungen</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Starte mit deiner ersten Messung - der echte Fortschritt zeigt sich in den Maßen!
            </p>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Erste Messung
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};