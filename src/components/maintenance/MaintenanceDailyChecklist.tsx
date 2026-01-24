import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCircle2, ListTodo, Loader2 } from "lucide-react";
import { useMaintenanceProtocols } from "@/hooks/useMaintenanceProtocols";
import { cn } from "@/lib/utils";

const SUBSTANCE_DISPLAY: Record<string, { name: string; icon: string }> = {
  'ca_akg': { name: 'Ca-AKG', icon: '🧬' },
  'glycine': { name: 'Glycin', icon: '😴' },
  'trt_maintenance': { name: 'TRT', icon: '💪' },
  'reta_micro': { name: 'Reta Micro', icon: '💉' },
  'nad_maintenance': { name: 'NAD+', icon: '⚡' },
};

const TIMING_DISPLAY: Record<string, string> = {
  'morning': '🌅 Morgens',
  'evening': '🌙 Abends',
  'with_food': '🍽️ Mit Mahlzeit',
  'before_bed': '😴 Vor dem Schlafen',
  'split': '🔄 Aufgeteilt',
};

export function MaintenanceDailyChecklist() {
  const { protocols, isDueToday, logDose, loading } = useMaintenanceProtocols();
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const activeProtocols = protocols.filter(p => p.is_active);
  
  const completedToday = activeProtocols.filter(p => {
    if (!p.last_taken_at) return false;
    const lastTaken = new Date(p.last_taken_at);
    const today = new Date();
    return lastTaken.toDateString() === today.toDateString();
  });

  const progress = activeProtocols.length > 0
    ? Math.round((completedToday.length / activeProtocols.length) * 100)
    : 100;

  const handleLog = async (protocolId: string) => {
    setLoggingId(protocolId);
    try {
      await logDose(protocolId);
    } finally {
      setLoggingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Lade...
        </CardContent>
      </Card>
    );
  }

  const isAllDone = completedToday.length === activeProtocols.length && activeProtocols.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {isAllDone ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <ListTodo className="w-5 h-5" />
            )}
            Heute zu nehmen
          </CardTitle>
          <Badge variant="outline">
            {completedToday.length}/{activeProtocols.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {activeProtocols.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Keine Maintenance-Protokolle aktiv
          </p>
        ) : isAllDone ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">
              Alle Dosen für heute genommen! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProtocols.map((protocol) => {
              const display = SUBSTANCE_DISPLAY[protocol.substance_name] || {
                name: protocol.substance_name,
                icon: '💊'
              };
              const timing = TIMING_DISPLAY[protocol.timing] || protocol.timing;
              const isCompleted = completedToday.some(p => p.id === protocol.id);
              const isDue = isDueToday(protocol);
              const isLogging = loggingId === protocol.id;

              return (
                <div
                  key={protocol.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    isCompleted && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                    isDue && !isCompleted && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{display.icon}</span>
                    <div>
                      <p className={cn(
                        "font-medium",
                        isCompleted && "line-through text-muted-foreground"
                      )}>
                        {display.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {protocol.dose_amount}{protocol.dose_unit} • {timing}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isCompleted ? "ghost" : isDue ? "default" : "outline"}
                    disabled={isLogging}
                    onClick={() => handleLog(protocol.id)}
                  >
                    {isLogging ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCompleted ? (
                      <>
                        <Check className="w-4 h-4 mr-1 text-green-600" />
                        Genommen
                      </>
                    ) : (
                      "Nehmen"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
