import React, { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, ReferenceLine } from "recharts";
import { Flame, Droplet, Footprints, Check } from "lucide-react";

type SparkData = { day: string; value: number };

interface HaloMetric {
  icon: React.ReactNode;
  value: string;
  label: string;
  progress: number; // 0..1
  gradient: [string, string];
  goalValue?: string;
  unit?: string;
}

interface Props {
  sparkTitle: string;
  sparkValue: string;
  sparkUnit: string;
  sparkData: SparkData[];
  sparkGoal?: number;
  halos: [HaloMetric, HaloMetric];
}

const HaloCircle: React.FC<HaloMetric & { delay?: number }> = ({ 
  icon, 
  value, 
  label, 
  progress, 
  gradient, 
  goalValue,
  unit,
  delay = 0 
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const R = 38;
  const strokeWidth = 6;
  const C = 2 * Math.PI * R;
  const dash = C * animatedProgress;

  const id = `grad-${label.replace(/\s+/g, '')}-${Math.random().toString(36).slice(2)}`;
  const glowId = `glow-${id}`;
  const outerGlowId = `outer-glow-${id}`;

  // Enhanced progress states
  const isHighProgress = progress > 0.9;
  const isComplete = progress >= 1.0;
  const isLowProgress = progress < 0.5;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, delay);
    return () => clearTimeout(timer);
  }, [progress, delay]);

  // Dynamic gradient based on progress
  const dynamicGradient = isLowProgress 
    ? [gradient[0], "hsl(0, 84%, 60%)"] // Shift to red for low progress
    : gradient;

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center w-full border border-border/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
      <div className="relative mb-3">
        <svg width={100} height={100}>
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={dynamicGradient[0]} />
              <stop offset="100%" stopColor={dynamicGradient[1]} />
            </linearGradient>
            
            {/* Enhanced glow filters */}
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            
            <filter id={outerGlowId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" />
              <feOffset dx="0" dy="0" />
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
            opacity={0.15}
          />
          
          {/* Outer animated glow */}
          <circle
            r={R + 2}
            cx={50}
            cy={50}
            stroke={`url(#${id})`}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash * 1.05} ${C * 1.05 - dash * 1.05}`}
            transform="rotate(-90 50 50)"
            filter={`url(#${outerGlowId})`}
            opacity={0.4}
            className={`transition-all duration-1000 ease-out ${isHighProgress ? 'animate-pulse' : ''}`}
            style={{ strokeDasharray: `${dash * 1.05} ${C * 1.05 - dash * 1.05}` }}
          />
          
          {/* Inner glow effect */}
          <circle
            r={R}
            cx={50}
            cy={50}
            stroke={`url(#${id})`}
            strokeWidth={strokeWidth + 1}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            transform="rotate(-90 50 50)"
            filter={`url(#${glowId})`}
            opacity={0.7}
            className="transition-all duration-1000 ease-out"
            style={{ strokeDasharray: `${dash} ${C - dash}` }}
          />
          
          {/* Main progress ring with round caps */}
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
            className="transition-all duration-1000 ease-out drop-shadow-sm"
            style={{ strokeDasharray: `${dash} ${C - dash}` }}
          />
          
          {/* Success checkmark for completed goals */}
          {isComplete && (
            <g transform="translate(50,50)">
              <circle 
                r="8" 
                fill={dynamicGradient[1]} 
                className="animate-scale-in"
              />
              <foreignObject x={-6} y={-6} width={12} height={12}>
                <div className="flex items-center justify-center w-3 h-3 text-white">
                  <Check size={8} strokeWidth={3} />
                </div>
              </foreignObject>
            </g>
          )}
          
          {/* Main icon */}
          <g transform="translate(50,50)">
            <foreignObject x={-12} y={-12} width={24} height={24}>
              <div className={`flex items-center justify-center w-6 h-6 text-foreground transition-transform duration-200 ${isComplete ? 'scale-75' : 'group-hover:scale-110'}`}>
                {icon}
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>
      
      {/* Enhanced value display with goal */}
      <div className="text-center">
        <div className="text-lg font-bold text-foreground tabular-nums mb-1">
          {goalValue ? (
            <span>
              <span className="text-foreground">{value}</span>
              <span className="text-muted-foreground font-normal text-sm mx-1">/</span>
              <span className="text-muted-foreground font-normal text-sm">{goalValue}</span>
              {unit && <span className="text-muted-foreground font-normal text-sm">{unit}</span>}
            </span>
          ) : (
            value
          )}
        </div>
        <div className="text-xs tracking-[0.25em] text-muted-foreground uppercase font-medium">
          {label}
        </div>
      </div>
    </div>
  );
};

export default function KeyMetricsBoard({
  sparkTitle,
  sparkValue,
  sparkUnit,
  sparkData,
  sparkGoal,
  halos
}: Props) {
  // Calculate if goal is reached for sparkline styling
  const latestValue = sparkData[sparkData.length - 1]?.value || 0;
  const isGoalReached = sparkGoal ? latestValue >= sparkGoal : false;
  
  // Dynamic gradient based on goal achievement
  const sparkGradientId = isGoalReached ? "sparkGradientSuccess" : "sparkGradientDefault";
  const sparkStrokeColor = isGoalReached ? "hsl(120, 70%, 50%)" : "hsl(var(--primary))";

  return (
    <div className="flex flex-col gap-4">
      {/* Enhanced Sparkline Card */}
      <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border/20 relative overflow-hidden hover:shadow-xl transition-all duration-300 group">
        {/* Dynamic glow effect based on goal achievement */}
        <div className={`absolute inset-0 bg-gradient-to-br ${isGoalReached ? 'from-green-500/10 to-transparent' : 'from-primary/5 to-transparent'} pointer-events-none transition-all duration-500`} />
        
        {/* Achievement badge */}
        {isGoalReached && (
          <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 animate-fade-in">
            <Check size={12} />
            Ziel erreicht
          </div>
        )}
        
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="text-muted-foreground text-sm font-medium">{sparkTitle}</div>
            <div className="text-foreground text-xl font-bold tabular-nums">
              {sparkValue} 
              <span className="text-muted-foreground text-sm font-normal ml-1">{sparkUnit}</span>
              {sparkGoal && (
                <span className="text-muted-foreground text-sm font-normal ml-1">
                  / {sparkGoal} {sparkUnit}
                </span>
              )}
            </div>
          </div>
          
          <div className="h-16 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  {/* Default gradient */}
                  <linearGradient id="sparkGradientDefault" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  
                  {/* Success gradient */}
                  <linearGradient id="sparkGradientSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(120, 70%, 50%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(120, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                  
                  {/* Enhanced glow filter */}
                  <filter id="sparkGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" />
                  </filter>
                </defs>
                
                {/* Goal line */}
                {sparkGoal && (
                  <ReferenceLine 
                    y={sparkGoal} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="4 4" 
                    strokeWidth={1}
                    opacity={0.6}
                  />
                )}
                
                {/* Enhanced glow line */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparkStrokeColor}
                  fill="none"
                  strokeWidth={3}
                  filter="url(#sparkGlow)"
                  opacity={0.7}
                  className="transition-all duration-500"
                />
                
                {/* Main line and area with enhanced styling */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparkStrokeColor}
                  fill={`url(#${sparkGradientId})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ 
                    r: 5, 
                    fill: sparkStrokeColor, 
                    stroke: "hsl(var(--background))", 
                    strokeWidth: 2,
                    className: "drop-shadow-sm"
                  }}
                  className="transition-all duration-500"
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Goal achievement indicator */}
            {sparkGoal && isGoalReached && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg border-2 border-background"></div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Halo Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {halos.map((halo, i) => (
          <HaloCircle key={i} {...halo} delay={i * 150} />
        ))}
      </div>
    </div>
  );
}