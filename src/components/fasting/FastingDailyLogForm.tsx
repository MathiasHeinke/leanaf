import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { NumericInput } from "@/components/ui/numeric-input";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { DailyFastingLog } from "@/hooks/useExtendedFasting";
import { Scale, Droplets, Battery, Smile, Cookie, FileText } from "lucide-react";

interface FastingDailyLogFormProps {
  currentDay: number;
  onSubmit: (log: Omit<DailyFastingLog, 'day' | 'logged_at'>) => Promise<void>;
  onCancel: () => void;
}

export function FastingDailyLogForm({ currentDay, onSubmit, onCancel }: FastingDailyLogFormProps) {
  const [weightKg, setWeightKg] = useState("");
  const [ketonesMMol, setKetonesMMol] = useState("");
  const [glucoseMgDl, setGlucoseMgDl] = useState("");
  const [energy, setEnergy] = useState([5]);
  const [mood, setMood] = useState([5]);
  const [hunger, setHunger] = useState([5]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        weight_kg: weightKg ? parseLocaleFloat(weightKg) : undefined,
        ketones_mmol: ketonesMMol ? parseLocaleFloat(ketonesMMol) : undefined,
        glucose_mg_dl: glucoseMgDl ? parseLocaleFloat(glucoseMgDl) : undefined,
        energy: energy[0],
        mood: mood[0],
        hunger: hunger[0],
        notes: notes || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSliderColor = (value: number, type: 'energy' | 'mood' | 'hunger') => {
    if (type === 'hunger') {
      // For hunger, lower is better during fasting
      if (value <= 3) return 'text-emerald-500';
      if (value <= 6) return 'text-yellow-500';
      return 'text-red-500';
    }
    // For energy and mood, higher is better
    if (value >= 7) return 'text-emerald-500';
    if (value >= 4) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Tag {currentDay} Log
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Measurements Row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-1 mb-2">
              <Scale className="w-4 h-4" />
              Gewicht (kg)
            </Label>
            <NumericInput
              value={weightKg}
              onChange={setWeightKg}
              placeholder="75,5"
              allowDecimals
            />
          </div>
          
          <div>
            <Label className="flex items-center gap-1 mb-2">
              <Droplets className="w-4 h-4" />
              Ketone (mmol/L)
            </Label>
            <NumericInput
              value={ketonesMMol}
              onChange={setKetonesMMol}
              placeholder="1,5"
              allowDecimals
            />
          </div>
          
          <div>
            <Label className="flex items-center gap-1 mb-2">
              <Droplets className="w-4 h-4" />
              Glukose (mg/dL)
            </Label>
            <NumericInput
              value={glucoseMgDl}
              onChange={setGlucoseMgDl}
              placeholder="80"
              allowDecimals={false}
            />
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          {/* Energy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1">
                <Battery className="w-4 h-4" />
                Energie
              </Label>
              <span className={`font-medium ${getSliderColor(energy[0], 'energy')}`}>
                {energy[0]}/10
              </span>
            </div>
            <Slider
              value={energy}
              onValueChange={setEnergy}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Mood */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1">
                <Smile className="w-4 h-4" />
                Stimmung
              </Label>
              <span className={`font-medium ${getSliderColor(mood[0], 'mood')}`}>
                {mood[0]}/10
              </span>
            </div>
            <Slider
              value={mood}
              onValueChange={setMood}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          {/* Hunger */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1">
                <Cookie className="w-4 h-4" />
                Hunger
              </Label>
              <span className={`font-medium ${getSliderColor(hunger[0], 'hunger')}`}>
                {hunger[0]}/10
              </span>
            </div>
            <Slider
              value={hunger}
              onValueChange={setHunger}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="mb-2 block">Notizen (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wie fühlst du dich heute?"
            rows={3}
          />
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Speichere..." : "Tag abschließen"}
        </Button>
      </CardFooter>
    </Card>
  );
}
