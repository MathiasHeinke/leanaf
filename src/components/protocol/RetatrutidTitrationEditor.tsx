import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export interface TitrationSchedule {
  week_1_4: string;
  week_5_8: string;
  week_9_12: string;
}

interface RetatrutidTitrationEditorProps {
  value: TitrationSchedule;
  onChange: (schedule: TitrationSchedule) => void;
}

export const DEFAULT_TITRATION: TitrationSchedule = {
  week_1_4: '0.5mg',
  week_5_8: '2mg',
  week_9_12: '4mg',
};

const DOSE_STEPS = [0.5, 1, 2, 3, 4, 5, 6, 8];

export function RetatrutidTitrationEditor({
  value = DEFAULT_TITRATION,
  onChange
}: RetatrutidTitrationEditorProps) {
  const parseDose = (doseStr: string): number => {
    return parseFloat(doseStr.replace('mg', '')) || 0.5;
  };

  const formatDose = (dose: number): string => `${dose}mg`;

  const getDoseIndex = (doseStr: string): number => {
    const dose = parseDose(doseStr);
    const idx = DOSE_STEPS.indexOf(dose);
    return idx >= 0 ? idx : 0;
  };

  const handleDoseChange = (period: keyof TitrationSchedule, sliderValue: number[]) => {
    const idx = sliderValue[0];
    const dose = DOSE_STEPS[idx] || 0.5;
    onChange({
      ...value,
      [period]: formatDose(dose),
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          📈 Retatrutid Titration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Langsame Steigerung der Dosis über 12 Wochen zur Minimierung von Nebenwirkungen
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Woche 1-4 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Woche 1-4 (Einführung)</Label>
            <span className="font-mono text-primary font-medium">{value.week_1_4}</span>
          </div>
          <Slider
            value={[getDoseIndex(value.week_1_4)]}
            min={0}
            max={DOSE_STEPS.length - 1}
            step={1}
            onValueChange={(val) => handleDoseChange('week_1_4', val)}
          />
          <p className="text-xs text-muted-foreground">
            Starte niedrig um GI-Nebenwirkungen zu minimieren
          </p>
        </div>

        {/* Woche 5-8 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Woche 5-8 (Aufbau)</Label>
            <span className="font-mono text-primary font-medium">{value.week_5_8}</span>
          </div>
          <Slider
            value={[getDoseIndex(value.week_5_8)]}
            min={0}
            max={DOSE_STEPS.length - 1}
            step={1}
            onValueChange={(val) => handleDoseChange('week_5_8', val)}
          />
          <p className="text-xs text-muted-foreground">
            Steigerung bei guter Verträglichkeit
          </p>
        </div>

        {/* Woche 9-12+ */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Woche 9-12+ (Zieldosis)</Label>
            <span className="font-mono text-primary font-medium">{value.week_9_12}</span>
          </div>
          <Slider
            value={[getDoseIndex(value.week_9_12)]}
            min={0}
            max={DOSE_STEPS.length - 1}
            step={1}
            onValueChange={(val) => handleDoseChange('week_9_12', val)}
          />
          <p className="text-xs text-muted-foreground">
            Maximale Dosis für aggressive Fettverbrennung (max 8mg)
          </p>
        </div>

        {/* Visuelle Timeline */}
        <div className="pt-4 border-t">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Woche 1</span>
            <span>Woche 4</span>
            <span>Woche 8</span>
            <span>Woche 12</span>
          </div>
          <div className="flex gap-1">
            <div className="flex-1 h-2 rounded-l bg-primary/30" title={value.week_1_4} />
            <div className="flex-1 h-2 bg-primary/60" title={value.week_5_8} />
            <div className="flex-1 h-2 rounded-r bg-primary" title={value.week_9_12} />
          </div>
          <div className="flex justify-between text-xs font-mono mt-1">
            <span className="text-primary/60">{value.week_1_4}</span>
            <span className="text-primary/80">{value.week_5_8}</span>
            <span className="text-primary">{value.week_9_12}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
