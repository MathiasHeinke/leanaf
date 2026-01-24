import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getSubstancesByCategory, Phase2Substance } from "@/constants/phase2Substances";
import { useMitochondrialProtocols } from "@/hooks/useMitochondrialProtocols";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CreateMitochondrialProtocolFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mo' },
  { id: 'tuesday', label: 'Di' },
  { id: 'wednesday', label: 'Mi' },
  { id: 'thursday', label: 'Do' },
  { id: 'friday', label: 'Fr' },
  { id: 'saturday', label: 'Sa' },
  { id: 'sunday', label: 'So' },
];

export function CreateMitochondrialProtocolForm({ onSuccess, onCancel }: CreateMitochondrialProtocolFormProps) {
  const { createProtocol } = useMitochondrialProtocols();
  const mitoSubstances = getSubstancesByCategory('mitochondrial');

  const [selectedSubstance, setSelectedSubstance] = useState<Phase2Substance | null>(null);
  const [doseAmount, setDoseAmount] = useState(0);
  const [preferredDays, setPreferredDays] = useState<string[]>(['monday', 'wednesday', 'friday']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubstanceChange = (substanceId: string) => {
    const substance = mitoSubstances.find(s => s.id === substanceId);
    if (substance) {
      setSelectedSubstance(substance);
      setDoseAmount(substance.defaultDose);
    }
  };

  const toggleDay = (dayId: string) => {
    setPreferredDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedSubstance || preferredDays.length === 0) return;

    setIsSubmitting(true);
    try {
      await createProtocol({
        substance_name: selectedSubstance.id,
        dose_amount: doseAmount,
        dose_unit: selectedSubstance.defaultUnit,
        timing: selectedSubstance.defaultTiming,
        frequency_per_week: preferredDays.length,
        preferred_days: preferredDays,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neues Mitochondrien-Protokoll</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Substanz-Auswahl */}
        <div className="space-y-2">
          <Label>Substanz</Label>
          <Select onValueChange={handleSubstanceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Substanz wählen..." />
            </SelectTrigger>
            <SelectContent>
              {mitoSubstances.map((substance) => (
                <SelectItem key={substance.id} value={substance.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{substance.name}</span>
                    <span className="text-xs text-muted-foreground">{substance.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSubstance && (
          <>
            {/* Dosierung */}
            <div className="space-y-2">
              <Label>Dosierung</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={doseAmount}
                  onChange={(e) => setDoseAmount(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{selectedSubstance.defaultUnit}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Empfohlen: {selectedSubstance.defaultDose}{selectedSubstance.defaultUnit}
              </p>
            </div>

            {/* Trainingstage */}
            <div className="space-y-2">
              <Label className="text-sm">Trainingstage (vor Zone 2 Cardio)</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.id}
                    type="button"
                    variant={preferredDays.includes(day.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day.id)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {preferredDays.length}x pro Woche ausgewählt
              </p>
            </div>

            {/* Zyklus-Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Zyklus-Schema:</p>
              <p className="text-sm text-muted-foreground">
                {selectedSubstance.cyclePattern.onPeriod} Wochen aktiv,
                dann {selectedSubstance.cyclePattern.offPeriod} Wochen Pause
              </p>
            </div>

            {/* Warnungen */}
            {selectedSubstance.warningsAndNotes.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Hinweise:</span>
                </div>
                <ul className="space-y-1">
                  {selectedSubstance.warningsAndNotes.map((note, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!selectedSubstance || preferredDays.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Erstelle...
            </>
          ) : (
            'Protokoll erstellen'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
