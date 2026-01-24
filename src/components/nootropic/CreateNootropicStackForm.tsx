import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getSubstancesByCategory } from "@/constants/phase2Substances";
import { useNootropicStacks } from "@/hooks/useNootropicStacks";
import { Brain, Clock, Info } from "lucide-react";

interface CreateNootropicStackFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TIMING_OPTIONS = [
  { id: 'morning', label: 'Morgens', description: 'Nach dem Aufwachen', icon: '🌅' },
  { id: 'pre_work', label: 'Vor der Arbeit', description: '30 Min vor Arbeitsstart', icon: '💼' },
  { id: 'split_am_pm', label: 'Aufgeteilt', description: 'Morgens + Nachmittags', icon: '🔄' },
];

export function CreateNootropicStackForm({ onSuccess, onCancel }: CreateNootropicStackFormProps) {
  const { createStack } = useNootropicStacks();
  const nootropics = getSubstancesByCategory('nootropic');
  
  const [substanceName, setSubstanceName] = useState('');
  const [doseMcg, setDoseMcg] = useState(200);
  const [timing, setTiming] = useState('morning');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSubstance = nootropics.find(s => s.id === substanceName);

  const handleSubmit = async () => {
    if (!substanceName) return;

    setIsSubmitting(true);
    try {
      await createStack({
        substance_name: substanceName,
        dose_mcg: doseMcg,
        timing,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Neuer Nootropic-Stack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Substanz-Auswahl */}
        <div className="space-y-2">
          <Label>Substanz</Label>
          <Select value={substanceName} onValueChange={setSubstanceName}>
            <SelectTrigger>
              <SelectValue placeholder="Nootropikum wählen..." />
            </SelectTrigger>
            <SelectContent>
              {nootropics.map((substance) => (
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

        {substanceName && (
          <>
            {/* Dosierung */}
            <div className="space-y-2">
              <Label>Dosierung (mcg)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={doseMcg}
                  onChange={(e) => setDoseMcg(parseInt(e.target.value) || 0)}
                  className="w-24"
                  step={50}
                  min={100}
                  max={600}
                />
                <span className="text-sm text-muted-foreground">mcg nasal</span>
              </div>
              {selectedSubstance && (
                <p className="text-xs text-muted-foreground">
                  Empfohlen: {selectedSubstance.defaultDose}{selectedSubstance.defaultUnit}
                </p>
              )}
            </div>

            {/* Timing */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timing
              </Label>
              <RadioGroup value={timing} onValueChange={setTiming} className="space-y-2">
                {TIMING_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3">
                    <RadioGroupItem
                      value={option.id}
                      id={option.id}
                      checked={timing === option.id}
                      onClick={() => setTiming(option.id)}
                    />
                    <Label htmlFor={option.id} className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xl">{option.icon}</span>
                      <div>
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{option.description}</span>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Zyklus-Info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Automatisches Zyklus-Management:</p>
                  <p className="text-muted-foreground">
                    4 Wochen aktiv → 2 Wochen Pause → Wiederholen
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={!substanceName || isSubmitting}>
          {isSubmitting ? "Erstelle..." : "Stack erstellen"}
        </Button>
      </CardFooter>
    </Card>
  );
}
