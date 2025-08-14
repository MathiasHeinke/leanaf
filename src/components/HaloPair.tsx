import React from "react";

type Halo = {
  label: string;         // "WASSER" | "SCHRITTE"
  value: string;         // "2.5L" | "8.0k"
  progress: number;      // 0..1
  gradient: [string, string];
  track?: string;
  icon?: React.ReactNode; // optional
};

type Props = { left: Halo; right: Halo };

function HaloMeter({ label, value, progress, gradient, track = "hsl(var(--secondary))", icon }: Halo) {
  const R = 40, SW = 8, C = 2 * Math.PI * R, dash = C * Math.max(0, Math.min(1, progress));
  const id = `grad-${label.replace(/\s+/g, "")}`;
  return (
    <div className="rounded-3xl p-4 bg-card shadow-elegant border border-border flex items-center gap-4">
      <svg width={100} height={100} className="shrink-0">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        <g transform="translate(50,50)">
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
            <foreignObject x={-12} y={-12} width={24} height={24}>
              <div className="w-6 h-6 flex items-center justify-center text-foreground">{icon}</div>
            </foreignObject>
          )}
        </g>
      </svg>
      <div className="flex flex-col">
        <div className="text-xl font-semibold text-foreground">{value}</div>
        <div className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{label}</div>
      </div>
    </div>
  );
}

export default function HaloPair({ left, right }: Props) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <HaloMeter {...left} />
      <HaloMeter {...right} />
    </section>
  );
}