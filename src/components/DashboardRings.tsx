import React from "react";

/** --------- Types --------- */
type SideMetric = {
  value: string | number;
  label: string;
  /** 0..1 zur Steuerung des Glow-Intensität, optional */
  glow?: number;
  /** Farbverlauf: von -> bis (HSL-compatible) */
  gradient?: [string, string];
};

type CenterMetric = {
  value: string | number;
  label: string;
  /** 0..1 Fortschritt des Mittelrings */
  progress: number;
  gradient?: [string, string];
};

type Props = {
  left: SideMetric;
  right: SideMetric;
  center: CenterMetric;
  /** Größe in px (Breite des gesamten Widgets) */
  size?: number;
  /** Hintergrundradien/Strichstärken */
  ringWidth?: number;
  trackColor?: string;
};

/** --------- Helpers --------- */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Für „Seitensegmente" nutzen wir strokeDasharray, um 1/6 vom Umfang anzuzeigen
 * und rotieren den Kreis an die gewünschte Position.
 */
function SegmentRing({
  radius,
  strokeWidth,
  colors,
  arcFraction = 1 / 6, // ~60°
  rotateDeg = 230, // Position links od. rechts
  glow = 0.6,
  trackColor = "hsl(var(--border) / 0.1)",
}: {
  radius: number;
  strokeWidth: number;
  colors: [string, string];
  arcFraction?: number;
  rotateDeg?: number;
  glow?: number;
  trackColor?: string;
}) {
  const c = 2 * Math.PI * radius;
  const arc = c * arcFraction;
  const rest = c - arc;

  const id = React.useId();

  return (
    <g transform={`rotate(${rotateDeg} 0 0)`}>
      {/* Track */}
      <circle
        r={radius}
        cx={0}
        cy={0}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Glow */}
      <defs>
        <radialGradient id={`${id}-glow`} r="70%">
          <stop offset="0%" stopColor={colors[0]} stopOpacity={0.45 * glow} />
          <stop offset="100%" stopColor={colors[1]} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={8} />
        </filter>
      </defs>

      <circle
        r={radius}
        cx={0}
        cy={0}
        stroke={`url(#${id}-grad)`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${arc} ${rest}`}
        transform="rotate(-90)"
      />
      {/* Soft glow behind the arc */}
      <circle
        r={radius}
        cx={0}
        cy={0}
        stroke={`url(#${id}-glow)`}
        strokeWidth={strokeWidth * 1.2}
        fill="none"
        strokeDasharray={`${arc} ${rest}`}
        transform="rotate(-90)"
        filter={`url(#${id}-blur)`}
      />
    </g>
  );
}

function CenterRing({
  radius,
  strokeWidth,
  progress,
  colors,
  trackColor = "hsl(var(--border) / 0.15)",
}: {
  radius: number;
  strokeWidth: number;
  progress: number; // 0..1
  colors: [string, string];
  trackColor?: string;
}) {
  const p = clamp01(progress);
  const c = 2 * Math.PI * radius;
  const dash = c * p;
  const id = React.useId();

  return (
    <g>
      {/* Track */}
      <circle
        r={radius}
        cx={0}
        cy={0}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress */}
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      <circle
        r={radius}
        cx={0}
        cy={0}
        stroke={`url(#${id}-grad)`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90)"
      />
    </g>
  );
}

/** --------- Main Component --------- */
export default function DashboardRings({
  left,
  right,
  center,
  size = 960,
  ringWidth = 18,
  trackColor = "hsl(var(--border) / 0.1)",
}: Props) {
  const W = size;
  const H = Math.round(size * 0.55);
  const cx = W / 2;
  const cy = H / 1.2;

  // Radien für die drei Ringe
  const R_CENTER = Math.min(W, H) * 0.24;
  const R_SIDE = Math.min(W, H) * 0.32;

  // Defaults für Verläufe mit Theme-kompatiblen Farben
  const gradLeft = left.gradient ?? ["hsl(var(--carbs))", "hsl(35 100% 65%)"];
  const gradRight = right.gradient ?? ["hsl(var(--primary))", "hsl(var(--primary-glow))"];
  const gradCenter = center.gradient ?? ["hsl(var(--primary))", "hsl(var(--primary-glow))"];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-background border border-border/40 glass-card modern-shadow">
      {/* Hintergrund-Verlauf */}
      <div className="absolute inset-0 bg-gradient-subtle opacity-50" />

      {/* SVG Stage */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto relative">
        <g transform={`translate(${cx}, ${cy})`}>
          {/* Links: 1/6 Segment */}
          <SegmentRing
            radius={R_SIDE}
            strokeWidth={ringWidth}
            colors={gradLeft}
            arcFraction={1 / 6}
            rotateDeg={220}
            glow={left.glow ?? 0.8}
            trackColor={trackColor}
          />
          {/* Rechts: 1/6 Segment */}
          <SegmentRing
            radius={R_SIDE}
            strokeWidth={ringWidth}
            colors={gradRight}
            arcFraction={1 / 6}
            rotateDeg={-40}
            glow={right.glow ?? 0.8}
            trackColor={trackColor}
          />
          {/* Mitte: Progress-Ring */}
          <CenterRing
            radius={R_CENTER}
            strokeWidth={ringWidth}
            progress={center.progress}
            colors={gradCenter}
            trackColor="hsl(var(--border) / 0.15)"
          />
        </g>
      </svg>

      {/* Labels & Zahlen */}
      <div className="pointer-events-none absolute inset-0">
        {/* Mitte */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[5%] text-center"
          style={{ transformOrigin: "center" }}
        >
          <div className="text-4xl lg:text-6xl font-semibold tracking-tight text-primary">
            {center.value}
          </div>
          <div className="mt-1 text-sm lg:text-lg tracking-[.2em] text-muted-foreground uppercase">
            {center.label}
          </div>
        </div>

        {/* Links */}
        <div className="absolute left-[6%] top-1/2 -translate-y-1/2 text-left">
          <div className="text-3xl lg:text-5xl font-semibold text-carbs tabular-nums">
            {left.value}
          </div>
          <div className="text-sm lg:text-xl uppercase tracking-[.25em] text-carbs/80">
            {left.label}
          </div>
        </div>

        {/* Rechts */}
        <div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right">
          <div className="text-3xl lg:text-5xl font-semibold text-primary tabular-nums">
            {right.value}
          </div>
          <div className="text-sm lg:text-xl uppercase tracking-[.25em] text-primary/80">
            {right.label}
          </div>
        </div>
      </div>

      {/* „Spiegelung" / Bodenlicht */}
      <div className="absolute left-1/2 bottom-0 h-[36%] w-[46%] -translate-x-1/2">
        <div className="h-full w-full opacity-30 blur-[12px] bg-gradient-to-t from-primary/20 to-transparent" />
      </div>
    </div>
  );
}