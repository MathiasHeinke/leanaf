import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface FluidGoalSliderProps {
  value: number; // in ml
  onChange: (ml: number) => void;
  min?: number; // default 1500
  max?: number; // default 5000
  step?: number; // default 250
  disabled?: boolean;
  showIcon?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function FluidGoalSlider({
  value,
  onChange,
  min = 1500,
  max = 5000,
  step = 250,
  disabled = false,
  showIcon = true,
  showLabels = true,
  className,
}: FluidGoalSliderProps) {
  // Display in liters
  const displayValue = (value / 1000).toFixed(1);
  const minDisplay = (min / 1000).toFixed(1);
  const maxDisplay = (max / 1000).toFixed(1);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        {showIcon && (
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-400 p-2 rounded-lg">
              <Droplets className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-foreground">Tägliches Wasserziel</span>
          </div>
        )}
        <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
          {displayValue} L
        </span>
      </div>

      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="cursor-pointer"
      />

      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{minDisplay} L</span>
          <span>{maxDisplay} L</span>
        </div>
      )}
    </div>
  );
}
