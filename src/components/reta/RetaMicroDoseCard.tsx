import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRetaMicro, getSiteLabel } from "@/hooks/useRetaMicro";
import { Syringe, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface RetaMicroDoseCardProps {
  compact?: boolean;
}

export function RetaMicroDoseCard({ compact = false }: RetaMicroDoseCardProps) {
  const { logs, loading, getDaysSinceLastDose, getDaysUntilNextDose, isDue } = useRetaMicro();

  const lastLog = logs[0];
  const daysSince = getDaysSinceLastDose();
  const daysUntil = getDaysUntilNextDose();
  const isOverdue = isDue();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Lade...</div>
        </CardContent>
      </Card>
    );
  }

  if (!lastLog) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Syringe className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Noch keine Reta Micro Dosis geloggt
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${isOverdue ? 'bg-amber-500/10' : 'bg-muted/50'}`}>
        <Syringe className={`w-5 h-5 ${isOverdue ? 'text-amber-600' : 'text-primary'}`} />
        <div className="flex-1">
          <div className="text-sm font-medium">Reta Micro</div>
          <div className="text-xs text-muted-foreground">
            Vor {daysSince} Tagen • {lastLog.dose_mg}mg
          </div>
        </div>
        <Badge variant={isOverdue ? 'default' : 'outline'} className={isOverdue ? 'bg-amber-500' : ''}>
          {isOverdue ? 'Fällig!' : daysUntil !== null ? `in ${daysUntil}d` : '—'}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={isOverdue ? 'border-amber-500/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Syringe className="w-4 h-4" />
            Reta Micro Status
          </CardTitle>
          {isOverdue ? (
            <Badge className="bg-amber-500">
              <AlertCircle className="w-3 h-3 mr-1" />
              Fällig
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600/50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              OK
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Dose */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Letzte Dosis</span>
            <span className="font-medium">{lastLog.dose_mg}mg</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {lastLog.injected_at && format(new Date(lastLog.injected_at), 'dd. MMM yyyy', { locale: de })}
            </span>
            <span className="text-xs text-muted-foreground">
              {getSiteLabel(lastLog.injection_site)}
            </span>
          </div>
        </div>

        {/* Days Counter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className={`text-2xl font-bold ${daysSince !== null && daysSince > 14 ? 'text-amber-600' : ''}`}>
              {daysSince ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground">Tage seit Dosis</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className={`text-2xl font-bold ${isOverdue ? 'text-amber-600' : 'text-green-600'}`}>
              {daysUntil !== null ? (daysUntil <= 0 ? 'Jetzt' : daysUntil) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {daysUntil !== null && daysUntil <= 0 ? 'Fällig!' : 'Tage bis nächste'}
            </div>
          </div>
        </div>

        {/* Injection Site Rotation */}
        <div className="text-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 inline mr-1" />
          Ziel-Intervall: 10-14 Tage
        </div>
      </CardContent>
    </Card>
  );
}
