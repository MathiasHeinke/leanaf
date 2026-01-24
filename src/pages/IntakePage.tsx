import { DailyIntakeChecklist, IntakeHistoryTable } from "@/components/intake";
import { Pill } from "lucide-react";

export default function IntakePage() {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Pill className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Peptid-Einnahme</h1>
          <p className="text-muted-foreground">
            Tägliche Einnahmen tracken und Protokoll-Compliance überwachen
          </p>
        </div>
      </div>

      <DailyIntakeChecklist />
      
      <IntakeHistoryTable />
    </div>
  );
}
