import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Timer, 
  Flame, 
  Zap, 
  Brain, 
  Sparkles, 
  Heart,
  CheckCircle2,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FastingBenefitsTimelineProps {
  hoursFasted: number;
}

interface Milestone {
  hours: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const MILESTONES: Milestone[] = [
  {
    hours: 0,
    title: "Fasten gestartet",
    description: "Letzte Mahlzeit verdaut",
    icon: <Timer className="w-4 h-4" />,
    color: "text-muted-foreground",
  },
  {
    hours: 12,
    title: "Glykogen erschöpft",
    description: "Fettverbrennung beginnt",
    icon: <Flame className="w-4 h-4" />,
    color: "text-orange-500",
  },
  {
    hours: 18,
    title: "Ketose",
    description: "Ketone als Energiequelle",
    icon: <Zap className="w-4 h-4" />,
    color: "text-yellow-500",
  },
  {
    hours: 24,
    title: "Autophagie",
    description: "Zelluläre Selbstreinigung",
    icon: <Brain className="w-4 h-4" />,
    color: "text-purple-500",
  },
  {
    hours: 48,
    title: "HGH-Anstieg",
    description: "Wachstumshormon +500%",
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-pink-500",
  },
  {
    hours: 72,
    title: "Stammzell-Regeneration",
    description: "Immunsystem-Reset beginnt",
    icon: <Heart className="w-4 h-4" />,
    color: "text-emerald-500",
  },
  {
    hours: 120,
    title: "Tiefe Reinigung",
    description: "Maximale Autophagie-Aktivität",
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-cyan-500",
  },
];

export function FastingBenefitsTimeline({ hoursFasted }: FastingBenefitsTimelineProps) {
  const currentMilestoneIndex = MILESTONES.findIndex(m => m.hours > hoursFasted) - 1;
  const nextMilestone = MILESTONES.find(m => m.hours > hoursFasted);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Fasten-Meilensteine</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
          
          {/* Milestones */}
          <div className="space-y-4">
            {MILESTONES.map((milestone, idx) => {
              const isCompleted = hoursFasted >= milestone.hours;
              const isCurrent = idx === currentMilestoneIndex;
              const isNext = milestone === nextMilestone;

              return (
                <div 
                  key={milestone.hours}
                  className={cn(
                    "relative flex items-start gap-4 pl-8",
                    !isCompleted && !isNext && "opacity-50"
                  )}
                >
                  {/* Icon Circle */}
                  <div 
                    className={cn(
                      "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2",
                      isCompleted 
                        ? `${milestone.color} bg-current/10 border-current` 
                        : "border-muted bg-background",
                      isCurrent && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className={cn("w-4 h-4", milestone.color)} />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium",
                        isCompleted && milestone.color
                      )}>
                        {milestone.title}
                      </span>
                      <Badge 
                        variant={isCompleted ? "default" : "outline"} 
                        className={cn(
                          "text-xs",
                          isCompleted && "bg-primary/10 text-primary border-0"
                        )}
                      >
                        {milestone.hours}h
                      </Badge>
                      {isCurrent && (
                        <Badge className="bg-primary text-xs">
                          Jetzt
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                    
                    {/* Progress to next */}
                    {isNext && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Fortschritt</span>
                          <span>
                            {Math.round(hoursFasted)}h / {milestone.hours}h
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ 
                              width: `${Math.min(100, (hoursFasted / milestone.hours) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
