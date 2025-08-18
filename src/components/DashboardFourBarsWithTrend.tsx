import React from "react";
import FourBarsWithTrend from "./FourBarsWithTrend";
import { Droplet, Footprints, Pill } from "lucide-react";
import { useSupplementData } from "@/hooks/useSupplementData";
import { fluidCalculations, calculateProgress } from "@/utils/fluidCalculations";

interface Props {
  meals: any[];
  dailyGoals: any;
  todaysFluids: any[];
  todaysWorkout: any;
  currentDate?: Date;
}

export const DashboardFourBarsWithTrend: React.FC<Props> = ({
  meals,
  dailyGoals,
  todaysFluids,
  todaysWorkout,
  currentDate
}) => {
  const { groupedSupplements, totalScheduled, totalTaken, completionPercent } = useSupplementData(currentDate);
  
  // Debug logs for supplement data
  console.log('Supplement Debug:', {
    groupedSupplements,
    totalScheduled,
    totalTaken,
    completionPercent
  });

  // Calculate current macro values from meals
  const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const totalFats = meals.reduce((sum, meal) => sum + (meal.fats || 0), 0);

  // Add fluid calories to total (unified calculation)
  const fluidCalories = fluidCalculations.getTotalCalories(todaysFluids);

  // Goals with fallbacks
  const proteinGoal = dailyGoals?.protein || 150;
  const carbsGoal = dailyGoals?.carbs || 250;
  const fatsGoal = dailyGoals?.fats || 65;
  const caloriesGoal = dailyGoals?.calories || 2000;

  // Calculate fluid intake (water only - unified calculation)
  const totalFluidMl = fluidCalculations.getHydrationAmount(todaysFluids);
  const fluidGoalMl = dailyGoals?.fluid_goal_ml || 2500;
  const fluidProgress = calculateProgress(totalFluidMl, fluidGoalMl);

  // Calculate steps
  const todaysSteps = todaysWorkout?.steps || 0;
  const stepsGoal = dailyGoals?.steps_goal || 10000;
  const stepsProgress = calculateProgress(todaysSteps, stepsGoal);

  // Use supplements data from hook instead of manual calculation
  const supplementsProgress = completionPercent / 100; // Hook returns percentage, we need decimal

  // Format values
  const formatFluid = (ml: number) => `${(ml / 1000).toFixed(1)}L`;
  const formatFluidDetail = (current: number, goal: number) => `${(current / 1000).toFixed(1)}/${(goal / 1000).toFixed(1)}L`;
  const formatSteps = (steps: number) => {
    if (steps >= 1000) {
      return `${(steps / 1000).toFixed(1)}k`;
    }
    return steps.toString();
  };
  const formatStepsDetail = (current: number, goal: number) => {
    const formatNumber = (num: number) => num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toString();
    return `${formatNumber(current)}/${formatNumber(goal)}`;
  };
  const formatSupplements = (taken: number, total: number) => `${taken}/${total}`;
  const formatSupplementsDetail = (taken: number, total: number) => `${taken}/${total}`;

  const bars: [any, any, any, any] = [
    {
      key: "C" as const,
      value: totalCalories + fluidCalories,
      target: caloriesGoal
      // No gradient specified - will use anthrazit default
    },
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
    }
  ];

  return (
    <FourBarsWithTrend 
      bars={bars} 
      waterHalo={{
        label: "WASSER",
        value: formatFluid(totalFluidMl),
        detailValue: formatFluidDetail(totalFluidMl, fluidGoalMl),
        progress: fluidProgress,
        gradient: ["#67e8f9", "#3b82f6"],
        track: "rgba(59,130,246,0.15)",
        icon: <Droplet size={16} />,
      }}
      stepsHalo={{
        label: "SCHRITTE",
        value: formatSteps(todaysSteps),
        detailValue: formatStepsDetail(todaysSteps, stepsGoal),
        progress: stepsProgress,
        gradient: ["#fb923c", "#ef4444"],
        track: "rgba(239,68,68,0.15)",
        icon: <Footprints size={16} />,
      }}
      supplementsHalo={{
        label: "SUPPLEMENTS",
        value: formatSupplements(totalTaken, totalScheduled),
        detailValue: formatSupplementsDetail(totalTaken, totalScheduled),
        progress: supplementsProgress,
        gradient: ["#a855f7", "#7c3aed"],
        track: "rgba(168,85,247,0.15)",
        icon: <Pill size={16} />,
      }}
    />
  );
};