import React, { useState, useEffect } from 'react';
import { Settings, Droplets, Footprints, Dumbbell, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface MomentumHeaderTriptychProps {
  data: UsePlusDataResult;
  missionCompletedCount: number;
  missionTotal?: number;
}

export const MomentumHeaderTriptych: React.FC<MomentumHeaderTriptychProps> = ({ 
  data, 
  missionCompletedCount, 
  missionTotal = 5 
}) => {
  const [kcalUnit, setKcalUnit] = useState<'kcal' | 'percent'>('kcal');
  const [rightSlot, setRightSlot] = useState<'hydration' | 'steps' | 'training' | 'sleep'>('hydration');
  
  // Persist user preferences in localStorage
  useEffect(() => {
    try {
      const savedSlot = localStorage.getItem('momentum_right_slot');
      if (savedSlot === 'hydration' || savedSlot === 'steps' || savedSlot === 'training' || savedSlot === 'sleep') {
        setRightSlot(savedSlot);
      }
      const savedUnit = localStorage.getItem('momentum_kcal_unit');
      if (savedUnit === 'kcal' || savedUnit === 'percent') {
        setKcalUnit(savedUnit as 'kcal' | 'percent');
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('momentum_right_slot', rightSlot); } catch {}
  }, [rightSlot]);

  useEffect(() => {
    try { localStorage.setItem('momentum_kcal_unit', kcalUnit); } catch {}
  }, [kcalUnit]);
  
  const { loading, goals, today, remainingKcal } = data;

  // Mission Ring (Links)
  const missionPercent = (missionCompletedCount / missionTotal) * 100;
  const circumference = 2 * Math.PI * 16; // r=16 for mini ring

  // Kcal & Macros (Mitte)
  const consumedPercent = goals?.calories ? Math.min(100, ((today?.total_calories || 0) / goals.calories) * 100) : 0;
  const proteinPercent = goals?.protein ? Math.min(100, ((today?.total_protein || 0) / goals.protein) * 100) : 0;
  const carbPercent = goals?.carbs ? Math.min(100, ((today?.total_carbs || 0) / goals.carbs) * 100) : 0;
  const fatPercent = goals?.fats ? Math.min(100, ((today?.total_fats || 0) / goals.fats) * 100) : 0;

  // Right Slot Data - now using real data from usePlusData
  const getRightSlotData = () => {
    switch (rightSlot) {
      case 'hydration':
        const hydrationMl = (data as any)?.hydrationMlToday ?? 0;
        const hydrationTarget = 2500;
        const hydrationPercent = Math.min(100, (hydrationMl / hydrationTarget) * 100);
        return {
          icon: Droplets,
          value: `${Math.round(hydrationMl)}/2500`,
          percent: hydrationPercent,
          unit: 'ml'
        };
      case 'steps':
        const steps = (data as any)?.stepsToday ?? 0;
        const stepsTarget = (data as any)?.stepsTarget ?? 7000;
        const stepsPercent = Math.min(100, (steps / stepsTarget) * 100);
        const stepsDisplay = steps >= 1000 ? `${(steps/1000).toFixed(1)}k` : steps.toString();
        const targetDisplay = stepsTarget >= 1000 ? `${(stepsTarget/1000)}k` : stepsTarget.toString();
        return {
          icon: Footprints,
          value: `${stepsDisplay}/${targetDisplay}`,
          percent: stepsPercent,
          unit: 'Schritte'
        };
      case 'training':
        const workoutLogged = (data as any)?.workoutLoggedToday ?? false;
        const sleepDuration = (data as any)?.sleepDurationToday ?? 0;
        return {
          icon: Dumbbell,
          value: workoutLogged ? 'Erledigt' : 'Offen',
          percent: workoutLogged ? 100 : 0,
          unit: 'Training'
        };
      case 'sleep':
        const sleepHours = (data as any)?.sleepDurationToday ?? 0;
        const sleepTarget = 8;
        const sleepPercent = Math.min(100, (sleepHours / sleepTarget) * 100);
        return {
          icon: Moon,
          value: sleepHours > 0 ? `${sleepHours.toFixed(1)}h` : 'Offen',
          percent: sleepPercent,
          unit: 'Schlaf'
        };
      default:
        return {
          icon: Droplets,
          value: '—',
          percent: 0,
          unit: 'Werte'
        };
    }
  };

  const rightSlotData = getRightSlotData();

  if (loading) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Links: Mission Ring */}
        <button className="glass-card rounded-xl p-3 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg viewBox="0 0 36 36" className="w-8 h-8">
                <circle cx="18" cy="18" r="16" className="stroke-muted" strokeWidth="3" fill="none" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  className="stroke-primary"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={`${circumference - (circumference * missionPercent) / 100}`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {missionCompletedCount}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Tagesmission</div>
              <div className="text-xs text-muted-foreground">{missionCompletedCount}/{missionTotal} erledigt</div>
            </div>
          </div>
        </button>

        {/* Mitte: Kcal Rest + Macros */}
        <button 
          className="glass-card rounded-xl p-3 hover:bg-muted/50 transition-colors"
          onClick={() => setKcalUnit(prev => prev === 'kcal' ? 'percent' : 'kcal')}
          aria-label="Anzeige zwischen kcal und Prozent umschalten"
        >
          <div className="text-center">
            <div className="text-lg font-semibold">
              {kcalUnit === 'kcal' 
                ? `${remainingKcal ?? '—'} kcal` 
                : `${Math.round(consumedPercent)}%`
              }
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {kcalUnit === 'kcal' ? 'Rest heute' : 'vom Ziel'}
            </div>
            {/* Mini Macro Rings */}
            <div className="flex justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-secondary relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-blue-500 rounded-full transition-all duration-300" 
                  style={{ clipPath: `inset(${100 - proteinPercent}% 0 0 0)` }}
                />
              </div>
              <div className="w-3 h-3 rounded-full bg-secondary relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-orange-500 rounded-full transition-all duration-300" 
                  style={{ clipPath: `inset(${100 - carbPercent}% 0 0 0)` }}
                />
              </div>
              <div className="w-3 h-3 rounded-full bg-secondary relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-yellow-500 rounded-full transition-all duration-300" 
                  style={{ clipPath: `inset(${100 - fatPercent}% 0 0 0)` }}
                />
              </div>
            </div>
          </div>
        </button>

        {/* Rechts: Konfigurierbarer Slot */}
        <div className="glass-card rounded-xl p-3 relative">
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-1 right-1 h-6 w-6 p-0"
            onClick={() => {
              const slots: typeof rightSlot[] = ['hydration', 'steps', 'training', 'sleep'];
              const currentIndex = slots.indexOf(rightSlot);
              const nextIndex = (currentIndex + 1) % slots.length;
              setRightSlot(slots[nextIndex]);
            }}
          >
            <Settings className="w-3 h-3" />
          </Button>
          
          <div className="flex items-center gap-3">
            <rightSlotData.icon className="w-6 h-6 text-primary shrink-0" />
            <div>
              <div className="text-sm font-medium">{rightSlotData.value}</div>
              <div className="text-xs text-muted-foreground">{rightSlotData.unit}</div>
              <div className="w-12 h-1 bg-secondary rounded-full mt-1">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${rightSlotData.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};