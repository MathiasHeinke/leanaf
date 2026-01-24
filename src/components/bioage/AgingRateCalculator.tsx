import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLongtermBioAge } from "@/hooks/useLongtermBioAge";
import { TrendingDown, TrendingUp, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgingRateCalculatorProps {
  compact?: boolean;
}

export function AgingRateCalculator({ compact = false }: AgingRateCalculatorProps) {
  const { calculateAgingRate, measurements } = useLongtermBioAge();
  
  const agingRate = calculateAgingRate();
  
  const getRateInfo = (rate: number | null) => {
    if (rate === null) {
      return {
        label: 'Unbekannt',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        icon: Minus,
        description: 'Noch nicht genug Daten (mind. 6 Monate)',
      };
    }
    
    if (rate < 0.85) {
      return {
        label: 'Exzellent',
        color: 'text-green-600',
        bgColor: 'bg-green-500/10',
        icon: TrendingDown,
        description: 'Du alterst deutlich langsamer als normal!',
      };
    }
    
    if (rate < 0.95) {
      return {
        label: 'Sehr gut',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500/10',
        icon: TrendingDown,
        description: 'Du alterst langsamer als der Durchschnitt',
      };
    }
    
    if (rate <= 1.05) {
      return {
        label: 'Normal',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500/10',
        icon: Minus,
        description: 'Normale Alterungsgeschwindigkeit',
      };
    }
    
    return {
      label: 'Erhöht',
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
      icon: TrendingUp,
      description: 'Du alterst schneller als normal - Interventionen prüfen',
    };
  };

  const rateInfo = getRateInfo(agingRate);
  const RateIcon = rateInfo.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${rateInfo.bgColor}`}>
        <RateIcon className={`w-4 h-4 ${rateInfo.color}`} />
        <div className="flex-1">
          <span className="text-sm font-medium">Aging Rate</span>
          <span className={`ml-2 font-bold ${rateInfo.color}`}>
            {agingRate !== null ? `${agingRate.toFixed(2)}x` : '—'}
          </span>
        </div>
        <Badge variant="outline" className={rateInfo.color}>
          {rateInfo.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <RateIcon className="w-4 h-4" />
          Aging Rate
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Die Aging Rate zeigt, wie viele biologische Jahre du pro Kalenderjahr alterst.
                  1.0 = normal, unter 1.0 = langsamer altern.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`p-4 rounded-lg ${rateInfo.bgColor} text-center`}>
          <div className={`text-4xl font-bold ${rateInfo.color}`}>
            {agingRate !== null ? agingRate.toFixed(2) : '—'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Jahre biologisch pro Kalenderjahr
          </div>
          <Badge className={`mt-3 ${rateInfo.color}`} variant="outline">
            {rateInfo.label}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {rateInfo.description}
        </p>

        {measurements.length < 2 && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            <Info className="w-4 h-4 inline mr-1" />
            Für die Aging Rate werden mindestens 2 Messungen im Abstand von 6+ Monaten benötigt.
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded bg-green-500/10">
            <div className="font-medium text-green-600">&lt; 0.85</div>
            <div className="text-muted-foreground">Exzellent</div>
          </div>
          <div className="p-2 rounded bg-yellow-500/10">
            <div className="font-medium text-yellow-600">0.95-1.05</div>
            <div className="text-muted-foreground">Normal</div>
          </div>
          <div className="p-2 rounded bg-red-500/10">
            <div className="font-medium text-red-600">&gt; 1.05</div>
            <div className="text-muted-foreground">Erhöht</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
