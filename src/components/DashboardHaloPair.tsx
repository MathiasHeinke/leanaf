import React from "react";
import HaloPair from "./HaloPair";
import { Droplet, Footprints } from "lucide-react";
import { useFluidsToday } from "@/hooks/useFluidsToday";
import { useFluidTargets } from "@/hooks/useFluidTargets";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  todaysWorkout: any;
  weightKg?: number;
}

export const DashboardHaloPair: React.FC<Props> = ({
  todaysWorkout,
  weightKg
}) => {
  const { user } = useAuth();
  const { waterEqMl } = useFluidsToday(user?.id);
  const { goalMl } = useFluidTargets(user?.id, weightKg);
  
  const fluidProgress = Math.min(waterEqMl / goalMl, 1);

  // Calculate steps
  const todaysSteps = todaysWorkout?.steps || 0;
  const stepsGoal = 10000; // Default goal
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
        value: formatFluid(waterEqMl),
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