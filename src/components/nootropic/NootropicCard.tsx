import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp } from "lucide-react";
import { NootropicStack } from "@/hooks/useNootropicStacks";
import { cn } from "@/lib/utils";

interface NootropicCardProps {
  stack: NootropicStack;
  cycleStatusText: string;
}

const SUBSTANCE_INFO: Record<string, { name: string; description: string; icon: string; colorClass: string }> = {
  'semax': {
    name: 'Semax',
    description: 'BDNF-Hochregulation, Fokus & Klarheit',
    icon: '🧠',
    colorClass: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
  },
  'selank': {
    name: 'Selank',
    description: 'Anxiolytisch, Stress-Reduktion',
    icon: '😌',
    colorClass: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  },
  'semax_selank_combo': {
    name: 'Semax + Selank',
    description: 'Kombinierte kognitive Optimierung',
    icon: '⚡',
    colorClass: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30',
  },
};

export function NootropicCard({ stack, cycleStatusText }: NootropicCardProps) {
  const info = SUBSTANCE_INFO[stack.substance_name] || {
    name: stack.substance_name,
    description: 'Nootropikum',
    icon: '💊',
    colorClass: 'border-muted bg-muted/50',
  };

  const cycleProgress = stack.is_on_cycle
    ? (stack.current_cycle_week / stack.cycle_weeks_on) * 100
    : ((stack.current_cycle_week - stack.cycle_weeks_on) / stack.cycle_weeks_off) * 100;

  const focusImprovement = stack.baseline_focus_score && stack.current_focus_score
    ? stack.current_focus_score - stack.baseline_focus_score
    : null;

  return (
    <Card className={cn(
      info.colorClass,
      !stack.is_on_cycle && "opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{info.icon}</span>
            {info.name}
          </CardTitle>
          <Badge variant={stack.is_on_cycle ? "default" : "secondary"}>
            {stack.is_on_cycle ? 'Aktiv' : 'Pause'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosierung & Route */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Dosierung</span>
            <p className="font-medium">{stack.dose_mcg}mcg</p>
          </div>
          <div>
            <span className="text-muted-foreground">Applikation</span>
            <p className="font-medium capitalize">{stack.administration_route}</p>
          </div>
        </div>

        {/* Zyklus-Status */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{stack.is_on_cycle ? 'Zyklus-Fortschritt' : 'Pause-Fortschritt'}</span>
            <span className="text-muted-foreground">{cycleStatusText}</span>
          </div>
          <Progress value={cycleProgress} className="h-2" />
        </div>

        {/* Kognitive Verbesserung (wenn Scores vorhanden) */}
        {focusImprovement !== null && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Kognitive Verbesserung</span>
            </div>
            <span className={cn(
              "font-bold",
              focusImprovement >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {focusImprovement >= 0 ? '+' : ''}{focusImprovement}
              <span className="text-xs text-muted-foreground ml-1">Punkte vs. Baseline</span>
            </span>
          </div>
        )}

        {/* Timing */}
        <div className="text-xs text-muted-foreground">
          <Brain className="w-3 h-3 inline mr-1" />
          Timing: {stack.timing === 'morning' ? 'Morgens' : 
                   stack.timing === 'pre_work' ? 'Vor der Arbeit' : 
                   stack.timing === 'split_am_pm' ? 'Aufgeteilt (AM/PM)' : stack.timing}
        </div>
      </CardContent>
    </Card>
  );
}
