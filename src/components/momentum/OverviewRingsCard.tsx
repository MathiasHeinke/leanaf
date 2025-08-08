import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MacroInfo {
  used: number;
  goal: number;
}

interface OverviewRingsCardProps {
  calories: { remaining: number; goal: number; today: number };
  macros: { protein: MacroInfo; carbs: MacroInfo; fats: MacroInfo };
}

const clampPct = (used: number, goal: number) => {
  if (!goal) return 0;
  return Math.max(0, Math.min(1, used / goal));
};

export const OverviewRingsCard: React.FC<OverviewRingsCardProps> = ({ calories, macros }) => {
  const kcalPct = useMemo(() => {
    const consumed = Math.max(0, calories.goal - calories.remaining);
    return calories.goal ? Math.min(1, consumed / calories.goal) : 0;
  }, [calories.goal, calories.remaining]);

  // New color mapping requested by user:
  // Protein = green, Carbs = gray, Fats = orange
  // We map to existing design tokens: fats (green), muted (gray), carbs (orange)
  const pPct = useMemo(() => clampPct(macros.protein.used, macros.protein.goal), [macros.protein]);
  const cPct = useMemo(() => clampPct(macros.carbs.used, macros.carbs.goal), [macros.carbs]);
  const fPct = useMemo(() => clampPct(macros.fats.used, macros.fats.goal), [macros.fats]);

  const kcalAngle = Math.round(kcalPct * 360);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Calories ring (thicker, blue, subtle glow) */}
          <div className="relative mx-auto h-44 w-44">
            {/* Fill */}
            <div
              className="absolute inset-0 rounded-full"
              aria-hidden
              style={{
                background: `conic-gradient(hsl(var(--ring)) ${kcalAngle}deg, hsl(var(--secondary)) ${kcalAngle}deg)`,
                filter: 'drop-shadow(0 0 12px hsl(var(--ring) / 0.35))',
              }}
            />
            {/* Inner cutout for thicker stroke */}
            <div className="absolute inset-[16%] rounded-full bg-background border border-border/60" />
            {/* Center label */}
            <div className="absolute inset-[26%] rounded-full bg-transparent flex items-center justify-center text-center">
              <div>
                <div className="text-xl font-semibold tabular-nums">{Math.round(calories.remaining)} kcal</div>
                <div className="text-xs text-muted-foreground">von {Math.round(calories.goal)} kcal</div>
              </div>
            </div>
            {/* Soft glow only on filled arc */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: `conic-gradient(hsl(var(--ring) / 0.55) ${kcalAngle}deg, transparent ${kcalAngle}deg)`,
                filter: 'blur(6px)',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Right: Macro concentric rings with softer colors */}
          <div className="relative mx-auto h-44 w-44">
            {/* Outer = Protein (green) */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(hsl(var(--fats) / 0.5) ${Math.round(pPct*360)}deg, hsl(var(--border) / 0.25) ${Math.round(pPct*360)}deg)` }}
            />
            <div className="absolute inset-[10%] rounded-full bg-background border border-border/50" />

            {/* Middle = Carbs (gray) */}
            <div className="absolute inset-[14%]">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(hsl(var(--muted-foreground) / 0.45) ${Math.round(cPct*360)}deg, hsl(var(--border) / 0.25) ${Math.round(cPct*360)}deg)` }}
              />
              <div className="absolute inset-[12%] rounded-full bg-background border border-border/50" />
            </div>

            {/* Inner = Fat (orange) */}
            <div className="absolute inset-[28%]">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(hsl(var(--carbs) / 0.5) ${Math.round(fPct*360)}deg, hsl(var(--border) / 0.25) ${Math.round(fPct*360)}deg)` }}
              />
              <div className="absolute inset-[20%] rounded-full bg-background border border-border/50" />
            </div>
          </div>
        </div>

        {/* Unified footer row: three points for macros */}
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--fats))' }} />
            <div className="text-xs text-muted-foreground">Protein</div>
            <div className="text-sm font-medium tabular-nums">{Math.round(macros.protein.used)}/{Math.round(macros.protein.goal)} g</div>
          </div>
          <div>
            <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--muted-foreground))' }} />
            <div className="text-xs text-muted-foreground">Carbs</div>
            <div className="text-sm font-medium tabular-nums">{Math.round(macros.carbs.used)}/{Math.round(macros.carbs.goal)} g</div>
          </div>
          <div>
            <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(var(--carbs))' }} />
            <div className="text-xs text-muted-foreground">Fett</div>
            <div className="text-sm font-medium tabular-nums">{Math.round(macros.fats.used)}/{Math.round(macros.fats.goal)} g</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverviewRingsCard;
