import { Training3SaeulenTracker, TrainingHistoryList } from "@/components/training";

export default function TrainingPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training Tracker</h1>
        <p className="text-muted-foreground">
          Die 3 Säulen: Kraft (RPT) + Zone 2 + VO2max
        </p>
      </div>

      <Training3SaeulenTracker />
      
      <TrainingHistoryList />
    </div>
  );
}
