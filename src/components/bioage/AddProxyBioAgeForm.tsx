import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBioAge, ProxyInputs } from "@/hooks/useBioAge";
import { Calculator, AlertCircle } from "lucide-react";

interface AddProxyBioAgeFormProps {
  chronologicalAge: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface BloodValues {
  hba1c: string;
  hscrp: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
}

const OPTIMAL_RANGES = {
  hba1c: { min: 4.5, max: 5.5, unit: '%', label: 'HbA1c' },
  hscrp: { min: 0, max: 1, unit: 'mg/L', label: 'hsCRP' },
  ldl: { min: 70, max: 100, unit: 'mg/dL', label: 'LDL-Cholesterin' },
  hdl: { min: 60, max: 100, unit: 'mg/dL', label: 'HDL-Cholesterin' },
  triglycerides: { min: 50, max: 100, unit: 'mg/dL', label: 'Triglyceride' },
};

export function AddProxyBioAgeForm({ chronologicalAge, onSuccess, onCancel }: AddProxyBioAgeFormProps) {
  const { addProxyMeasurement, calculateProxyBioAge } = useBioAge();
  const [values, setValues] = useState<BloodValues>({
    hba1c: '',
    hscrp: '',
    ldl: '',
    hdl: '',
    triglycerides: '',
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateValue = (key: keyof BloodValues, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const parsedValues: ProxyInputs = {
    hba1c: parseFloat(values.hba1c) || 0,
    hscrp: parseFloat(values.hscrp) || 0,
    ldl: parseFloat(values.ldl) || 0,
    hdl: parseFloat(values.hdl) || 0,
    triglycerides: parseFloat(values.triglycerides) || 0,
  };

  const allFieldsFilled = Object.values(values).every(v => v !== '' && parseFloat(v) > 0);
  const previewBioAge = allFieldsFilled
    ? calculateProxyBioAge(parsedValues, chronologicalAge)
    : null;

  const getValueStatus = (key: keyof BloodValues): 'optimal' | 'warning' | 'danger' | 'empty' => {
    const val = parseFloat(values[key]);
    if (!val) return 'empty';
    const range = OPTIMAL_RANGES[key];
    if (val >= range.min && val <= range.max) return 'optimal';
    if (key === 'hdl' && val < range.min) return 'danger';
    if (key === 'ldl' && val > 130) return 'danger';
    if (key === 'hba1c' && val > 6.0) return 'danger';
    if (key === 'hscrp' && val > 3) return 'danger';
    return 'warning';
  };

  const statusColors = {
    optimal: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20',
    warning: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20',
    danger: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/20',
    empty: '',
  };

  const handleSubmit = async () => {
    if (!allFieldsFilled) return;

    setIsSubmitting(true);
    try {
      const success = await addProxyMeasurement(parsedValues, chronologicalAge, notes || undefined);
      if (success) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          Bio-Age aus Blutwerten berechnen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(OPTIMAL_RANGES) as Array<keyof typeof OPTIMAL_RANGES>).map((key) => {
            const range = OPTIMAL_RANGES[key];
            const status = getValueStatus(key);

            return (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="text-sm">
                  {range.label}
                  <span className="text-xs text-muted-foreground ml-1">
                    (Optimal: {range.min}-{range.max} {range.unit})
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={key}
                    type="number"
                    step="0.1"
                    value={values[key]}
                    onChange={(e) => updateValue(key, e.target.value)}
                    className={statusColors[status]}
                    placeholder={`${range.min}-${range.max}`}
                  />
                  <span className="text-xs text-muted-foreground w-16">{range.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview */}
        {previewBioAge !== null && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground">Berechnetes Bio-Age:</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{previewBioAge} Jahre</span>
              <span className={`text-sm font-medium ${previewBioAge - chronologicalAge < 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({previewBioAge - chronologicalAge > 0 ? '+' : ''}{previewBioAge - chronologicalAge} vs. chronologisch)
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notizen (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. Labor, Datum der Blutabnahme..."
            rows={2}
          />
        </div>

        {/* Warning */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800 dark:text-yellow-300">
            <p className="font-medium">Proxy-Berechnung</p>
            <p>
              Dies ist eine Näherung basierend auf Biomarkern.
              Für genaue Ergebnisse empfehlen wir einen echten DunedinPACE-Test.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button onClick={handleSubmit} disabled={!allFieldsFilled || isSubmitting}>
          {isSubmitting ? "Berechne..." : "Bio-Age berechnen"}
        </Button>
      </CardFooter>
    </Card>
  );
}
