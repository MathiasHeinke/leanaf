import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { differenceInSeconds, differenceInHours } from "date-fns";
import { Flame, Zap, Brain, Sparkles, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface FastingTimerDisplayProps {
  startedAt: string;
  plannedDays: number;
  currentDay: number;
}

interface FastingPhase {
  name: string;
  icon: React.ReactNode;
  minHours: number;
  color: string;
  description: string;
}

const FASTING_PHASES: FastingPhase[] = [
  { name: "Glykogen", icon: <Timer className="w-4 h-4" />, minHours: 0, color: "text-blue-500", description: "Glykogen-Abbau" },
  { name: "Fettverbrennung", icon: <Flame className="w-4 h-4" />, minHours: 12, color: "text-orange-500", description: "Fettverbrennung aktiv" },
  { name: "Ketose", icon: <Zap className="w-4 h-4" />, minHours: 18, color: "text-yellow-500", description: "Ketose beginnt" },
  { name: "Autophagie", icon: <Brain className="w-4 h-4" />, minHours: 24, color: "text-purple-500", description: "Autophagie aktiviert" },
  { name: "HGH-Boost", icon: <Sparkles className="w-4 h-4" />, minHours: 48, color: "text-pink-500", description: "HGH steigt an" },
  { name: "Stammzellen", icon: <Sparkles className="w-4 h-4" />, minHours: 72, color: "text-emerald-500", description: "Stammzell-Regeneration" },
];

export function FastingTimerDisplay({ startedAt, plannedDays, currentDay }: FastingTimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const seconds = differenceInSeconds(new Date(), new Date(startedAt));
      setElapsed(seconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const currentPhase = [...FASTING_PHASES].reverse().find(p => hours >= p.minHours) || FASTING_PHASES[0];
  const nextPhase = FASTING_PHASES.find(p => p.minHours > hours);

  const progressPercent = (currentDay / plannedDays) * 100;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-6">
        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="animate-pulse">
              {currentPhase.icon}
            </div>
            <span className={cn("text-sm font-medium", currentPhase.color)}>
              {currentPhase.name}
            </span>
          </div>
          
          <div className="font-mono text-5xl font-bold tracking-tight">
            <span>{String(hours).padStart(2, '0')}</span>
            <span className="animate-pulse">:</span>
            <span>{String(minutes).padStart(2, '0')}</span>
            <span className="text-2xl text-muted-foreground">:{String(seconds).padStart(2, '0')}</span>
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            {currentPhase.description}
          </p>
        </div>

        {/* Day Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Tag {currentDay} von {plannedDays}</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Next Milestone */}
        {nextPhase && (
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground">Nächster Meilenstein</span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={cn(nextPhase.color)}>{nextPhase.icon}</span>
              <span className="font-medium">{nextPhase.name}</span>
              <Badge variant="outline" className="text-xs">
                in {nextPhase.minHours - hours}h
              </Badge>
            </div>
          </div>
        )}

        {/* Phase Timeline */}
        <div className="mt-4 flex justify-between">
          {FASTING_PHASES.slice(0, 5).map((phase, idx) => (
            <div 
              key={phase.name}
              className={cn(
                "flex flex-col items-center gap-1 text-xs",
                hours >= phase.minHours ? phase.color : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center border-2",
                hours >= phase.minHours 
                  ? "border-current bg-current/10" 
                  : "border-muted"
              )}>
                {phase.icon}
              </div>
              <span className="hidden sm:block">{phase.minHours}h</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
