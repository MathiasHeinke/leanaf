import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Pill, AlertTriangle, Shield, Heart, Loader2 } from "lucide-react";
import { useRapamycin } from "@/hooks/useRapamycin";

interface RapamycinLogFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function RapamycinLogForm({ onSuccess, onCancel }: RapamycinLogFormProps) {
  const { logDose, disclaimerAccepted, acceptDisclaimer } = useRapamycin();

  const [doseMg, setDoseMg] = useState(5);
  const [takenFasted, setTakenFasted] = useState(true);
  const [weightKg, setWeightKg] = useState<number | undefined>(undefined);
  const [systolic, setSystolic] = useState<number | undefined>(undefined);
  const [diastolic, setDiastolic] = useState<number | undefined>(undefined);
  const [infectionSigns, setInfectionSigns] = useState(false);
  const [notes, setNotes] = useState('');
  const [localDisclaimerAccepted, setLocalDisclaimerAccepted] = useState(disclaimerAccepted);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!localDisclaimerAccepted) {
      return;
    }

    if (infectionSigns) {
      // Block submission if infection signs
      return;
    }

    setIsSubmitting(true);
    try {
      if (!disclaimerAccepted) {
        acceptDisclaimer();
      }

      const result = await logDose({
        dose_mg: doseMg,
        taken_fasted: takenFasted,
        weight_kg: weightKg,
        blood_pressure_systolic: systolic,
        blood_pressure_diastolic: diastolic,
        infection_signs: infectionSigns,
        notes: notes || undefined,
      });

      if (result) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-blue-600" />
          Rapamycin-Dosis loggen
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Wöchentliche Einnahme dokumentieren
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Medical Disclaimer */}
        <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <Shield className="h-4 w-4" />
          <AlertTitle>Medizinischer Hinweis</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Rapamycin (Sirolimus) ist verschreibungspflichtig und sollte
              nur unter ärztlicher Aufsicht eingenommen werden.
            </p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>Regelmäßige Blutkontrollen erforderlich (Lipide, Blutzucker, Immunzellen)</li>
              <li>Kann Wundheilung verzögern - vor OPs absetzen</li>
              <li>Bei Infektionszeichen sofort pausieren</li>
              <li>Nicht geeignet bei Immunsuppression</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Disclaimer Checkbox */}
        <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/30">
          <Checkbox
            id="disclaimer"
            checked={localDisclaimerAccepted}
            onCheckedChange={(checked) => setLocalDisclaimerAccepted(checked as boolean)}
          />
          <div className="space-y-1">
            <Label htmlFor="disclaimer" className="text-sm font-medium cursor-pointer">
              Ich bestätige, dass ich dieses Medikament unter ärztlicher Aufsicht einnehme
            </Label>
            <p className="text-xs text-muted-foreground">
              Diese App ersetzt keine medizinische Beratung.
            </p>
          </div>
        </div>

        {/* Infektions-Check */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <p className="font-medium text-sm">Infektionszeichen?</p>
                <p className="text-xs text-muted-foreground">
                  Fieber, Halsschmerzen, Husten, etc.
                </p>
              </div>
            </div>
            <Switch
              checked={infectionSigns}
              onCheckedChange={setInfectionSigns}
            />
          </div>

          {infectionSigns && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Einnahme nicht empfohlen! Bei Infektionszeichen
                sollte Rapamycin pausiert werden. Bitte konsultiere deinen Arzt.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Dosierung */}
        <div className="space-y-3">
          <Label>Dosierung (mg)</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[doseMg]}
              min={1}
              max={10}
              step={0.5}
              onValueChange={(v) => setDoseMg(v[0])}
              className="flex-1"
            />
            <Input
              type="number"
              value={doseMg}
              onChange={(e) => setDoseMg(parseFloat(e.target.value) || 5)}
              className="w-20"
              min={1}
              max={10}
              step={0.5}
            />
            <span className="text-sm font-medium">mg</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Empfohlen: 5-6mg wöchentlich
          </p>
        </div>

        {/* Nüchtern */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium text-sm">Nüchtern eingenommen</p>
            <p className="text-xs text-muted-foreground">
              Empfohlen für optimale Absorption
            </p>
          </div>
          <Switch
            checked={takenFasted}
            onCheckedChange={setTakenFasted}
          />
        </div>

        {/* Optionale Vitaldaten */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <Label>Optionale Vitaldaten</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Gewicht (kg)</Label>
              <Input
                type="number"
                value={weightKg || ''}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || undefined)}
                placeholder="z.B. 75"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Blutdruck</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={systolic || ''}
                  onChange={(e) => setSystolic(parseInt(e.target.value) || undefined)}
                  placeholder="120"
                  className="w-16"
                />
                <span>/</span>
                <Input
                  type="number"
                  value={diastolic || ''}
                  onChange={(e) => setDiastolic(parseInt(e.target.value) || undefined)}
                  placeholder="80"
                  className="w-16"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notizen */}
        <div className="space-y-2">
          <Label>Notizen (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wie fühlst du dich? Besondere Beobachtungen?"
            rows={2}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !localDisclaimerAccepted || infectionSigns}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Speichere...
            </>
          ) : (
            "Dosis loggen"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
