import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Syringe, RotateCcw } from "lucide-react";
import { EpitalonCycle } from "@/hooks/useEpitalonCycles";
import { format, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";

interface EpitalonCycleCardProps {
  cycle: EpitalonCycle;
  isActive: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  'scheduled': { label: 'Geplant', variant: 'outline' },
  'active': { label: 'Aktiv', variant: 'default' },
  'completed': { label: 'Abgeschlossen', variant: 'secondary' },
  'skipped': { label: 'Übersprungen', variant: 'outline' },
};

const INJECTION_SITES: Record<string, { label: string; icon: string }> = {
  'abdomen': { label: 'Bauch', icon: '🔴' },
  'thigh': { label: 'Oberschenkel', icon: '🟡' },
  'deltoid': { label: 'Schulter', icon: '🔵' },
};

export function EpitalonCycleCard({ cycle, isActive }: EpitalonCycleCardProps) {
  const progress = (cycle.current_day / cycle.duration_days) * 100;
  const statusConfig = STATUS_CONFIG[cycle.status] || STATUS_CONFIG['scheduled'];
  const daysRemaining = cycle.duration_days - cycle.current_day;

  // Calculate next injection site in rotation
  const rotationSites = cycle.injection_site_rotation || ['abdomen', 'thigh', 'deltoid'];
  const nextSiteIndex = cycle.injections_completed % rotationSites.length;
  const nextSite = rotationSites[nextSiteIndex];

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Syringe className="w-5 h-5 text-purple-500" />
            Epitalon Zyklus #{cycle.cycle_number}
          </CardTitle>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosierung */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Khavinson-Protokoll</span>
          <span>•</span>
          <span>{cycle.dose_mg}mg/Tag × {cycle.duration_days} Tage</span>
        </div>

        {/* Fortschritt */}
        {isActive && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fortschritt</span>
                <span className="font-medium">Tag {cycle.current_day}/{cycle.duration_days}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {daysRemaining} {daysRemaining === 1 ? 'Tag' : 'Tage'} verbleibend
              </p>
            </div>

            {/* Injection Site Rotation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="w-4 h-4" />
                Injektionsort-Rotation
              </div>
              <div className="flex gap-2 flex-wrap">
                {rotationSites.map((site, i) => {
                  const siteInfo = INJECTION_SITES[site] || { label: site, icon: '⚪' };
                  const isNext = i === nextSiteIndex;
                  const isLast = site === cycle.last_injection_site;

                  return (
                    <div
                      key={site}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                        isNext ? 'bg-purple-500/20 ring-1 ring-purple-500' : 'bg-muted/50'
                      }`}
                    >
                      <span>{siteInfo.icon}</span>
                      <span>{siteInfo.label}</span>
                      {isNext && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">Nächste</Badge>}
                      {isLast && !isNext && <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">Letzte</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Completed Cycle Info */}
        {cycle.status === 'completed' && cycle.next_cycle_due && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span>Nächster Zyklus fällig: {format(new Date(cycle.next_cycle_due), 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In {differenceInDays(new Date(cycle.next_cycle_due), new Date())} Tagen
            </p>
          </div>
        )}

        {/* Zeitraum */}
        {cycle.cycle_started_at && (
          <div className="text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 inline mr-1" />
            Gestartet: {format(new Date(cycle.cycle_started_at), 'dd.MM.yyyy', { locale: de })}
            {cycle.cycle_ended_at && ` - Beendet: ${format(new Date(cycle.cycle_ended_at), 'dd.MM.yyyy', { locale: de })}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
