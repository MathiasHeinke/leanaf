import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

type Bar = {
  key: "P" | "K" | "F" | "C";       // C = KCAL
  value: number;                    // Ist
  target: number;                   // Ziel
  gradient?: [string, string];      // Farben (top -> bottom)
};

type TrendPoint = { x: string | number; y: number };

type Props = {
  bars: [Bar, Bar, Bar, Bar];       // Reihenfolge auf UI
  trend7d: TrendPoint[];            // 7-Tage
};

export default function FourBarsWithTrend({ bars, trend7d }: Props) {
  return (
    <section className="rounded-3xl p-4 sm:p-5 bg-card shadow-elegant backdrop-blur border border-border">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT: 4 Bars */}
        <div className="md:col-span-7 flex items-end justify-between gap-4">
          {bars.map((b) => {
            const ratio = Math.max(0, Math.min(1, b.value / Math.max(1, b.target)));
            const goalPosition = (b.target > 0) ? Math.min(100, (b.target / Math.max(b.value, b.target)) * 100) : 0;
            
            // Defaults
            const grad =
              b.key === "C"
                ? ["hsl(var(--muted-foreground))", "hsl(var(--muted))"] // anthrazit changend
                : b.gradient ??
                  (b.key === "P"
                    ? ["hsl(142, 76%, 36%)", "hsl(142, 71%, 45%)"]
                    : b.key === "K"
                    ? ["hsl(217, 91%, 60%)", "hsl(221, 83%, 53%)"]
                    : ["hsl(43, 96%, 56%)", "hsl(0, 84%, 60%)"]);

            return (
              <div key={b.key} className="flex flex-col items-center w-full">
                <div className="relative w-12 sm:w-14 h-40 sm:h-48 rounded-2xl overflow-hidden bg-secondary border border-border">
                  {/* Goal marker line */}
                  {b.target > 0 && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-primary/60 z-10"
                      style={{
                        bottom: `${goalPosition}%`,
                      }}
                    />
                  )}
                  
                  {/* Fill */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-[height] duration-600 ease-out"
                    style={{
                      height: `${ratio * 100}%`,
                      background: `linear-gradient(180deg, ${grad[0]}, ${grad[1]})`,
                      boxShadow:
                        b.key === "C"
                          ? "inset 0 1px 0 hsl(var(--border)), 0 8px 18px hsl(var(--shadow) / 0.25)"
                          : `0 10px 20px ${grad[0]}33`,
                    }}
                  />
                </div>
                {/* Label (1 Buchstabe) */}
                <div className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground">
                  {b.key === "C" ? "KCAL" : b.key}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: kompakte 7‑Tage‑Sparkline */}
        <div className="md:col-span-5 rounded-2xl bg-secondary/50 p-3 sm:p-4">
          <div className="text-xs text-muted-foreground mb-2">7‑Tage</div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend7d}>
                <defs>
                  <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#sparkBlue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}