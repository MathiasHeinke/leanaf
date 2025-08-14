import React, { useMemo } from "react";
import HaloPair from "./HaloPair";
import { Droplet, Footprints } from "lucide-react";

interface Props {
  todaysFluids: any[];
  todaysWorkouts: any[];
  userProfile?: any;
}

export const DashboardHaloPair: React.FC<Props> = ({
  todaysFluids,
  todaysWorkouts,
  userProfile
}) => {
  const { waterHalo, stepsHalo } = useMemo(() => {
    // Calculate water intake (assuming water has 0 calories)
    const waterIntake = todaysFluids
      .filter(fluid => fluid.fluid_category === 'water' || fluid.calories_per_100ml === 0)
      .reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);
    
    const waterInLiters = waterIntake / 1000;
    const waterGoal = userProfile?.water_goal || 3; // Default 3L goal
    
    // Calculate steps from workouts
    const totalSteps = todaysWorkouts.reduce((sum, workout) => {
      return sum + (workout.steps || 0);
    }, 0);
    
    const stepsGoal = userProfile?.steps_goal || 10000; // Default 10k steps
    
    const waterHalo = {
      label: "WASSER",
      value: `${waterInLiters.toFixed(1)}L`,
      progress: Math.min(1, waterInLiters / waterGoal),
      gradient: ["hsl(197, 71%, 73%)", "hsl(217, 91%, 60%)"] as [string, string],
      track: "hsl(var(--secondary))",
      icon: <Droplet size={18} />
    };

    const stepsHalo = {
      label: "SCHRITTE",
      value: totalSteps >= 1000 ? `${(totalSteps / 1000).toFixed(1)}k` : String(totalSteps),
      progress: Math.min(1, totalSteps / stepsGoal),
      gradient: ["hsl(25, 95%, 53%)", "hsl(0, 84%, 60%)"] as [string, string],
      track: "hsl(var(--secondary))",
      icon: <Footprints size={18} />
    };

    return { waterHalo, stepsHalo };
  }, [todaysFluids, todaysWorkouts, userProfile]);

  return (
    <HaloPair
      left={waterHalo}
      right={stepsHalo}
    />
  );
};