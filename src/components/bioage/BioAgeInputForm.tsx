import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLongtermBioAge, AddMeasurementInput } from "@/hooks/useLongtermBioAge";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { Loader2 } from "lucide-react";

interface BioAgeInputFormProps {
  chronologicalAge: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const TEST_TYPES: { id: 'truage' | 'glycanage' | 'dunedinpace' | 'proxy' | 'other'; name: string; description: string }[] = [
  { id: 'truage', name: 'TruAge (Epigenetic)', description: 'DunedinPACE + Multiple Clocks' },
  { id: 'glycanage', name: 'GlycanAge', description: 'Glycan-basierte Messung' },
  { id: 'dunedinpace', name: 'DunedinPACE Only', description: 'Nur PACE Score' },
  { id: 'proxy', name: 'Proxy (Blutwerte)', description: 'Berechnung aus Biomarkern' },
  { id: 'other', name: 'Anderer Test', description: 'Sonstiger epigenetischer Test' },
];

export function BioAgeInputForm({ chronologicalAge, onSuccess, onCancel }: BioAgeInputFormProps) {
  const { addMeasurement } = useLongtermBioAge();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [testType, setTestType] = useState<'truage' | 'glycanage' | 'dunedinpace' | 'proxy' | 'other' | ''>('');
  const [dunedinPace, setDunedinPace] = useState('');
  const [biologicalAge, setBiologicalAge] = useState('');
  const [horvathAge, setHorvathAge] = useState('');
  const [phenoAge, setPhenoAge] = useState('');
  const [grimAge, setGrimAge] = useState('');
  const [telomereLength, setTelomereLength] = useState('');
  const [testProvider, setTestProvider] = useState('');
  const [notes, setNotes] = useState('');

  const parsedBioAge = parseLocaleFloat(biologicalAge);
  const parsedPace = parseLocaleFloat(dunedinPace);
  
  const isValid = testType !== '' && biologicalAge && !isNaN(parsedBioAge) && parsedBioAge > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      const input: AddMeasurementInput = {
        chronological_age_years: chronologicalAge,
        biological_age: parsedBioAge,
        test_type: testType as 'truage' | 'glycanage' | 'dunedinpace' | 'proxy' | 'other',
        test_provider: testProvider || undefined,
        dunedin_pace: !isNaN(parsedPace) && parsedPace > 0 ? parsedPace : undefined,
        horvath_clock_age: horvathAge ? parseLocaleFloat(horvathAge) : undefined,
        phenoage: phenoAge ? parseLocaleFloat(phenoAge) : undefined,
        grimage: grimAge ? parseLocaleFloat(grimAge) : undefined,
        telomere_length_kb: telomereLength ? parseLocaleFloat(telomereLength) : undefined,
        notes: notes || undefined,
      };
      
      const result = await addMeasurement(input);
      if (result) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Bio-Age Messung hinzufügen</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Test Type */}
        <div className="space-y-2">
          <Label>Test-Typ *</Label>
          <Select value={testType} onValueChange={(v) => setTestType(v as typeof testType)}>
            <SelectTrigger>
              <SelectValue placeholder="Test-Typ wählen" />
            </SelectTrigger>
            <SelectContent>
              {TEST_TYPES.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex flex-col">
                    <span>{type.name}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Biological Age */}
        <div className="space-y-2">
          <Label>Biologisches Alter (Jahre) *</Label>
          <NumericInput
            value={biologicalAge}
            onChange={setBiologicalAge}
            placeholder="z.B. 35"
            min={10}
            max={120}
          />
          <p className="text-xs text-muted-foreground">
            Chronologisches Alter: {chronologicalAge} Jahre
          </p>
        </div>

        {/* DunedinPACE */}
        <div className="space-y-2">
          <Label>DunedinPACE Score (optional)</Label>
          <NumericInput
            value={dunedinPace}
            onChange={setDunedinPace}
            placeholder="z.B. 0.85"
            min={0.4}
            max={1.5}
          />
          <p className="text-xs text-muted-foreground">
            Optimal: unter 0.85 (langsamer altern)
          </p>
        </div>

        {/* Advanced Clocks - Collapsible in future */}
        {(testType === 'truage' || testType === 'other') && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-xs">Horvath Clock</Label>
              <NumericInput
                value={horvathAge}
                onChange={setHorvathAge}
                placeholder="Jahre"
                min={10}
                max={120}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">PhenoAge</Label>
              <NumericInput
                value={phenoAge}
                onChange={setPhenoAge}
                placeholder="Jahre"
                min={10}
                max={120}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">GrimAge</Label>
              <NumericInput
                value={grimAge}
                onChange={setGrimAge}
                placeholder="Jahre"
                min={10}
                max={120}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Telomere (kb)</Label>
              <NumericInput
                value={telomereLength}
                onChange={setTelomereLength}
                placeholder="z.B. 7.5"
                min={1}
                max={20}
              />
            </div>
          </div>
        )}

        {/* Provider */}
        <div className="space-y-2">
          <Label>Test-Anbieter (optional)</Label>
          <NumericInput
            value={testProvider}
            onChange={setTestProvider}
            placeholder="z.B. TruDiagnostic, Elysium"
            allowDecimals={false}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notizen (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Weitere Beobachtungen..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}
