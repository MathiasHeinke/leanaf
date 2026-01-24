import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Leaf, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { SenolytCycle } from '@/hooks/useSenolytCycles';

interface SenolytCycleCardProps {
  cycle: SenolytCycle;
  isActive: boolean;
}

const STATUS_CONFIG = {
  scheduled: { label: 'Geplant', variant: 'outline' as const },
  active: { label: 'Aktiv', variant: 'default' as const },
  completed: { label: 'Abgeschlossen', variant: 'secondary' as const },
  skipped: { label: 'Übersprungen', variant: 'destructive' as const },
};

export function SenolytCycleCard({ cycle, isActive }: SenolytCycleCardProps) {
  const progress = cycle.duration_days > 0 
    ? (cycle.current_day / cycle.duration_days) * 100 
    : 0;
  
  const daysRemaining = cycle.duration_days - cycle.current_day;
  const statusConfig = STATUS_CONFIG[cycle.status || 'scheduled'];

  const getSubstanceName = () => {
    if (cycle.senolytic_type === 'fisetin') return 'Fisetin';
    if (cycle.senolytic_type === 'quercetin_dasatinib') return 'Quercetin + Dasatinib';
    return 'Senolytikum';
  };

  const getDoseDisplay = () => {
    if (cycle.senolytic_type === 'quercetin_dasatinib') {
      return `D: ${cycle.primary_dose_mg}mg + Q: ${cycle.secondary_dose_mg}mg`;
    }
    return `${cycle.primary_dose_mg}mg`;
  };

  return (
    <Card className={isActive ? 'border-green-500/50 bg-green-500/5' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            <CardTitle className="text-base">
              {getSubstanceName()} - Zyklus #{cycle.cycle_number}
            </CardTitle>
          </div>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dose Display */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Dosis</span>
          <span className="font-medium">{getDoseDisplay()}</span>
        </div>

        {/* Progress (if active) */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Tag {cycle.current_day} von {cycle.duration_days}</span>
              <span className="text-muted-foreground">
                {daysRemaining > 0 ? `${daysRemaining} Tag(e) übrig` : 'Letzter Tag!'}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Protocol Settings */}
        <div className="flex flex-wrap gap-2">
          {cycle.fasting_during_cycle && (
            <Badge variant="outline" className="text-xs">
              🍽️ Nüchtern
            </Badge>
          )}
          {cycle.quercetin_preload && (
            <Badge variant="outline" className="text-xs">
              ⚡ Quercetin-Preload
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {cycle.protocol_name || 'Mayo-Protokoll'}
          </Badge>
        </div>

        {/* Side Effects Warning */}
        {cycle.side_effects && cycle.side_effects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            <span>{cycle.side_effects.length} Nebenwirkung(en) geloggt</span>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {cycle.cycle_started_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Start: {format(new Date(cycle.cycle_started_at), 'dd.MM.yyyy', { locale: de })}
            </div>
          )}
          {cycle.cycle_ended_at && (
            <div>
              Ende: {format(new Date(cycle.cycle_ended_at), 'dd.MM.yyyy', { locale: de })}
            </div>
          )}
        </div>

        {/* Next Cycle Due */}
        {cycle.status === 'completed' && cycle.next_cycle_due && (
          <div className="p-2 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Nächster Zyklus: </span>
            <span className="font-medium">
              {format(new Date(cycle.next_cycle_due), 'dd. MMMM yyyy', { locale: de })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
