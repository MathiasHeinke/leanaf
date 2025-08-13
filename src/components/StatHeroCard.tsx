import React from "react";

type Metric = { value: string | number; label: string };
type Arc = {
  /** 0..1 Anteil des Umfangs (z. B. 0.12 = ~43°) */
  fraction: number;
  /** Startwinkel in Grad, 0° oben, im Uhrzeigersinn */
  startDeg: number;
  /** Verlauf [von, bis] */
  gradient: [string, string];
  width?: number; // px, optional
};

type Props = {
  dateLabel?: string;
  left: Metric;   // z. B. 738 KALORIEN
  right: Metric;  // z. B. 0 SCHRITTE
  center: { top: string | number; bottom: string }; // z. B. "0L" / "WASSER"
  /** grauer Basis-Ring  */
  trackColor?: string;
  /** farbige Teil-Arcs auf dem Ring (wie in deinem Screenshot: blau oben, gelb links unten) */
  arcs: Arc[];
  size?: number;      // Breite des SVG
  ringWidth?: number; // Strichstärke des Basis-Rings
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export default function StatHeroCard({
  dateLabel,
  left,
  right,
  center,
  arcs,
  size = 760,
  ringWidth = 18,
  trackColor = "hsl(var(--muted))",
}: Props) {
  const W = size;
  const H = Math.round(size * 0.52);
  const cx = W / 2;
  const cy = H * 0.70;            // Ring sitzt etwas tiefer
  const R  = Math.min(W, H) * 0.26;

  return (
    <div className="rounded-3xl p-4 sm:p-5 bg-background/50 backdrop-blur-md relative overflow-hidden border border-border/40 shadow-lg">
      {/* feiner Rand/Innen-Glow */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-[60%] -translate-x-1/2 blur-2xl opacity-30 bg-[radial-gradient(50%_100%_at_50%_100%,hsl(var(--primary)/0.3)_0%,transparent_70%)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-2 pb-3 text-muted-foreground">
        <span className="text-sm">{dateLabel}</span>
      </div>

      {/* Hauptfläche */}
      <div className="relative">
        {/* Links & rechts Zahlen */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="text-4xl font-semibold text-orange-400 tabular-nums">{left.value}</div>
          <div className="uppercase tracking-[0.25em] text-orange-300 text-xs">{left.label}</div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
          <div className="text-4xl font-semibold text-blue-400 tabular-nums">{right.value}</div>
          <div className="uppercase tracking-[0.25em] text-blue-300 text-xs">{right.label}</div>
        </div>

        {/* SVG Ring */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <g transform={`translate(${cx} ${cy})`}>
            {/* Basis-Ring */}
            <circle r={R} cx={0} cy={0} fill="none" stroke={trackColor} strokeWidth={ringWidth} />
            {/* Teil-Arcs */}
            {arcs.map((arc, i) => {
              const id = `arc_${i}_${Math.random().toString(36).slice(2)}`;
              const c = 2 * Math.PI * R;
              const dash = c * clamp01(arc.fraction);
              const gap = c - dash;
              const w = arc.width ?? ringWidth;

              return (
                <g key={id} transform={`rotate(${arc.startDeg - 90})`}>
                  <defs>
                    <linearGradient id={`${id}_grad`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={arc.gradient[0]} />
                      <stop offset="100%" stopColor={arc.gradient[1]} />
                    </linearGradient>
                    <filter id={`${id}_blur`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" />
                    </filter>
                  </defs>

                  {/* Glow */}
                  <circle
                    r={R}
                    cx={0}
                    cy={0}
                    fill="none"
                    stroke={`url(#${id}_grad)`}
                    strokeWidth={w * 1.25}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${gap}`}
                    filter={`url(#${id}_blur)`}
                  />
                  {/* Arc */}
                  <circle
                    r={R}
                    cx={0}
                    cy={0}
                    fill="none"
                    stroke={`url(#${id}_grad)`}
                    strokeWidth={w}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${gap}`}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Center-Label */}
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-5xl font-semibold tracking-tight text-primary">{center.top}</div>
          <div className="mt-1 text-sm sm:text-base tracking-[.35em] text-primary/70 uppercase">{center.bottom}</div>
        </div>
      </div>
    </div>
  );
}