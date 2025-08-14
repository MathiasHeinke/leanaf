import React from "react";

/** ---------- Types ---------- */
type MealKey = "breakfast" | "lunch" | "dinner" | "snacks";
type Meal = {
  key: MealKey;
  label: string;
  consumedKcal: number;  // bisher gegessen
  weight?: number;       // Zielanteil (Summe 1.0). Default: gleich verteilt
};

type Macro = { 
  label: "P" | "K" | "F"; 
  value: number; 
  target: number; 
  colorFrom: string; 
  colorTo: string; 
};

type Props = {
  goalKcal: number;
  meals: Meal[];               // in Tages-Reihenfolge
  macros: Macro[];             // P/K/F
  /** Höhe der Bars in px */
  height?: number;
};

/** ---------- Helpers ---------- */
// Soft clamp 0..1
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Rolling-Budget:
 * - Start-Target pro Phase = weight_i * goal
 * - Carry aus vorheriger Phase (positiv = übrig, negativ = Überzug) wird zur nächsten addiert
 * - Visuell begrenzen wir den "Budget-Track" nicht < 0 (damit die nächste Phase auch sichtbar bleibt)
 */
function computeRollingBudgets(goal: number, meals: Meal[]) {
  const n = meals.length;
  const sumWeights = meals.reduce((s, m) => s + (m.weight ?? 1 / n), 0) || 1;
  const targets = meals.map(m => ((m.weight ?? 1 / n) / sumWeights) * goal);

  let carry = 0;
  const result = meals.map((m, i) => {
    const capacity = Math.max(0, targets[i] + carry); // Budget-Track für diese Phase
    const consumed = m.consumedKcal;
    const left = capacity - consumed;
    carry = left; // fließt in die nächste Phase
    const overflow = Math.max(0, consumed - capacity);

    return {
      key: m.key,
      label: m.label,
      target: targets[i],
      capacity,       // aktuelles Budget für diese Phase nach Roll
      consumed,
      overflow,
      left: Math.max(0, left),
    };
  });

  const totalConsumed = meals.reduce((s, m) => s + m.consumedKcal, 0);
  const remainingTotal = Math.max(0, goal - totalConsumed);
  const carryToEnd = carry;

  return { phases: result, remainingTotal, carryToEnd, totalConsumed };
}

/** map 0..1 progress -> gradient color (green->yellow->red) using HSL */
function heatColor(progress: number) {
  const p = clamp01(progress);
  // Using HSL for smooth transitions
  // 0 => green (120°), 0.5 => yellow (60°), 1+ => red (0°)
  let hue: number;
  if (p <= 0.5) {
    hue = 120 - (p * 60); // 120° to 60°
  } else {
    hue = 60 - ((p - 0.5) * 60); // 60° to 0°
  }
  const saturation = 70 + (p * 20); // 70% to 90%
  const lightness = 50 + (p * 10); // 50% to 60%
  
  return `hsl(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%)`;
}

export default function DailyCaloriesPhases({
  goalKcal,
  meals,
  macros,
  height = 140,
}: Props) {
  const { phases, remainingTotal } = computeRollingBudgets(goalKcal, meals);

  return (
    <div className="w-full rounded-2xl bg-card/80 backdrop-blur-md p-4 shadow-elegant border border-border/40">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between">
        <div className="text-sm text-muted-foreground">Kalorien heute</div>
        <div className="text-sm text-foreground">
          Rest: <span className="font-semibold tabular-nums">{Math.round(remainingTotal)} kcal</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12 sm:gap-8">
        {/* Left: 3–4 vertical phase bars */}
        <div className="col-span-7 sm:col-span-8 flex gap-10 sm:gap-6 justify-between">
          {phases.map((p) => {
            // Progress relativ zu Capacity (1 == budget exhausted). Für Farbe clampen wir overflow mit rein (>=1 wird rot).
            const progress = p.capacity > 0 ? Math.min(p.consumed / p.capacity, 2) : (p.consumed > 0 ? 2 : 0);
            const fillColor = heatColor(progress);

            // Höhen
            const capH = height; // Track-Höhe
            const fillH = Math.min(capH, (p.capacity > 0 ? (p.consumed / p.capacity) : 0) * capH);
            const overflowH = p.capacity > 0 ? Math.max(0, (p.consumed - p.capacity) / p.capacity) * capH : (p.consumed > 0 ? capH * 0.25 : 0);

            return (
              <div key={p.key} className="flex flex-col items-center w-[52px]">
                {/* Gauge */}
                <div className="relative w-8 rounded-full overflow-hidden"
                  style={{ height: capH }}>
                  {/* Track */}
                  <div className="absolute inset-0 rounded-full border border-border/20 bg-muted/30" />

                  {/* Fill */}
                  <div
                    className="absolute bottom-0 w-full transition-all duration-600 ease-out rounded-full"
                    style={{
                      height: `${Math.max(0, fillH)}px`,
                      background: `linear-gradient(180deg, ${fillColor}, ${fillColor})`,
                      boxShadow: `0 6px 14px hsl(var(--primary) / 0.25)`,
                    }}
                  />

                  {/* Overflow (rot) */}
                  {overflowH > 0 && (
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-[10px] rounded-full bg-destructive/80"
                      style={{
                        boxShadow: "0 6px 16px hsl(var(--destructive) / 0.4)",
                      }}
                      title="Über Ziel dieser Phase"
                    />
                  )}
                </div>

                {/* Labels */}
                <div className="mt-2 text-xs text-muted-foreground uppercase tracking-wide">
                  {p.label}
                </div>
                <div className="text-sm mt-0.5 text-foreground tabular-nums">
                  {Math.round(Math.max(0, p.capacity))} kcal
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: micro macro stats */}
        <div className="col-span-5 sm:col-span-4 flex flex-col gap-3">
          {macros.map((m) => {
            const ratio = clamp01(m.value / (m.target || 1));
            return (
              <div key={m.label} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground"
                     style={{ background: `linear-gradient(135deg, ${m.colorFrom}, ${m.colorTo})` }}>
                  {m.label}
                </div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{ width: `${ratio * 100}%`, background: `linear-gradient(90deg, ${m.colorFrom}, ${m.colorTo})` }} />
                </div>
                <div className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round(m.value)}/{Math.round(m.target)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}