import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DoseInputProps {
  amount: number;
  unit: string;
  onAmountChange: (amount: number) => void;
  onUnitChange: (unit: string) => void;
}

const DOSE_UNITS = [
  { id: 'mg', label: 'mg (Milligramm)' },
  { id: 'mcg', label: 'mcg (Mikrogramm)' },
  { id: 'iu', label: 'IU (Internationale Einheiten)' },
] as const;

export function DoseInput({ amount, unit, onAmountChange, onUnitChange }: DoseInputProps) {
  return (
    <div className="space-y-2">
      <Label>Dosierung</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={amount || ''}
          onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
          className="flex-1"
          placeholder="Menge"
        />
        <Select value={unit} onValueChange={onUnitChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOSE_UNITS.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export { DOSE_UNITS };
