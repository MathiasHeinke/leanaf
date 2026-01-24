import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Flame, Settings } from "lucide-react";
import { MaintenanceProtocol } from "@/hooks/useMaintenanceProtocols";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface MaintenanceProtocolCardProps {
  protocol: MaintenanceProtocol;
  isDue: boolean;
  onLogDose: () => void;
  onEdit: () => void;
}

const SUBSTANCE_DISPLAY: Record<string, { name: string; icon: string; color: string }> = {
  'ca_akg': { name: 'Ca-AKG', icon: '🧬', color: 'text-blue-600' },
  'glycine': { name: 'Glycin', icon: '😴', color: 'text-indigo-600' },
  'trt_maintenance': { name: 'TRT', icon: '💪', color: 'text-red-600' },
  'reta_micro': { name: 'Reta Micro', icon: '💉', color: 'text-green-600' },
  'nad_maintenance': { name: 'NAD+ (NMN)', icon: '⚡', color: 'text-yellow-600' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  'daily': 'Täglich',
  'twice_daily': '2x täglich',
  'weekly': 'Wöchentlich',
  'every_10_14_days': 'Alle 10-14 Tage',
};

export function MaintenanceProtocolCard({
  protocol,
  isDue,
  onLogDose,
  onEdit
}: MaintenanceProtocolCardProps) {
  const display = SUBSTANCE_DISPLAY[protocol.substance_name] || {
    name: protocol.substance_name,
    icon: '💊',
    color: 'text-muted-foreground'
  };

  const daysSinceLastDose = protocol.last_taken_at
    ? differenceInDays(new Date(), new Date(protocol.last_taken_at))
    : null;

  const streakPercentOfLongest = protocol.longest_streak_days > 0
    ? Math.min(100, (protocol.current_streak_days / protocol.longest_streak_days) * 100)
    : 0;

  return (
    <Card className={cn(
      "transition-all",
      isDue && "border-primary shadow-md"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={cn("text-lg flex items-center gap-2", display.color)}>
            <span className="text-xl">{display.icon}</span>
            {display.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            {isDue && (
              <Badge variant="default" className="bg-primary">
                Fällig
              </Badge>
            )}
            {protocol.continued_from_phase && (
              <Badge variant="outline">
                Seit Phase {protocol.continued_from_phase}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosierung & Frequenz */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Dosis</p>
            <p className="text-lg font-semibold">
              {protocol.dose_amount}{protocol.dose_unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Frequenz</p>
            <p className="text-sm font-medium">
              {FREQUENCY_LABELS[protocol.frequency] || protocol.frequency}
            </p>
          </div>
        </div>

        {/* Streak */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              Streak
            </span>
            <span className="font-medium">
              {protocol.current_streak_days}/{protocol.longest_streak_days} max
            </span>
          </div>
          <Progress value={streakPercentOfLongest} className="h-2" />
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{protocol.total_doses_taken} Dosen gesamt</span>
          {protocol.last_taken_at && (
            <span>
              Zuletzt: {daysSinceLastDose === 0
                ? 'Heute'
                : daysSinceLastDose === 1
                  ? 'Gestern'
                  : `vor ${daysSinceLastDose} Tagen`}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onLogDose}
            className="flex-1"
            variant={isDue ? "default" : "outline"}
          >
            <Check className="w-4 h-4 mr-1" />
            {isDue ? 'Jetzt nehmen' : 'Dosis loggen'}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
