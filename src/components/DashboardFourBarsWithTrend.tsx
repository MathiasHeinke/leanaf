import React from "react";
import FourBarsWithTrend from "./FourBarsWithTrend";
import { useDailySummaryData } from "@/hooks/useDailySummaryData";

interface Props {
  meals: any[];
  dailyGoals: any;
  todaysFluids: any[];
}

export const DashboardFourBarsWithTrend: React.FC<Props> = ({
  meals,
  dailyGoals,
  todaysFluids
}) => {
  const { data: summaryData } = useDailySummaryData(7);

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

  // Prepare trend data (last 7 days of calories)
  const trend7d = summaryData
    .slice(-7) // Last 7 days
    .map((day, index) => ({
      x: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][index % 7], // Day abbreviation
      y: day.totalCalories
    }));

  // If no trend data, create empty trend
  if (trend7d.length === 0) {
    for (let i = 0; i < 7; i++) {
      trend7d.push({
        x: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i],
        y: 0
      });
    }
  }

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

  return <FourBarsWithTrend bars={bars} trend7d={trend7d} />;
};