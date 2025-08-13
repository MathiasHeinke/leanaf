import React from "react";

type Metric = { value: string | number; label: string };

type RingArc = {
  /** Fortschritt von 0-1 (bestimmt wie viel des Halbkreises gefüllt ist) */
  progress: number;
  /** Farben des Verlaufs */
  gradient: [string, string];
  /** Strichstärke */
  width?: number;
  /** optionaler Glow-Faktor (0..1) */
  glow?: number;
};

type Props = {
  left: Metric;
  right: Metric;
  center: { top: string | number; bottom: string; progress?: number };
  dateLabel?: string;

  /** Mittlerer Ring */
  centerRing?: {
    trackColor?: string;
    color?: [string, string];
    width?: number;
  };

  /** Zwei äußere, „unfertige" Ringe */
  outerLeft: RingArc;   // z.B. gelb/orange unten-links
  outerRight: RingArc;  // z.B. blau oben-rechts

  size?: number;        // Gesamtbreite (px)
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Progress-Ring: rendert Halbkreis mit dynamischer Füllung */
function ProgressHalfRing({
  id,
  radius,
  progress,
  gradient,
  width,
  isLeft,
  withGlow,
}: {
  id: string;
  radius: number;
  progress: number;
  gradient: [string, string];
  width: number;
  isLeft: boolean;
  withGlow?: boolean;
}) {
  const p = clamp01(progress);
  const circumference = Math.PI * radius; // Halbkreis = halber Umfang
  const dashLength = circumference * p;
  const gapLength = circumference - dashLength;
  
  // Alternative Lösung: strokeDasharray für präzise Kontrolle
  // Halbkreis von unten nach oben mit korrektem Startpunkt
  const circumferenceHalf = Math.PI * radius; // Halbkreis-Umfang
  const progressLength = circumferenceHalf * p; // Gefüllte Länge
  const dashArray = `${progressLength} ${circumferenceHalf}`;
  
  // Für linken Ring: Start bei 270° (oben), offset für Start bei 225° (unten-links)
  // Für rechten Ring: Start bei 270° (oben), offset für Start bei 315° (unten-rechts)
  const baseOffset = circumferenceHalf * 0.75; // 3/4 des Halbkreises = Start unten
  const leftRingOffset = isLeft ? baseOffset : baseOffset + circumferenceHalf * 0.5;
  
  // Vollständiger Halbkreis-Pfad
  const pathD = isLeft 
    ? `M 0,${radius} A ${radius},${radius} 0 0,0 0,${-radius}` // Linker Halbkreis: von unten nach oben
    : `M 0,${radius} A ${radius},${radius} 0 0,1 0,${-radius}`; // Rechter Halbkreis: von unten nach oben
  
  return (
    <g>
      {/* Glow-Effekt */}
      {withGlow && (
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${id}-gradient)`}
          strokeWidth={width * 1.25}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={leftRingOffset}
          filter="url(#blur-soft)"
        />
      )}
      
      {/* Hauptstrich */}
      <path
        d={pathD}
        fill="none"
        stroke={`url(#${id}-gradient)`}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashArray}
        strokeDashoffset={leftRingOffset}
        className="transition-all duration-300 ease-out"
      />
    </g>
  );
}

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

  // Radien
  const R_CENTER = Math.min(W, H) * 0.26;
  const R_OUTER  = R_CENTER * 1.22;

  const centerWidth = centerRing?.width ?? 16;

  return (
    <div className="rounded-3xl bg-background/50 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden border border-border/40 shadow-lg">
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
      <div className="pointer-events-none absolute -bottom-10 left-1/2 h-40 w-[60%] -translate-x-1/2 blur-2xl opacity-30 bg-[radial-gradient(50%_100%_at_50%_100%,hsl(var(--primary)/0.3)_0%,transparent_70%)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 text-muted-foreground text-sm">
        <span>{dateLabel}</span>
      </div>

      {/* Zahlen links/rechts */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="text-4xl font-semibold text-orange-400 tabular-nums">{left.value}</div>
          <div className="uppercase tracking-[0.25em] text-orange-300 text-xs">{left.label}</div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
          <div className="text-4xl font-semibold text-blue-400 tabular-nums">{right.value}</div>
          <div className="uppercase tracking-[0.25em] text-blue-300 text-xs">{right.label}</div>
        </div>

        {/* SVG Stage */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <g transform={`translate(${cx} ${cy})`}>
            {/* --- DEFS --- */}
            <defs>
              {/* Gradients */}
              <linearGradient id="grad-center" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={(centerRing?.color ?? ["hsl(var(--primary))","hsl(var(--primary))"])[0]} />
                <stop offset="100%" stopColor={(centerRing?.color ?? ["hsl(var(--primary))","hsl(var(--primary))"])[1]} />
              </linearGradient>
              <linearGradient id="left-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={outerLeft.gradient[0]} />
                <stop offset="100%" stopColor={outerLeft.gradient[1]} />
              </linearGradient>
              <linearGradient id="right-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={outerRight.gradient[0]} />
                <stop offset="100%" stopColor={outerRight.gradient[1]} />
              </linearGradient>

              {/* Glows */}
              <filter id="blur-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>

            </defs>

            {/* --- CENTER FULL RING --- */}
            <circle
              r={R_CENTER}
              cx={0}
              cy={0}
              fill="none"
              stroke={centerRing?.trackColor ?? "hsl(var(--muted))"}
              strokeWidth={centerWidth}
            />
            {/* Optional: Progress (wenn center.progress gesetzt) */}
            {typeof center.progress === "number" && (
              (() => {
                const p = clamp01(center.progress);
                const c = 2 * Math.PI * R_CENTER;
                const dash = c * p;
                return (
                  <circle
                    r={R_CENTER}
                    cx={0}
                    cy={0}
                    fill="none"
                    stroke="url(#grad-center)"
                    strokeWidth={centerWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`}
                    transform="rotate(-90)"
                  />
                );
              })()
            )}

            {/* --- OUTER PROGRESS HALF-RINGS --- */}
            {/* Linker Halbkreis: füllt sich von unten-links nach oben-links */}
            <ProgressHalfRing
              id="left"
              radius={R_OUTER}
              progress={outerLeft.progress}
              gradient={outerLeft.gradient}
              width={outerLeft.width ?? centerWidth}
              isLeft={true}
              withGlow={true}
            />

            {/* Rechter Halbkreis: füllt sich von unten-rechts nach oben-rechts */}
            <ProgressHalfRing
              id="right"
              radius={R_OUTER}
              progress={outerRight.progress}
              gradient={outerRight.gradient}
              width={outerRight.width ?? centerWidth}
              isLeft={false}
              withGlow={true}
            />
          </g>
        </svg>

        {/* Center-Label */}
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-5xl font-semibold tracking-tight text-primary">{center.top}</div>
          <div className="mt-1 text-sm sm:text-base tracking-[.35em] text-primary/70 uppercase">
            {center.bottom}
          </div>
        </div>
      </div>
    </div>
  );
}