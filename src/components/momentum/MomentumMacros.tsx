import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { Progress } from '@/components/ui/progress';

interface Props {
  data: UsePlusDataResult;
  usedOverride?: { protein: number; carbs: number; fats: number };
  label?: string;
}

export const MomentumMacros: React.FC<Props> = ({ data, usedOverride, label }) => {
  const { isEnabled } = useFeatureFlags();
  const useBars = isEnabled('macroBars');

const goals = data.goals || {};
const t = data.today || null;

const used = usedOverride || {
  protein: t?.total_protein || 0,
  carbs: t?.total_carbs || 0,
  fats: t?.total_fats || 0,
};

const protein = {
  goal: goals.protein || 0,
  used: used.protein,
};
const carbs = {
  goal: goals.carbs || 0,
  used: used.carbs,
};
const fats = {
  goal: goals.fats || 0,
  used: used.fats,
};

  const pct = (used: number, goal: number) => {
    if (!goal) return 0;
    return Math.max(0, Math.min(1, used / goal));
  };

  const pPct = useMemo(() => pct(protein.used, protein.goal), [protein.used, protein.goal]);
  const cPct = useMemo(() => pct(carbs.used, carbs.goal), [carbs.used, carbs.goal]);
  const fPct = useMemo(() => pct(fats.used, fats.goal), [fats.used, fats.goal]);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3">
          <div className="text-sm font-medium">Makros</div>
          <div className="text-xs text-muted-foreground">Protein · Carbs · Fett</div>
        </div>

        {useBars ? (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Protein</span>
                <span className="tabular-nums">{Math.round(protein.used)}/{Math.round(protein.goal)} g</span>
              </div>
              <Progress value={pPct * 100} className="h-3" indicatorClassName="bg-[hsl(var(--fats))]" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Carbs</span>
                <span className="tabular-nums">{Math.round(carbs.used)}/{Math.round(carbs.goal)} g</span>
              </div>
              <Progress value={cPct * 100} className="h-2.5" indicatorClassName="bg-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Fett</span>
                <span className="tabular-nums">{Math.round(fats.used)}/{Math.round(fats.goal)} g</span>
              </div>
              <Progress value={fPct * 100} className="h-2" indicatorClassName="bg-[hsl(var(--carbs))]" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative mx-auto h-44 w-44">
              {/* Outer = Protein */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(hsl(var(--fats) / 0.5) ${pPct*360}deg, hsl(var(--border) / 0.25) ${pPct*360}deg)` }}
              />
              <div className="absolute inset-[10%] rounded-full bg-background border border-border/50" />

              {/* Middle = Carbs */}
              <div className="absolute inset-[14%]">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(hsl(var(--muted-foreground) / 0.45) ${cPct*360}deg, hsl(var(--border) / 0.25) ${cPct*360}deg)` }}
                />
                <div className="absolute inset-[12%] rounded-full bg-background border border-border/50" />
              </div>

              {/* Inner = Fat */}
              <div className="absolute inset-[28%]">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(hsl(var(--carbs) / 0.5) ${fPct*360}deg, hsl(var(--border) / 0.25) ${fPct*360}deg)` }}
                />
                <div className="absolute inset-[20%] rounded-full bg-background border border-border/50" />
              </div>
            </div>

            {/* Legend below rings for clearer labeling */}
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--primary) / 0.7)' }} />
                  Protein
                </span>
                <span className="tabular-nums">{Math.round(protein.used)}/{Math.round(protein.goal)} g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--muted-foreground) / 0.7)' }} />
                  Carbs
                </span>
                <span className="tabular-nums">{Math.round(carbs.used)}/{Math.round(carbs.goal)} g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--carbs) / 0.7)' }} />
                  Fett
                </span>
                <span className="tabular-nums">{Math.round(fats.used)}/{Math.round(fats.goal)} g</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
