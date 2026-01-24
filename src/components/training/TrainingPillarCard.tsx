import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { LucideIcon, CheckCircle2 } from "lucide-react";

interface TrainingPillarCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  current: number;
  goal: number;
  unit: string;
  progress: number;
}

export function TrainingPillarCard({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBgColor,
  current,
  goal,
  unit,
  progress,
}: TrainingPillarCardProps) {
  const isComplete = progress >= 100;

  return (
    <Card className={cn(
      "transition-all duration-300",
      isComplete && "ring-2 ring-green-500/50 bg-green-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", iconBgColor)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {isComplete && (
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          )}
        </div>

        <div className="mb-2">
          <span className="text-2xl font-bold">{current}</span>
          <span className="text-muted-foreground">/{goal} {unit}</span>
        </div>

        <Progress 
          value={progress} 
          className={cn("h-2", isComplete && "[&>div]:bg-green-500")}
        />

        <p className={cn(
          "text-xs mt-2",
          isComplete ? "text-green-600 font-medium" : "text-muted-foreground"
        )}>
          {isComplete ? '✓ Wochenziel erreicht!' : `${progress}% erreicht`}
        </p>
      </CardContent>
    </Card>
  );
}
