import React, { useMemo } from 'react';
import { addMonths, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingDown, TrendingUp, Minus, Calendar, Flame, Clock, CheckCircle } from 'lucide-react';
import { calculateRealismScore, getRealismLabel, getRealismVariant } from '@/utils/realismCalculator';
import { cn } from '@/lib/utils';

// ============= Types =============

export type MuscleGoal = 'maintain' | 'build';
export type ProtocolTempo = 'sustainable' | 'standard' | 'aggressive';

interface GoalConfiguratorProps {
  currentWeight: number;
  weightDelta: number;
  setWeightDelta: (delta: number) => void;
  muscleGoal: MuscleGoal;
  setMuscleGoal: (goal: MuscleGoal) => void;
  protocolTempo: ProtocolTempo;
  setProtocolTempo: (tempo: ProtocolTempo) => void;
  tdee?: number;
}

// ============= Constants =============

const TEMPO_CONFIG = {
  sustainable: { months: 12, label: 'Nachhaltig', icon: '🐢', color: 'emerald' },
  standard: { months: 6, label: 'Standard', icon: '⚡', color: 'amber' },
  aggressive: { months: 4, label: 'Aggressiv', icon: '🔥', color: 'red' },
} as const;

// ============= Component =============

export const GoalConfigurator: React.FC<GoalConfiguratorProps> = ({
  currentWeight,
  weightDelta,
  setWeightDelta,
  muscleGoal,
  setMuscleGoal,
  protocolTempo,
  setProtocolTempo,
  tdee = 2000,
}) => {
  // Computed values
  const targetWeight = useMemo(() => currentWeight + weightDelta, [currentWeight, weightDelta]);
  
  const targetDate = useMemo(() => {
    const months = TEMPO_CONFIG[protocolTempo].months;
    return addMonths(new Date(), months);
  }, [protocolTempo]);
  
  const computedGoal = useMemo(() => {
    if (weightDelta < -1) return 'lose';
    if (weightDelta > 1) return 'gain';
    return 'maintain';
  }, [weightDelta]);

  // Calculate weekly rate and daily deficit/surplus
  const weeklyStats = useMemo(() => {
    const weeks = TEMPO_CONFIG[protocolTempo].months * 4.33;
    const weeklyChange = Math.abs(weightDelta) / weeks;
    const dailyCalorieChange = Math.round((weeklyChange * 7700) / 7); // 7700 kcal per kg
    return { weeklyChange, dailyCalorieChange };
  }, [weightDelta, protocolTempo]);

  // Realism score
  const realismScore = useMemo(() => {
    if (weightDelta === 0) return 100;
    return calculateRealismScore({
      currentWeight,
      targetWeight,
      targetDate,
      protocolTempo,
    });
  }, [currentWeight, targetWeight, targetDate, protocolTempo, weightDelta]);

  // Direction icon
  const DirectionIcon = weightDelta < 0 ? TrendingDown : weightDelta > 0 ? TrendingUp : Minus;
  const directionColor = weightDelta < 0 ? 'text-green-500' : weightDelta > 0 ? 'text-blue-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="pt-5 space-y-6">
        
        {/* 1. Weight Delta Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Gewichts-Ziel</span>
            <div className="flex items-center gap-2">
              <DirectionIcon className={cn("h-4 w-4", directionColor)} />
              <span className={cn("font-bold", directionColor)}>
                {weightDelta > 0 ? '+' : ''}{weightDelta} kg
              </span>
            </div>
          </div>
          
          <Slider
            value={[weightDelta]}
            onValueChange={(v) => setWeightDelta(v[0])}
            min={-20}
            max={15}
            step={0.5}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-20 kg</span>
            <span>0</span>
            <span>+15 kg</span>
          </div>
          
          {/* Weight transformation display */}
          <div className="flex items-center justify-center gap-3 py-2 px-4 bg-muted/50 rounded-lg">
            <span className="text-lg font-bold">{currentWeight.toFixed(1)} kg</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("text-lg font-bold", directionColor)}>
              {targetWeight.toFixed(1)} kg
            </span>
          </div>
        </div>

        {/* 2. Muscle Goal Toggle */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Modus</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMuscleGoal('maintain')}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-left",
                muscleGoal === 'maintain'
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-border hover:border-teal-500/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <div>
                  <div className="font-semibold text-sm">Rekomposition</div>
                  <div className="text-xs text-muted-foreground">Muskel erhalten</div>
                </div>
                {muscleGoal === 'maintain' && (
                  <CheckCircle className="h-4 w-4 text-teal-500 ml-auto" />
                )}
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setMuscleGoal('build')}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-left",
                muscleGoal === 'build'
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-border hover:border-purple-500/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">💪</span>
                <div>
                  <div className="font-semibold text-sm">Aufbau</div>
                  <div className="text-xs text-muted-foreground">Lean Bulk</div>
                </div>
                {muscleGoal === 'build' && (
                  <CheckCircle className="h-4 w-4 text-purple-500 ml-auto" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 3. Protocol Tempo Selector */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Protokoll-Tempo</span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(TEMPO_CONFIG) as [ProtocolTempo, typeof TEMPO_CONFIG[ProtocolTempo]][]).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setProtocolTempo(key)}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-center",
                  protocolTempo === key
                    ? key === 'sustainable' ? "border-emerald-500 bg-emerald-500/10"
                    : key === 'standard' ? "border-amber-500 bg-amber-500/10"
                    : "border-red-500 bg-red-500/10"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="text-xl mb-1">{config.icon}</div>
                <div className="font-semibold text-xs">{config.label}</div>
                <div className="text-[10px] text-muted-foreground">{config.months} Monate</div>
              </button>
            ))}
          </div>
          
          {/* Target date display */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Zieldatum: <span className="font-medium text-foreground">{format(targetDate, 'dd.MM.yyyy', { locale: de })}</span></span>
          </div>
        </div>

        {/* 4. Realism Score & Stats */}
        {weightDelta !== 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Erfolgswahrscheinlichkeit</span>
              <Badge variant={getRealismVariant(realismScore)} className="text-xs">
                {realismScore}%
              </Badge>
            </div>
            <Progress value={realismScore} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {getRealismLabel(realismScore)}
            </div>
            
            {/* Stats breakdown */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-primary">
                  {weeklyStats.weeklyChange.toFixed(2)} kg/Woche
                </div>
                <div className="text-[10px] text-muted-foreground">Geschwindigkeit</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-orange-500">
                  {computedGoal === 'lose' ? '-' : computedGoal === 'gain' ? '+' : ''}{weeklyStats.dailyCalorieChange} kcal/Tag
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {computedGoal === 'lose' ? 'Defizit' : computedGoal === 'gain' ? 'Überschuss' : 'Balance'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
