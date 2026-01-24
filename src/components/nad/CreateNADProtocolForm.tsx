import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNADTracking } from "@/hooks/useNADTracking";

interface CreateNADProtocolFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const SUPPLEMENT_TYPES = [
  { id: 'nmn', name: 'NMN', description: 'Nicotinamid-Mononukleotid', defaultDose: 500 },
  { id: 'nr', name: 'NR', description: 'Nicotinamid-Ribosid (Niagen)', defaultDose: 300 },
];

const FORMULATIONS = [
  { id: 'capsule', name: 'Kapsel' },
  { id: 'sublingual', name: 'Sublingual', note: 'Höhere Bioverfügbarkeit' },
  { id: 'liposomal', name: 'Liposomal', note: 'Beste Absorption' },
  { id: 'powder', name: 'Pulver' },
];

export function CreateNADProtocolForm({ onSuccess, onCancel }: CreateNADProtocolFormProps) {
  const { createProtocol } = useNADTracking();

  const [supplementType, setSupplementType] = useState('nmn');
  const [doseMg, setDoseMg] = useState(500);
  const [formulation, setFormulation] = useState('capsule');
  const [withResveratrol, setWithResveratrol] = useState(false);
  const [resveratrolDose, setResveratrolDose] = useState(200);
  const [brand, setBrand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSupplementChange = (type: string) => {
    setSupplementType(type);
    const supplement = SUPPLEMENT_TYPES.find(s => s.id === type);
    if (supplement) {
      setDoseMg(supplement.defaultDose);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createProtocol({
        supplement_type: supplementType,
        dose_mg: doseMg,
        formulation,
        timing: 'morning_fasted',
        with_resveratrol: withResveratrol,
        resveratrol_dose_mg: withResveratrol ? resveratrolDose : undefined,
        brand: brand || undefined,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>NAD+ Protokoll erstellen</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Supplement Type */}
        <div className="space-y-2">
          <Label>NAD+ Booster</Label>
          <Select value={supplementType} onValueChange={handleSupplementChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPLEMENT_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{type.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {type.description} - {type.defaultDose}mg
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dosierung */}
        <div className="space-y-2">
          <Label>Dosierung (mg)</Label>
          <Input
            type="number"
            value={doseMg}
            onChange={(e) => setDoseMg(parseInt(e.target.value) || 0)}
            step={100}
            min={100}
            max={1000}
          />
          <p className="text-xs text-muted-foreground">
            Empfohlen: {SUPPLEMENT_TYPES.find(s => s.id === supplementType)?.defaultDose}mg
          </p>
        </div>

        {/* Formulation */}
        <div className="space-y-2">
          <Label>Darreichungsform</Label>
          <Select value={formulation} onValueChange={setFormulation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMULATIONS.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  <span>{form.name}</span>
                  {form.note && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({form.note})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Resveratrol Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <Label>Mit Resveratrol kombinieren</Label>
            <p className="text-xs text-muted-foreground">
              Aktiviert Sirtuine synergistisch
            </p>
          </div>
          <Switch checked={withResveratrol} onCheckedChange={setWithResveratrol} />
        </div>

        {withResveratrol && (
          <div className="space-y-2 pl-4 border-l-2 border-purple-200">
            <Label>Resveratrol-Dosis (mg)</Label>
            <Input
              type="number"
              value={resveratrolDose}
              onChange={(e) => setResveratrolDose(parseInt(e.target.value) || 0)}
              step={50}
              min={100}
              max={500}
            />
            <p className="text-xs text-muted-foreground">
              Empfohlen: 200-500mg mit fetthaltiger Mahlzeit
            </p>
          </div>
        )}

        {/* Brand (optional) */}
        <div className="space-y-2">
          <Label>Marke (optional)</Label>
          <Input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="z.B. DoNotAge, ProHealth, etc."
          />
        </div>

        {/* Info */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">Timing: Morgens nüchtern</p>
          <p className="text-xs text-amber-700 mt-1">
            NAD+ Booster werden am besten morgens auf nüchternen Magen genommen.
            Sublingual/Liposomal bieten bessere Bioverfügbarkeit.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Abbrechen
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="flex-1 bg-orange-600 hover:bg-orange-700"
        >
          {isSubmitting ? "Erstelle..." : "Protokoll erstellen"}
        </Button>
      </CardFooter>
    </Card>
  );
}
