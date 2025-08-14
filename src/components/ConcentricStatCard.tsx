import React from "react";

/** ---------------- Types ---------------- */
type Metric = { value: string | number; label: string };

type OuterArc = {
  /** Sichtbarer Winkel in Grad (1..359) */
  sweepDeg: number;
  /** Startwinkel in Grad (0° = oben, Uhrzeigersinn) */
  startDeg: number;
  /** Verlauf [von, bis] */
  gradient: [string, string];
  width?: number;
  glow?: number;
  /** optional: Track-Farbe des äußeren Rings */
  trackColor?: string;
  /** optional: Track-Deckkraft (0..1) */
  trackOpacity?: number;
};

type Props = {
  left: Metric;
  right: Metric;
  center: { top: string | number; bottom: string; progress?: number };
  dateLabel?: string;

  centerRing?: {
    trackColor?: string;
    color?: [string, string];
    width?: number;
  };

  outerLeft: OuterArc;
  outerRight: OuterArc;

  size?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clampDeg = (d: number) => Math.max(1, Math.min(359, d));

/** Hilfsfunktion: erzeugt strokeDasharray/offset für einen Arc */
function arcDash(circumference: number, startDeg: number, sweepDeg: number) {
  const sweep = clampDeg(sweepDeg);
  // SVG startet bei 3 Uhr; wir wollen 12 Uhr -> -90°
  const start = ((startDeg % 360) + 360) % 360;
  const dash = (circumference * sweep) / 360;
  const offset = (circumference * ((start - 90 + 360) % 360)) / 360;
  return { dash, offset };
}

/** ---------------- Component ---------------- */
export default function ConcentricStatCard({
  left,
  right,
  center,
  dateLabel = "",
  centerRing,
  outerLeft,
  outerRight,
  size = 720,
}: Props) {
  const W = size;
  const H = Math.round(size * 0.50);
  const cx = W / 2;
  const cy = H * 0.72;

  const R_CENTER = Math.min(W, H) * 0.26;
  const R_OUTER = R_CENTER * 1.22;

  const centerWidth = centerRing?.width ?? 16;

  // Umfang
  const C_CENTER = 2 * Math.PI * R_CENTER;
  const C_OUTER = 2 * Math.PI * R_OUTER;

  // Dashes berechnen (stabil, kein rotate, keine Random-IDs)
  const leftDash = arcDash(C_OUTER, outerLeft.startDeg, outerLeft.sweepDeg);
  const rightDash = arcDash(C_OUTER, outerRight.startDeg, outerRight.sweepDeg);

  return (
    <div className="rounded-3xl bg-[#0c0f14] p-4 sm:p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-[60%] -translate-x-1/2 blur-2xl opacity-60 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(64,135,255,0.28)_0%,rgba(0,0,0,0)_70%)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 text-zinc-300 text-sm">
        <span>{dateLabel}</span>
      </div>

      {/* Side numbers */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="text-4xl font-semibold text-[#f6a23b] tabular-nums">{left.value}</div>
          <div className="uppercase tracking-[0.25em] text-[#f7b86c]">{left.label}</div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
          <div className="text-4xl font-semibold text-[#59b8ff] tabular-nums">{right.value}</div>
          <div className="uppercase tracking-[0.25em] text-[#95cdfc]">{right.label}</div>
        </div>

        {/* SVG stage */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" shapeRendering="geometricPrecision">
          <defs>
            {/* Gradients */}
            <linearGradient id="grad-center" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={(centerRing?.color ?? ["#98c9ff", "#7fa9ff"])[0]} />
              <stop offset="100%" stopColor={(centerRing?.color ?? ["#98c9ff", "#7fa9ff"])[1]} />
            </linearGradient>
            <linearGradient id="grad-left" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={outerLeft.gradient[0]} />
              <stop offset="100%" stopColor={outerLeft.gradient[1]} />
            </linearGradient>
            <linearGradient id="grad-right" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={outerRight.gradient[0]} />
              <stop offset="100%" stopColor={outerRight.gradient[1]} />
            </linearGradient>

            <filter id="blur-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <g transform={`translate(${cx} ${cy})`}>
            {/* ---------- CENTER FULL RING ---------- */}
            <circle
              r={R_CENTER}
              cx={0}
              cy={0}
              fill="none"
              stroke={centerRing?.trackColor ?? "rgba(255,255,255,0.10)"}
              strokeWidth={centerWidth}
            />
            {typeof center.progress === "number" && (
              <circle
                r={R_CENTER}
                cx={0}
                cy={0}
                fill="none"
                stroke="url(#grad-center)"
                strokeWidth={centerWidth}
                strokeLinecap="round"
                strokeDasharray={`${C_CENTER * clamp01(center.progress)} ${C_CENTER}`}
                strokeDashoffset={0}
                transform="rotate(-90)"
                className="transition-[stroke-dasharray] duration-500 ease-out"
              />
            )}

            {/* ---------- OUTER TRACK (fix gegen Springen) ---------- */}
            <circle
              r={R_OUTER}
              cx={0}
              cy={0}
              fill="none"
              stroke={outerLeft.trackColor ?? "rgba(255,255,255,0.06)"}
              strokeWidth={outerLeft.width ?? centerWidth}
              opacity={outerLeft.trackOpacity ?? 1}
            />

            {/* ---------- OUTER LEFT ARC ---------- */}
            {/* Glow */}
            <circle
              r={R_OUTER}
              cx={0}
              cy={0}
              fill="none"
              stroke="url(#grad-left)"
              strokeWidth={(outerLeft.width ?? centerWidth) * 1.25}
              strokeLinecap="round"
              strokeDasharray={`${leftDash.dash} ${C_OUTER}`}
              strokeDashoffset={leftDash.offset}
              filter="url(#blur-soft)"
              className="transition-[stroke-dashoffset,stroke-dasharray] duration-500 ease-out"
            />
            {/* Stroke */}
            <circle
              r={R_OUTER}
              cx={0}
              cy={0}
              fill="none"
              stroke="url(#grad-left)"
              strokeWidth={outerLeft.width ?? centerWidth}
              strokeLinecap="round"
              strokeDasharray={`${leftDash.dash} ${C_OUTER}`}
              strokeDashoffset={leftDash.offset}
              className="transition-[stroke-dashoffset,stroke-dasharray] duration-500 ease-out"
            />

            {/* ---------- OUTER RIGHT ARC ---------- */}
            {/* Optional eigener Track (wenn andere Farbe/Deckkraft) */}
            {outerRight.trackColor && (
              <circle
                r={R_OUTER}
                cx={0}
                cy={0}
                fill="none"
                stroke={outerRight.trackColor}
                strokeWidth={outerRight.width ?? centerWidth}
                opacity={outerRight.trackOpacity ?? 1}
              />
            )}

            {/* Glow */}
            <circle
              r={R_OUTER}
              cx={0}
              cy={0}
              fill="none"
              stroke="url(#grad-right)"
              strokeWidth={(outerRight.width ?? centerWidth) * 1.25}
              strokeLinecap="round"
              strokeDasharray={`${rightDash.dash} ${C_OUTER}`}
              strokeDashoffset={rightDash.offset}
              filter="url(#blur-soft)"
              className="transition-[stroke-dashoffset,stroke-dasharray] duration-500 ease-out"
            />
            {/* Stroke */}
            <circle
              r={R_OUTER}
              cx={0}
              cy={0}
              fill="none"
              stroke="url(#grad-right)"
              strokeWidth={outerRight.width ?? centerWidth}
              strokeLinecap="round"
              strokeDasharray={`${rightDash.dash} ${C_OUTER}`}
              strokeDashoffset={rightDash.offset}
              className="transition-[stroke-dashoffset,stroke-dasharray] duration-500 ease-out"
            />
          </g>
        </svg>

        {/* Center label */}
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-5xl font-semibold tracking-tight text-[#b9d5ff]">{center.top}</div>
          <div className="mt-1 text-sm sm:text-base tracking-[.35em] text-[#9ec2ff] uppercase">
            {center.bottom}
          </div>
        </div>
      </div>
    </div>
  );
}