import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Minus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface KFAProgressCardProps {
  startKFA: number | null;
  currentKFA: number | null;
  targetKFA: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
}

export function KFAProgressCard({ 
  startKFA, 
  currentKFA, 
  targetKFA, 
  progress, 
  trend 
}: KFAProgressCardProps) {
  const TrendIcon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : Minus;
  const trendColor = trend === 'down' ? 'text-green-500' : trend === 'up' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-full bg-orange-500/10">
            <Target className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">KFA Fortschritt</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                {currentKFA !== null ? `${currentKFA}cm` : '—'}
              </p>
              <TrendIcon className={cn("h-4 w-4", trendColor)} />
            </div>
          </div>
        </div>

        {/* Progress visualization */}
        <div className="mb-2">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Start → Current → Target */}
        <div className="flex justify-between text-xs">
          <div className="text-muted-foreground">
            <span className="block">Start</span>
            <span className="font-medium text-foreground">
              {startKFA !== null ? `${startKFA}cm` : '—'}
            </span>
          </div>
          <div className="text-center text-muted-foreground">
            <span className="block">{progress}%</span>
          </div>
          <div className="text-right text-muted-foreground">
            <span className="block">Ziel</span>
            <span className="font-medium text-primary">{targetKFA}cm</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
