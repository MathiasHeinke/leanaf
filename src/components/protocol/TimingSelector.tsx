import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sun, Dumbbell, Moon, BedDouble, RefreshCw, Calendar } from "lucide-react";

interface TimingSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const TIMING_OPTIONS = [
  {
    id: 'morning_fasted',
    label: 'Morgens nüchtern',
    description: 'Direkt nach dem Aufwachen, vor dem Frühstück',
    icon: Sun,
  },
  {
    id: 'pre_workout',
    label: 'Vor dem Training',
    description: '30-60 Minuten vor dem Workout',
    icon: Dumbbell,
  },
  {
    id: 'evening_fasted',
    label: 'Abends nüchtern',
    description: '3+ Stunden nach letzter Mahlzeit',
    icon: Moon,
  },
  {
    id: 'before_bed',
    label: 'Vor dem Schlafen',
    description: 'Direkt vor dem Einschlafen',
    icon: BedDouble,
  },
  {
    id: 'twice_daily',
    label: '2x täglich',
    description: 'Morgens und Abends',
    icon: RefreshCw,
  },
  {
    id: 'weekly',
    label: 'Wöchentlich',
    description: 'Einmal pro Woche (fester Tag)',
    icon: Calendar,
  },
] as const;

export function TimingSelector({ value, onChange }: TimingSelectorProps) {
  const selectedTiming = TIMING_OPTIONS.find(t => t.id === value);

  return (
    <div className="space-y-2">
      <Label>Einnahme-Timing</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Timing wählen..." />
        </SelectTrigger>
        <SelectContent>
          {TIMING_OPTIONS.map((timing) => {
            const Icon = timing.icon;
            return (
              <SelectItem key={timing.id} value={timing.id}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{timing.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {selectedTiming && (
        <p className="text-sm text-muted-foreground">
          {selectedTiming.description}
        </p>
      )}
    </div>
  );
}
