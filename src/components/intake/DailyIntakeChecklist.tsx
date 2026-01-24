import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IntakeChecklistItem } from "./IntakeChecklistItem";
import { useTodaysIntake } from "@/hooks/useTodaysIntake";
import { useIntakeLog } from "@/hooks/useIntakeLog";
import { useProtocols } from "@/hooks/useProtocols";
import { CheckCircle2, ListTodo, Syringe } from "lucide-react";

export function DailyIntakeChecklist() {
  const { protocols, loading: protocolsLoading } = useProtocols();
  const todaysItems = useTodaysIntake(protocols);
  const { 
    loading: logsLoading, 
    logIntake, 
    isPeptideTakenToday,
    isPeptideSkippedToday 
  } = useIntakeLog();

  const loading = protocolsLoading || logsLoading;

  // Calculate progress
  const activeItems = todaysItems.filter(item => item.isActiveToday);
  const takenCount = activeItems.filter(item => 
    isPeptideTakenToday(item.protocol.id, item.peptide.name)
  ).length;
  const totalCount = activeItems.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (todaysItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Syringe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground font-medium">Keine Protokolle aktiv</p>
          <p className="text-sm text-muted-foreground mt-1">
            Erstelle ein Protokoll um zu starten
          </p>
        </CardContent>
      </Card>
    );
  }

  const isAllDone = takenCount === totalCount && totalCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isAllDone ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <ListTodo className="h-5 w-5 text-primary" />
            )}
            Heute zu nehmen
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {takenCount}/{totalCount} ({progressPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {todaysItems.map((item, index) => (
          <IntakeChecklistItem
            key={`${item.protocol.id}-${item.peptide.name}-${index}`}
            item={item}
            isTaken={isPeptideTakenToday(item.protocol.id, item.peptide.name)}
            isSkipped={isPeptideSkippedToday(item.protocol.id, item.peptide.name)}
            onMarkTaken={async () => {
              await logIntake(
                item.protocol.id,
                item.peptide.name,
                item.currentDose,
                item.currentDoseUnit,
                item.scheduledTiming
              );
            }}
          />
        ))}
      </CardContent>
    </Card>
  );
}
