import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SubstanceSelector, PHASE_1_SUBSTANCES } from "./SubstanceSelector";
import { DoseInput } from "./DoseInput";
import { TimingSelector } from "./TimingSelector";
import { CyclePatternSelector } from "./CyclePatternSelector";
import { RetatrutidTitrationEditor, DEFAULT_TITRATION, TitrationSchedule } from "./RetatrutidTitrationEditor";
import { useToast } from "@/hooks/use-toast";

export interface ProtocolFormData {
  substance_name: string;
  dose_amount: number;
  dose_unit: string;
  timing: string;
  cycle_pattern: string;
  titration_schedule: TitrationSchedule | null;
}

interface CreateProtocolFormProps {
  onSubmit: (data: ProtocolFormData) => Promise<void>;
  onCancel: () => void;
}

export function CreateProtocolForm({ onSubmit, onCancel }: CreateProtocolFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProtocolFormData>({
    substance_name: '',
    dose_amount: 0,
    dose_unit: 'mg',
    timing: 'evening_fasted',
    cycle_pattern: 'continuous',
    titration_schedule: null,
  });

  // Auto-fill defaults when substance changes
  const handleSubstanceChange = (substanceId: string) => {
    const substance = PHASE_1_SUBSTANCES.find(s => s.id === substanceId);
    if (substance) {
      setFormData(prev => ({
        ...prev,
        substance_name: substanceId,
        dose_amount: substance.defaultDose,
        dose_unit: substance.defaultUnit,
        timing: substance.defaultTiming,
        // Set default cycle for specific substances
        cycle_pattern: substanceId === 'cjc_1295_ipamorelin' ? '5on_2off' :
          substanceId === 'bpc_157' ? '6weeks_on_pause' : 'continuous',
        titration_schedule: substanceId === 'retatrutid' ? DEFAULT_TITRATION : null,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.substance_name) {
      toast({
        title: "Fehler",
        description: "Bitte wähle eine Substanz aus",
        variant: "destructive",
      });
      return;
    }

    if (formData.dose_amount <= 0) {
      toast({
        title: "Fehler",
        description: "Bitte gib eine gültige Dosierung ein",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast({
        title: "Protokoll erstellt",
        description: `${formData.substance_name} wurde hinzugefügt`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Protokoll konnte nicht erstellt werden",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRetatrutid = formData.substance_name === 'retatrutid';

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Neues Protokoll erstellen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SubstanceSelector
          value={formData.substance_name}
          onChange={handleSubstanceChange}
        />

        {formData.substance_name && (
          <>
            <DoseInput
              amount={formData.dose_amount}
              unit={formData.dose_unit}
              onAmountChange={(amount) => setFormData(prev => ({ ...prev, dose_amount: amount }))}
              onUnitChange={(unit) => setFormData(prev => ({ ...prev, dose_unit: unit }))}
            />

            <TimingSelector
              value={formData.timing}
              onChange={(timing) => setFormData(prev => ({ ...prev, timing }))}
            />

            <CyclePatternSelector
              value={formData.cycle_pattern}
              onChange={(pattern) => setFormData(prev => ({ ...prev, cycle_pattern: pattern }))}
            />

            {isRetatrutid && formData.titration_schedule && (
              <RetatrutidTitrationEditor
                value={formData.titration_schedule}
                onChange={(schedule) => setFormData(prev => ({ ...prev, titration_schedule: schedule }))}
              />
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
          disabled={isSubmitting || !formData.substance_name}
        >
          {isSubmitting ? "Speichere..." : "Protokoll speichern"}
        </Button>
      </CardFooter>
    </Card>
  );
}
