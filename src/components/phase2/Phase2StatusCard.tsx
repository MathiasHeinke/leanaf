import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Brain, Battery, Syringe, Target, Flame } from "lucide-react";

interface Phase2StatusCardProps {
  weekInPhase: number;
  totalWeeks: number;
  activeProtocols: {
    mitochondrial: number;
    epitalon: boolean;
    nootropic: number;
    nad: boolean;
  };
  targetKFA: number;
  currentKFA: number;
}

export function Phase2StatusCard({
  weekInPhase,
  totalWeeks,
  activeProtocols,
  targetKFA,
  currentKFA,
}: Phase2StatusCardProps) {
  const progress = Math.min((weekInPhase / totalWeeks) * 100, 100);
  // KFA progress: from 20% start toward target
  const kfaProgress = Math.min(Math.max(((20 - currentKFA) / (20 - targetKFA)) * 100, 0), 100);

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Phase 2: Zelluläre Feinabstimmung
          </CardTitle>
          <Badge variant="outline">Woche {weekInPhase}/{totalWeeks}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Phase-Fortschritt</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* KFA Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>KFA-Ziel</span>
            <span className="font-medium">{currentKFA}% → {targetKFA}%</span>
          </div>
          <Progress value={kfaProgress} className="h-2" />
        </div>

        {/* Active Protocols */}
        <div className="grid grid-cols-4 gap-2">
          <div className={`p-2 rounded-lg text-center ${activeProtocols.mitochondrial > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'}`}>
            <Flame className={`w-4 h-4 mx-auto ${activeProtocols.mitochondrial > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            <div className="text-xs mt-1 font-medium">{activeProtocols.mitochondrial} Mito</div>
          </div>
          
          <div className={`p-2 rounded-lg text-center ${activeProtocols.epitalon ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'}`}>
            <Syringe className={`w-4 h-4 mx-auto ${activeProtocols.epitalon ? 'text-purple-600' : 'text-muted-foreground'}`} />
            <div className="text-xs mt-1 font-medium">Epitalon</div>
          </div>
          
          <div className={`p-2 rounded-lg text-center ${activeProtocols.nootropic > 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'}`}>
            <Brain className={`w-4 h-4 mx-auto ${activeProtocols.nootropic > 0 ? 'text-blue-600' : 'text-muted-foreground'}`} />
            <div className="text-xs mt-1 font-medium">{activeProtocols.nootropic} Noo</div>
          </div>
          
          <div className={`p-2 rounded-lg text-center ${activeProtocols.nad ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
            <Battery className={`w-4 h-4 mx-auto ${activeProtocols.nad ? 'text-green-600' : 'text-muted-foreground'}`} />
            <div className="text-xs mt-1 font-medium">NAD+</div>
          </div>
        </div>

        {/* Focus */}
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="text-sm font-medium mb-2">Phase 2 Fokus</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Mitochondriale Effizienz maximieren</li>
            <li>• Epigenetische Verjüngung (Epitalon)</li>
            <li>• Kognitive Optimierung (Semax/Selank)</li>
            <li>• NAD+ Spiegel erhöhen</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
