import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPhase3SubstanceById, getMaintenanceSubstances, getLongevitySubstances } from "@/constants/phase3Substances";
import { useMaintenanceProtocols } from "@/hooks/useMaintenanceProtocols";
import { Loader2, Info } from "lucide-react";

interface CreateMaintenanceProtocolFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const TIMING_OPTIONS = [
  { id: 'morning', label: 'Morgens', description: 'Direkt nach dem Aufwachen' },
  { id: 'evening', label: 'Abends', description: 'Vor dem Abendessen' },
  { id: 'with_food', label: 'Mit Mahlzeit', description: 'Zu einer Hauptmahlzeit' },
  { id: 'before_bed', label: 'Vor dem Schlafen', description: 'Direkt vor dem Einschlafen' },
  { id: 'split', label: 'Aufgeteilt', description: 'Morgens und Abends' },
];

// Additional substances not in phase3Substances
const ADDITIONAL_SUBSTANCES = [
  { id: 'ca_akg', name: 'Ca-AKG', description: 'Calcium Alpha-Ketoglutarat - Langlebigkeit', defaultDose: 1, defaultUnit: 'g' as const },
  { id: 'glycine', name: 'Glycin', description: 'Aminosäure - Schlaf & Kollagen', defaultDose: 3, defaultUnit: 'g' as const },
  { id: 'nad_maintenance', name: 'NAD+ (NMN)', description: 'NAD+ Precursor - Erhaltungsdosis', defaultDose: 250, defaultUnit: 'mg' as const },
];

export function CreateMaintenanceProtocolForm({ onSuccess, onCancel }: CreateMaintenanceProtocolFormProps) {
  const { createProtocol } = useMaintenanceProtocols();
  const maintenanceSubstances = getMaintenanceSubstances();
  const longevitySubstances = getLongevitySubstances();

  const [selectedSubstanceId, setSelectedSubstanceId] = useState('');
  const [doseAmount, setDoseAmount] = useState(0);
  const [doseUnit, setDoseUnit] = useState<'mg' | 'g' | 'mcg'>('mg');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'every_10_14_days' | 'twice_daily'>('daily');
  const [frequencyDays, setFrequencyDays] = useState(12);
  const [timing, setTiming] = useState('morning');
  const [continuedFromPhase, setContinuedFromPhase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedSubstance = selectedSubstanceId
    ? getPhase3SubstanceById(selectedSubstanceId)
    : null;

  const handleSubstanceChange = (substanceId: string) => {
    setSelectedSubstanceId(substanceId);
    
    // Check phase3 substances first
    const phase3Sub = getPhase3SubstanceById(substanceId);
    if (phase3Sub) {
      setDoseAmount(phase3Sub.defaultDose);
      setDoseUnit(phase3Sub.defaultUnit);
      
      if (phase3Sub.cyclePattern.type === 'continuous') {
        setFrequency('daily');
      } else if (phase3Sub.cyclePattern.type === 'interval') {
        if (phase3Sub.cyclePattern.activeDays === 1 && phase3Sub.cyclePattern.restDays <= 7) {
          setFrequency('weekly');
        } else {
          setFrequency('every_10_14_days');
          setFrequencyDays(phase3Sub.cyclePattern.restDays + 1);
        }
      }
      return;
    }

    // Check additional substances
    const additional = ADDITIONAL_SUBSTANCES.find(s => s.id === substanceId);
    if (additional) {
      setDoseAmount(additional.defaultDose);
      setDoseUnit(additional.defaultUnit);
      setFrequency('daily');
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubstanceId) return;

    setIsSubmitting(true);
    try {
      await createProtocol({
        substance_name: selectedSubstanceId,
        dose_amount: doseAmount,
        dose_unit: doseUnit,
        frequency,
        frequency_days: frequency === 'every_10_14_days' ? frequencyDays : undefined,
        timing,
        continued_from_phase: continuedFromPhase ? 1 : undefined,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSubstances = [
    ...maintenanceSubstances,
    ...longevitySubstances,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neues Maintenance-Protokoll</CardTitle>
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
              {/* Phase 3 substances */}
              {allSubstances.map((substance) => (
                <SelectItem key={substance.id} value={substance.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{substance.name}</span>
                    <span className="text-xs text-muted-foreground">{substance.description}</span>
                  </div>
                </SelectItem>
              ))}
              
              {/* Additional substances */}
              {ADDITIONAL_SUBSTANCES.map((substance) => (
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

        {selectedSubstanceId && (
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
                  step={doseUnit === 'g' ? 0.1 : 1}
                />
                <Select value={doseUnit} onValueChange={(v) => setDoseUnit(v as 'mg' | 'g' | 'mcg')}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg">mg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="mcg">mcg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Frequenz */}
            <div className="space-y-2">
              <Label>Frequenz</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Täglich</SelectItem>
                  <SelectItem value="twice_daily">2x Täglich</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                  <SelectItem value="every_10_14_days">Alle X Tage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Intervall-Tage */}
            {frequency === 'every_10_14_days' && (
              <div className="space-y-2">
                <Label>Intervall (Tage)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={frequencyDays}
                    onChange={(e) => setFrequencyDays(parseInt(e.target.value) || 10)}
                    min={5}
                    max={30}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">Tage</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Empfohlen: 10-14 Tage für Reta Micro
                </p>
              </div>
            )}

            {/* Timing */}
            <div className="space-y-2">
              <Label>Timing</Label>
              <Select value={timing} onValueChange={setTiming}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        - {opt.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fortgesetzt von */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Fortgesetzt von Phase 1/2</Label>
                <p className="text-xs text-muted-foreground">
                  z.B. TRT von Phase 1 weitergeführt
                </p>
              </div>
              <Switch
                checked={continuedFromPhase}
                onCheckedChange={setContinuedFromPhase}
              />
            </div>

            {/* Substanz-Hinweise */}
            {selectedSubstance && selectedSubstance.warningsAndNotes.length > 0 && (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Hinweise zu {selectedSubstance.name}:</p>
                  <ul className="text-sm space-y-1">
                    {selectedSubstance.warningsAndNotes.slice(0, 2).map((note, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-muted-foreground">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
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
          disabled={!selectedSubstanceId || isSubmitting}
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
