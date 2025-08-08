import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { UsePlusDataResult } from '@/hooks/usePlusData';

interface PlusDeficitRingProps {
  data: UsePlusDataResult;
}

const circumference = 2 * Math.PI * 45; // r=45

export const PlusDeficitRing: React.FC<PlusDeficitRingProps> = ({ data }) => {
  const { loading, goals, today, last7, remainingKcal } = data;

  const percent = React.useMemo(() => {
    const goal = goals?.calories || 0;
    const consumed = today?.total_calories || 0;
    if (!goal || goal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((consumed / goal) * 100)));
  }, [goals, today]);

  const ampel: { label: string; variant: 'default' | 'secondary' | 'destructive' } = React.useMemo(() => {
    // Grün (−250 bis −800), Gelb (±0), Rot (+)
    const rem = remainingKcal ?? 0;
    if (rem < -0) {
      // over goal (surplus)
      return { label: 'Rot: Überschuss', variant: 'destructive' };
    }
    if (rem >= 250 && rem <= 800) return { label: 'Grün: Defizit im Ziel', variant: 'default' };
    if (rem >= 0 && rem < 250) return { label: 'Gelb: leichtes Defizit', variant: 'secondary' };
    // still remaining > 800 means far from finishing, mark as secondary
    return { label: 'Gelb: noch Luft', variant: 'secondary' };
  }, [remainingKcal]);

  return (
    <PlusCard>
      <CardHeader>
        <CardTitle>Kalorien-Defizit</CardTitle>
        <CardDescription>Nordstern – Fortschritt heute mit 7‑Tage‑Trend</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Ring */}
        <div className="flex items-center justify-center">
          {loading ? (
            <Skeleton className="h-40 w-40 rounded-full" />
          ) : (
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-40 w-40">
                <circle cx="50" cy="50" r="45" className="stroke-muted" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  className="stroke-primary"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={`${circumference - (circumference * percent) / 100}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-semibold">{remainingKcal ?? '—'}</div>
                <div className="text-sm text-muted-foreground">Rest kcal</div>
                <div className="mt-2"><Badge variant={ampel.variant}>{ampel.label}</Badge></div>
              </div>
            </div>
          )}
        </div>

        {/* Mini-Metrics */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Ziel</div>
          <div className="text-lg font-medium">{goals?.calories ?? '—'} kcal</div>
          <div className="text-sm text-muted-foreground">Heute gegessen</div>
          <div className="text-lg font-medium">{today?.total_calories ?? 0} kcal</div>
        </div>

        {/* Sparkline */}
        <div className="h-24">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7 || []} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as any;
                  return (
                    <div className="rounded-md border border-border bg-background/95 p-2 text-xs">
                      <div>{p.date}</div>
                      <div>{p.total_calories} kcal</div>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="total_calories" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </PlusCard>
  );
};
