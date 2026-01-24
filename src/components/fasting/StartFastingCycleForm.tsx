import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Droplets, Apple, Bone, AlertTriangle, Pill, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartFastingCycleFormProps {
  onStart: (input: {
    fasting_type: 'water_only' | 'fmd' | 'bone_broth';
    planned_duration_days: number;
    supplements_to_pause: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

const FASTING_TYPES = [
  { 
    id: 'water_only', 
    name: 'Wasserfasten', 
    icon: <Droplets className="w-5 h-5" />,
    description: 'Nur Wasser, Tee, schwarzer Kaffee',
    intensity: 'Hoch',
  },
  { 
    id: 'bone_broth', 
    name: 'Bone Broth Fast', 
    icon: <Bone className="w-5 h-5" />,
    description: 'Wasser + Knochenbrühe (200-500 kcal/Tag)',
    intensity: 'Mittel',
  },
  { 
    id: 'fmd', 
    name: 'FMD (Fasting Mimicking)', 
    icon: <Apple className="w-5 h-5" />,
    description: 'ProLon-Stil: ~800 kcal/Tag, pflanzlich',
    intensity: 'Niedrig',
  },
] as const;

const DURATION_OPTIONS = [
  { days: 3, label: '3 Tage', description: 'Kurz, Einstieg' },
  { days: 5, label: '5 Tage', description: 'Standard, empfohlen' },
  { days: 7, label: '7 Tage', description: 'Erweitert' },
];

const SUPPLEMENTS_TO_PAUSE = [
  { id: 'nmn', name: 'NMN/NAD+', reason: 'Kann Autophagie hemmen' },
  { id: 'protein', name: 'Protein/BCAAs', reason: 'Aktiviert mTOR' },
  { id: 'creatine', name: 'Kreatin', reason: 'Nicht essentiell beim Fasten' },
  { id: 'fish_oil', name: 'Fischöl', reason: 'Kalorien vorhanden' },
];

export function StartFastingCycleForm({ onStart, onCancel }: StartFastingCycleFormProps) {
  const [fastingType, setFastingType] = useState<'water_only' | 'fmd' | 'bone_broth'>('water_only');
  const [durationDays, setDurationDays] = useState(5);
  const [pausedSupplements, setPausedSupplements] = useState<string[]>(['nmn', 'protein']);
  const [electrolytes, setElectrolytes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSupplementToggle = (supplementId: string, checked: boolean) => {
    if (checked) {
      setPausedSupplements(prev => [...prev, supplementId]);
    } else {
      setPausedSupplements(prev => prev.filter(id => id !== supplementId));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onStart({
        fasting_type: fastingType,
        planned_duration_days: durationDays,
        supplements_to_pause: pausedSupplements,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Extended Fasten starten
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Fasting Type */}
        <div>
          <Label className="mb-3 block">Fasten-Typ</Label>
          <RadioGroup
            value={fastingType}
            onValueChange={(v) => setFastingType(v as typeof fastingType)}
            className="space-y-2"
          >
            {FASTING_TYPES.map((type) => (
              <label
                key={type.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors",
                  fastingType === type.id 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={type.id} className="sr-only" />
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  fastingType === type.id ? "bg-primary/10 text-primary" : "bg-muted"
                )}>
                  {type.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Intensität: {type.intensity}
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Duration */}
        <div>
          <Label className="mb-3 block">Geplante Dauer</Label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setDurationDays(opt.days)}
                className={cn(
                  "p-3 rounded-lg border-2 text-center transition-colors",
                  durationDays === opt.days 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="font-bold text-lg">{opt.days}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Supplements to Pause */}
        <div>
          <Label className="mb-3 block flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Supplements pausieren
          </Label>
          <div className="space-y-2">
            {SUPPLEMENTS_TO_PAUSE.map((supp) => (
              <label
                key={supp.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={pausedSupplements.includes(supp.id)}
                  onCheckedChange={(checked) => handleSupplementToggle(supp.id, checked === true)}
                />
                <div className="flex-1">
                  <span className="font-medium">{supp.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({supp.reason})
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Electrolytes Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <div className="font-medium">Elektrolyte beibehalten</div>
            <div className="text-sm text-muted-foreground">
              Natrium, Kalium, Magnesium (LMNT, etc.)
            </div>
          </div>
          <Switch checked={electrolytes} onCheckedChange={setElectrolytes} />
        </div>

        {/* Warning */}
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Extended Fasten ist für erfahrene Faster. Bei Unwohlsein, Schwindel oder starker Schwäche 
            bitte das Fasten abbrechen. Konsultiere einen Arzt vor längerem Fasten.
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Starte..." : `${durationDays}-Tage Fasten starten`}
        </Button>
      </CardFooter>
    </Card>
  );
}
