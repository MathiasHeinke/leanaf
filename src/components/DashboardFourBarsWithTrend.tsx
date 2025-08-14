import React from "react";
import FourBarsWithTrend from "./FourBarsWithTrend";
import { Droplet, Footprints } from "lucide-react";

interface Props {
  meals: any[];
  dailyGoals: any;
  todaysFluids: any[];
  todaysWorkout: any;
}

export const DashboardFourBarsWithTrend: React.FC<Props> = ({
  meals,
  dailyGoals,
  todaysFluids,
  todaysWorkout
}) => {

  // Calculate current macro values from meals
  const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalFats = meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);

  // Add fluid calories to total
  const fluidCalories = todaysFluids.reduce((sum, fluid) => {
    const calories = (fluid.calories_per_100ml || 0) * (fluid.amount_ml / 100);
    return sum + calories;
  }, 0);

  // Goals with fallbacks
  const proteinGoal = dailyGoals?.protein || 150;
  const carbsGoal = dailyGoals?.carbs || 250;
  const fatsGoal = dailyGoals?.fats || 65;
  const caloriesGoal = dailyGoals?.calories || 2000;

  // Calculate fluid intake (non-alcoholic only)
  const totalFluidMl = todaysFluids
    .filter(fluid => !fluid.has_alcohol)
    .reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);
  const fluidGoalMl = dailyGoals?.fluid_goal_ml || 2500;
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

  const bars: [any, any, any, any] = [
    {
      key: "P" as const,
      value: totalProtein,
      target: proteinGoal,
      gradient: ["#22c55e", "#16a34a"] as [string, string]
    },
    {
      key: "K" as const,
      value: totalCarbs,
      target: carbsGoal,
      gradient: ["#60a5fa", "#3b82f6"] as [string, string]
    },
    {
      key: "F" as const,
      value: totalFats,
      target: fatsGoal,
      gradient: ["#f59e0b", "#ef4444"] as [string, string]
    },
    {
      key: "C" as const,
      value: totalCalories + fluidCalories,
      target: caloriesGoal
      // No gradient specified - will use anthrazit default
    }
  ];

  return (
    <FourBarsWithTrend 
      bars={bars} 
      waterHalo={{
        label: "WASSER",
        value: formatFluid(totalFluidMl),
        progress: fluidProgress,
        gradient: ["#67e8f9", "#3b82f6"],
        track: "rgba(59,130,246,0.15)",
        icon: <Droplet size={16} />,
      }}
      stepsHalo={{
        label: "SCHRITTE",
        value: formatSteps(todaysSteps),
        progress: stepsProgress,
        gradient: ["#fb923c", "#ef4444"],
        track: "rgba(239,68,68,0.15)",
        icon: <Footprints size={16} />,
      }}
    />
  );
};