import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type MacroItem = { label: "P"|"K"|"F"; value: number; target: number; colors: [string,string] };
type HistoryPoint = { day: string; kcal: number };

type Props = {
  kcalToday: number;
  kcalGoal: number;
  macros: MacroItem[];        // P/K/F
  history7: HistoryPoint[];   // letzte 7 Tage
  history30: HistoryPoint[];  // letzte 30 Tage
};

export default function NutritionOverview({
  kcalToday, kcalGoal, macros, history7, history30
}: Props) {
  const [range, setRange] = React.useState<"7"|"30">("7");
  const data = range === "7" ? history7 : history30;

  const remaining = Math.max(0, kcalGoal - kcalToday);
  const ratio = Math.min(1, kcalToday / Math.max(1, kcalGoal));

  return (
    <section className="rounded-3xl bg-card p-5 shadow-elegant backdrop-blur border border-border">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT: Kcal + Macros */}
        <div className="md:col-span-7 flex flex-col gap-5">
          <div className="flex items-end justify-between">
            <div className="text-sm text-muted-foreground">Kalorien heute</div>
            <div className="text-sm">
              <span className="text-muted-foreground">Rest: </span>
              <span className="font-semibold tabular-nums text-foreground">
                {Math.round(remaining)} kcal
              </span>
            </div>
          </div>

          {/* Kcal Progress */}
          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-primary shadow-glow"
              style={{
                width: `${ratio * 100}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="tabular-nums">
              {Math.round(kcalToday)} / {Math.round(kcalGoal)} kcal
            </span>
          </div>

          {/* Makros – sauber über die Breite verteilt */}
          <div className="grid grid-cols-3 gap-4">
            {macros.map((m) => {
              const r = Math.min(1, m.value / Math.max(1, m.target));
              return (
                <div key={m.label} className="rounded-2xl bg-secondary/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: `linear-gradient(135deg,${m.colors[0]},${m.colors[1]})` }}
                      >
                        {m.label}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Makro
                      </div>
                    </div>
                    <div className="text-xs tabular-nums text-foreground">
                      {Math.round(m.value)} / {Math.round(m.target)} g
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${r * 100}%`, background: `linear-gradient(90deg,${m.colors[0]},${m.colors[1]})` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: 7/30 Tage Verlauf – „runtergeholt" vom Header */}
        <div className="md:col-span-5 rounded-2xl bg-secondary/50 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Kalorien-Verlauf</div>
            <div className="flex gap-1 bg-secondary rounded-full p-1">
              <button
                onClick={() => setRange("7")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${range==="7"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"}`}
              >
                7T
              </button>
              <button
                onClick={() => setRange("30")}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${range==="30"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"}`}
              >
                30T
              </button>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -8, right: -8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="calArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    color: "hsl(var(--popover-foreground))"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="kcal" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#calArea)" 
                  strokeWidth={2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Ziel: <span className="tabular-nums">{Math.round(kcalGoal)} kcal/Tag</span>
          </div>
        </div>
      </div>
    </section>
  );
}