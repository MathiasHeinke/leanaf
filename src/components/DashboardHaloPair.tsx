import React from "react";
import HaloPair from "./HaloPair";
import { Droplet, Footprints } from "lucide-react";
import { fluidCalculations, calculateProgress, formatFluidAmount } from "@/utils/fluidCalculations";

interface Props {
  todaysFluids: any[];
  todaysWorkout: any;
  dailyGoals: any;
}

export const DashboardHaloPair: React.FC<Props> = ({
  todaysFluids,
  todaysWorkout,
  dailyGoals
}) => {
  // Calculate fluid intake (only water - unified calculation)
  const totalFluidMl = fluidCalculations.getHydrationAmount(todaysFluids);
  const fluidGoalMl = dailyGoals?.fluid_goal_ml || 2500;
  const fluidProgress = calculateProgress(totalFluidMl, fluidGoalMl);

  // Calculate steps
  const todaysSteps = todaysWorkout?.steps || 0;
  const stepsGoal = dailyGoals?.steps_goal || 10000;
  const stepsProgress = calculateProgress(todaysSteps, stepsGoal);

  // Format values
  const formatFluid = (ml: number) => `${(ml / 1000).toFixed(1)}L`;
  const formatSteps = (steps: number) => {
    if (steps >= 1000) {
      return `${(steps / 1000).toFixed(1)}k`;
    }
    return steps.toString();
  };

  return (
    <HaloPair
      left={{
        label: "WASSER",
        value: formatFluid(totalFluidMl),
        progress: fluidProgress,
        gradient: ["#67e8f9", "#3b82f6"],
        track: "rgba(59,130,246,0.15)",
        icon: <Droplet size={18} />,
      }}
      right={{
        label: "SCHRITTE",
        value: formatSteps(todaysSteps),
        progress: stepsProgress,
        gradient: ["#fb923c", "#ef4444"],
        track: "rgba(239,68,68,0.15)",
        icon: <Footprints size={18} />,
      }}
    />
  );
};