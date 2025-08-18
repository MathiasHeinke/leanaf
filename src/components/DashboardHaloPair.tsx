import React from "react";
import HaloPair from "./HaloPair";
import { Droplet, Footprints } from "lucide-react";
import { useTodayFluids } from "@/hooks/useTodayFluids";
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
  const { hydrationMl, goalMl, percent } = useTodayFluids(user?.id);
  
  const fluidProgress = percent / 100;

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
        value: formatFluid(hydrationMl),
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