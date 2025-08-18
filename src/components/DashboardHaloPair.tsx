import React from "react";
import HaloPair from "./HaloPair";
import { Droplet, Footprints } from "lucide-react";
import { useFluidGoalCalculation } from "@/hooks/useFluidGoalCalculation";

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
  const { data: fluidGoal } = useFluidGoalCalculation();
  
  // Calculate fluid intake (non-alcoholic only)
  const totalFluidMl = todaysFluids
    .filter(fluid => !fluid.has_alcohol)
    .reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);
  
  // Use dynamic fluid goal from hook, fallback to dailyGoals, then hardcoded
  const fluidGoalMl = fluidGoal?.goalMl || dailyGoals?.fluid_goal_ml || dailyGoals?.fluids || 2500;
  const fluidProgress = Math.min(totalFluidMl / fluidGoalMl, 1);

  // Calculate steps
  const todaysSteps = todaysWorkout?.steps || 0;
  const stepsGoal = dailyGoals?.steps_goal || 10000;
  const stepsProgress = Math.min(todaysSteps / stepsGoal, 1);

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