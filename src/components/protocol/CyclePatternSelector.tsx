import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CyclePatternSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const CYCLE_PATTERNS = [
  {
    id: 'continuous',
    label: 'Durchgängig',
    description: 'Jeden Tag ohne Unterbrechung',
    daysOn: null,
    daysOff: null,
  },
  {
    id: '5on_2off',
    label: '5 on / 2 off',
    description: '5 Tage nehmen, 2 Tage Pause (Mo-Fr, Sa-So frei)',
    daysOn: 5,
    daysOff: 2,
  },
  {
    id: '6weeks_on_pause',
    label: '6 Wochen Zyklus',
    description: '6 Wochen nehmen, dann Pause einlegen',
    daysOn: 42,
    daysOff: null,
  },
] as const;

export function CyclePatternSelector({ value, onChange }: CyclePatternSelectorProps) {
  const selectedPattern = CYCLE_PATTERNS.find(p => p.id === value);

  return (
    <div className="space-y-2">
      <Label>Zyklus-Pattern</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pattern wählen..." />
        </SelectTrigger>
        <SelectContent>
          {CYCLE_PATTERNS.map((pattern) => (
            <SelectItem key={pattern.id} value={pattern.id}>
              <div className="flex flex-col">
                <span className="font-medium">{pattern.label}</span>
                <span className="text-xs text-muted-foreground">{pattern.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPattern && selectedPattern.daysOn && (
        <p className="text-sm text-muted-foreground">
          📊 Zyklus: {selectedPattern.daysOn} Tage aktiv
          {selectedPattern.daysOff && `, ${selectedPattern.daysOff} Tage Pause`}
        </p>
      )}
    </div>
  );
}
