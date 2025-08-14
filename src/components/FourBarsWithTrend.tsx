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
    <section className="rounded-3xl p-4 sm:p-5 bg-white/80 dark:bg-[#0b0f14] shadow-[0_10px_30px_rgba(0,0,0,.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT: 4 Bars */}
        <div className="md:col-span-7 flex items-end justify-between gap-4">
          {bars.map((b) => {
            const ratio = Math.max(0, Math.min(1, b.value / Math.max(1, b.target)));
            // Goal marker position (at 100% line)
            const goalPosition = 100; // Always at top of bar container
            
            // Defaults
            const grad =
              b.key === "C"
                ? ["#3a3d42", "#1d1f24"] // anthrazit changend
                : b.gradient ??
                  (b.key === "P"
                    ? ["#22c55e", "#16a34a"]
                    : b.key === "K"
                    ? ["#60a5fa", "#3b82f6"]
                    : ["#f59e0b", "#ef4444"]);

            return (
              <div key={b.key} className="flex flex-col items-center w-full">
                <div className="relative w-12 sm:w-14 h-40 sm:h-48 rounded-2xl overflow-hidden bg-zinc-200/70 dark:bg-white/10 border border-black/5 dark:border-white/5">
                  {/* Goal marker - feine Linie */}
                  <div 
                    className="absolute left-0 right-0 h-[2px] bg-zinc-400/80 dark:bg-zinc-300/60 rounded-full"
                    style={{ top: `${100 - goalPosition}%` }}
                  />
                  
                  {/* Fill */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-[height] duration-600 ease-out"
                    style={{
                      height: `${ratio * 100}%`,
                      background: `linear-gradient(180deg, ${grad[0]}, ${grad[1]})`,
                      boxShadow:
                        b.key === "C"
                          ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.25)"
                          : `0 10px 20px ${grad[0]}33`,
                    }}
                  />
                </div>
                {/* Label (1 Buchstabe) */}
                <div className="mt-2 text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-300">
                  {b.key === "C" ? "KCAL" : b.key}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: kompakte 7‑Tage‑Sparkline */}
        <div className="md:col-span-5 rounded-2xl bg-white/70 dark:bg-white/5 p-3 sm:p-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">7‑Tage</div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend7d}>
                <defs>
                  <linearGradient id="sparkBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="#3b82f6"
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