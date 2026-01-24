import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, Leaf } from 'lucide-react';
import { useSenolytCycles, type SenolytCycle } from '@/hooks/useSenolytCycles';

interface SenolytDoseLoggerProps {
  cycle: SenolytCycle;
  onLogged: () => void;
}

const SIDE_EFFECTS = [
  { id: 'none', label: 'Keine', severity: 0 },
  { id: 'mild_fatigue', label: 'Leichte Müdigkeit', severity: 1 },
  { id: 'moderate_fatigue', label: 'Moderate Müdigkeit', severity: 2 },
  { id: 'headache', label: 'Kopfschmerzen', severity: 2 },
  { id: 'gi_discomfort', label: 'Magen-Darm Beschwerden', severity: 2 },
  { id: 'muscle_aches', label: 'Muskelschmerzen', severity: 2 },
  { id: 'severe', label: 'Starke Nebenwirkungen', severity: 3 },
];

export function SenolytDoseLogger({ cycle, onLogged }: SenolytDoseLoggerProps) {
  const { logDose } = useSenolytCycles();
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    setIsLogging(true);
    try {
      const effect = SIDE_EFFECTS.find(e => e.id === selectedEffect);
      const sideEffect = effect && effect.id !== 'none' 
        ? { effect: effect.label, severity: effect.severity }
        : undefined;

      await logDose(cycle.id, sideEffect);
      setNotes('');
      setSelectedEffect('none');
      onLogged();
    } finally {
      setIsLogging(false);
    }
  };

  const getDoseDisplay = () => {
    if (cycle.senolytic_type === 'quercetin_dasatinib') {
      return `Dasatinib ${cycle.primary_dose_mg}mg + Quercetin ${cycle.secondary_dose_mg}mg`;
    }
    return `Fisetin ${cycle.primary_dose_mg}mg`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-green-500" />
          <CardTitle className="text-base">Dosis loggen - Tag {cycle.current_day}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Dose */}
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="text-sm font-medium">{getDoseDisplay()}</span>
        </div>

        {/* Side Effects Selector */}
        <div className="space-y-2">
          <Label>Nebenwirkungen</Label>
          <Select value={selectedEffect} onValueChange={setSelectedEffect}>
            <SelectTrigger>
              <SelectValue placeholder="Nebenwirkungen auswählen" />
            </SelectTrigger>
            <SelectContent>
              {SIDE_EFFECTS.map((effect) => (
                <SelectItem key={effect.id} value={effect.id}>
                  {effect.label}
                  {effect.severity > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      (Schwere: {effect.severity}/3)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notizen (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wie fühlst du dich heute?"
            rows={2}
          />
        </div>

        {/* Log Button */}
        <Button 
          className="w-full" 
          onClick={handleLog}
          disabled={isLogging}
        >
          {isLogging ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          {cycle.current_day >= cycle.duration_days ? 'Zyklus abschließen' : 'Dosis loggen'}
        </Button>

        {/* Warning if last day */}
        {cycle.current_day >= cycle.duration_days && (
          <p className="text-xs text-center text-muted-foreground">
            Dies ist der letzte Tag des Hit-and-Run Zyklus. 
            Nach dem Loggen wird der Zyklus abgeschlossen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
