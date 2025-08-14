import React from "react";

type Bar = {
  key: "P" | "K" | "F" | "C";       // C = KCAL
  value: number;                    // Ist
  target: number;                   // Ziel
  gradient?: [string, string];      // Farben (top -> bottom)
};

type Halo = {
  label: string;         // "WASSER" | "SCHRITTE" | "SUPPLEMENTS"
  value: string;         // "2.5L" | "8.0k" | "3/5"
  detailValue: string;   // "1.5/2.0L" | "7200/12000" | "3/5"
  progress: number;      // 0..1
  gradient: [string, string];
  track?: string;
  icon?: React.ReactNode; // optional
};

type Props = {
  bars: [Bar, Bar, Bar, Bar];       // Reihenfolge auf UI
  waterHalo: Halo;                  // Wasser-Ring
  stepsHalo: Halo;                  // Schritte-Ring
  supplementsHalo: Halo;            // Supplements-Ring
};

function HaloMeter({ label, value, detailValue, progress, gradient, track = "rgba(0,0,0,0.08)", icon }: Halo) {
  const [showDetail, setShowDetail] = React.useState(false);
  const R = 32, SW = 9, C = 2 * Math.PI * R, dash = C * Math.max(0, Math.min(1, progress));
  const id = `grad-${label.replace(/\s+/g, "")}`;
  const percentage = Math.round(progress * 100);
  
  return (
    <div 
      className="rounded-2xl p-3 bg-white/70 dark:bg-white/5 flex flex-col items-center gap-2 cursor-pointer hover:bg-white/80 dark:hover:bg-white/10 transition-colors duration-200 shadow-lg dark:shadow-zinc-900/40"
      onClick={() => setShowDetail(!showDetail)}
    >
      <svg width={76} height={76} className="shrink-0">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        <g transform="translate(38,38)">
          <circle r={R} cx={0} cy={0} fill="none" stroke={track} strokeWidth={SW} />
          <circle
            r={R}
            cx={0}
            cy={0}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            transform="rotate(-90)"
          />
          {icon && (
            <foreignObject x={-10} y={-10} width={20} height={20}>
              <div className="w-5 h-5 flex items-center justify-center text-zinc-600 dark:text-zinc-300">{icon}</div>
            </foreignObject>
          )}
        </g>
      </svg>
      <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition-all duration-200 text-center min-h-[20px]">
        {showDetail ? detailValue : `${percentage}%`}
      </div>
    </div>
  );
}

export default function FourBarsWithTrend({ bars, waterHalo, stepsHalo, supplementsHalo }: Props) {
  return (
    <section className="rounded-3xl p-4 sm:p-5 bg-white/80 dark:bg-[#0b0f14] shadow-[0_10px_30px_rgba(0,0,0,.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,.45)] backdrop-blur">
      <div className="grid grid-cols-1 gap-6">
        {/* 4 Bars */}
        <div className="flex items-end justify-between gap-4">
          {bars.map((b) => {
            const actualRatio = b.value / Math.max(1, b.target);
            const ratio = Math.max(0, Math.min(1, actualRatio)); // Clamped for visual fill
            const percentage = Math.round(actualRatio * 100);
            const isOverTarget = actualRatio > 1;
            
            // Target line position at 80% height (4/5)
            const targetLinePosition = 80;
            
            // Check if fill overlaps with target text (at 80% position)
            const fillHeight = ratio * 100;
            const textOverlapped = fillHeight >= targetLinePosition;
            
            // Format target value
            const formatTarget = (key: string, target: number) => {
              if (key === "C") return `${Math.round(target)}`;
              return `${Math.round(target)}g`;
            };
            
            // Gradient colors - red when over target
            const grad = isOverTarget
              ? ["#ef4444", "#dc2626"] // Red gradient when over target
              : b.key === "C"
                ? ["#3a3d42", "#1d1f24"] // anthrazit default
                : b.gradient ??
                  (b.key === "P"
                    ? ["#22c55e", "#16a34a"]
                    : b.key === "K"
                    ? ["#60a5fa", "#3b82f6"]
                    : ["#f59e0b", "#ef4444"]);

            return (
              <div key={b.key} className="flex flex-col items-center w-full">
                <div className="relative w-12 sm:w-14 h-40 sm:h-48 rounded-2xl overflow-hidden bg-gradient-to-b from-white/20 to-white/5 dark:from-white/8 dark:to-white/3 border border-white/20 dark:border-white/10 backdrop-blur-sm shadow-md dark:shadow-zinc-900/30">
                  {/* Target line at 80% (4/5) height */}
                  <div 
                    className="absolute left-0 right-0 h-[1px] bg-zinc-400/50 dark:bg-zinc-500/50"
                    style={{ top: `${100 - targetLinePosition}%` }}
                  />
                  
                   {/* Target value text */}
                   <div 
                     className={`absolute left-1/2 transform -translate-x-1/2 text-[10px] font-medium transition-colors duration-300 z-10 ${
                       textOverlapped 
                         ? 'text-white' 
                         : 'text-zinc-500 dark:text-zinc-400'
                     }`}
                     style={{ top: `${100 - targetLinePosition + 2}%` }}
                   >
                     {formatTarget(b.key, b.target)}
                   </div>
                  
                  {/* Fill - can exceed 100% */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-[height] duration-600 ease-out"
                    style={{
                      height: `${Math.min(actualRatio * 100, 100)}%`, // Fill can go to 100% max visually
                      background: `linear-gradient(180deg, ${grad[0]}, ${grad[1]})`,
                      boxShadow: isOverTarget
                        ? "0 8px 18px rgba(239,68,68,0.3)"
                        : b.key === "C"
                          ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.25)"
                          : `0 10px 20px ${grad[0]}33`,
                    }}
                  />
                  
                  {/* Overflow indicator when over 100% */}
                  {isOverTarget && (
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"
                    />
                  )}
                </div>
                {/* Label (1 Buchstabe) */}
                <div className="mt-2 text-xs font-semibold tracking-wide text-zinc-600 dark:text-zinc-300">
                  {b.key === "C" ? "KCAL" : b.key}
                </div>
                {/* Percentage */}
                <div className={`text-xs transition-colors duration-300 ${
                  isOverTarget 
                    ? 'text-red-500 dark:text-red-400 font-semibold' 
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Wasser, Schritte & Supplements Halos */}
        <div className="grid grid-cols-3 gap-2">
          <HaloMeter {...waterHalo} />
          <HaloMeter {...stepsHalo} />
          <HaloMeter {...supplementsHalo} />
        </div>
      </div>
    </section>
  );
}