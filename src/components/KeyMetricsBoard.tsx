import React, { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { Flame, Droplet, Footprints } from "lucide-react";

type SparkData = { day: string; value: number };

interface HaloMetric {
  icon: React.ReactNode;
  value: string;
  label: string;
  progress: number; // 0..1
  gradient: [string, string];
}

interface Props {
  sparkTitle: string;
  sparkValue: string;
  sparkUnit: string;
  sparkData: SparkData[];
  halos: [HaloMetric, HaloMetric];
}

const HaloCircle: React.FC<HaloMetric & { delay?: number }> = ({ 
  icon, 
  value, 
  label, 
  progress, 
  gradient, 
  delay = 0 
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const R = 38;
  const strokeWidth = 6;
  const C = 2 * Math.PI * R;
  const dash = C * animatedProgress;

  const id = `grad-${label.replace(/\s+/g, '')}-${Math.random().toString(36).slice(2)}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, delay);
    return () => clearTimeout(timer);
  }, [progress, delay]);

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center w-full border border-border/20 shadow-lg">
      <div className="relative mb-2">
        <svg width={100} height={100}>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
            <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          
          {/* Track ring */}
          <circle 
            r={R} 
            cx={50} 
            cy={50} 
            stroke="hsl(var(--muted))" 
            strokeWidth={strokeWidth} 
            fill="none" 
            opacity={0.2}
          />
          
          {/* Glow effect */}
          <circle
            r={R}
            cx={50}
            cy={50}
            stroke={`url(#${id})`}
            strokeWidth={strokeWidth + 2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            transform="rotate(-90 50 50)"
            filter={`url(#glow-${id})`}
            opacity={0.6}
            className="transition-all duration-1000 ease-out"
            style={{ strokeDasharray: `${dash} ${C - dash}` }}
          />
          
          {/* Progress ring */}
          <circle
            r={R}
            cx={50}
            cy={50}
            stroke={`url(#${id})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            transform="rotate(-90 50 50)"
            className="transition-all duration-1000 ease-out"
            style={{ strokeDasharray: `${dash} ${C - dash}` }}
          />
          
          {/* Icon */}
          <g transform="translate(50,50)">
            <foreignObject x={-12} y={-12} width={24} height={24}>
              <div className="flex items-center justify-center w-6 h-6 text-foreground">{icon}</div>
            </foreignObject>
          </g>
        </svg>
      </div>
      
      <div className="text-lg font-semibold text-foreground tabular-nums">{value}</div>
      <div className="text-xs tracking-[0.25em] text-muted-foreground uppercase">{label}</div>
    </div>
  );
};

export default function KeyMetricsBoard({
  sparkTitle,
  sparkValue,
  sparkUnit,
  sparkData,
  halos
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Sparkline Card */}
      <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border/20 relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted-foreground text-sm font-medium">{sparkTitle}</div>
            <div className="text-foreground text-xl font-semibold tabular-nums">
              {sparkValue} <span className="text-muted-foreground text-sm font-normal">{sparkUnit}</span>
            </div>
          </div>
          
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" />
                  </filter>
                </defs>
                
                {/* Glow line */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="none"
                  strokeWidth={3}
                  filter="url(#sparkGlow)"
                  opacity={0.6}
                />
                
                {/* Main line and area */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="url(#sparkGradient)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ 
                    r: 4, 
                    fill: "hsl(var(--primary))", 
                    stroke: "hsl(var(--background))", 
                    strokeWidth: 2 
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Halo Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {halos.map((halo, i) => (
          <HaloCircle key={i} {...halo} delay={i * 200} />
        ))}
      </div>
    </div>
  );
}