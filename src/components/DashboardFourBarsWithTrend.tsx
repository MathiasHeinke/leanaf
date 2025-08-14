import React, { useMemo } from "react";
import FourBarsWithTrend from "./FourBarsWithTrend";
import { useDailySummaryData } from "@/hooks/useDailySummaryData";
import { format, subDays } from "date-fns";

interface Props {
  currentDate: Date;
  meals: any[];
  dailyGoals: any;
  todaysFluids: any[];
}

export const DashboardFourBarsWithTrend: React.FC<Props> = ({
  currentDate,
  meals,
  dailyGoals,
  todaysFluids
}) => {
  const { data: summary7 } = useDailySummaryData(7);

  const { barsData, trendData } = useMemo(() => {
    // Calculate today's values from meals and fluids
    const todayString = format(currentDate, 'yyyy-MM-dd');
    const todaysMeals = meals.filter(meal => {
      const mealDate = format(new Date(meal.date || meal.created_at), 'yyyy-MM-dd');
      return mealDate === todayString;
    });
    
    const mealCalories = todaysMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const fluidCalories = todaysFluids.reduce((sum, fluid) => {
      const calories = (fluid.calories_per_100ml || 0) * (fluid.amount_ml / 100);
      return sum + calories;
    }, 0);
    
    const kcalToday = mealCalories + fluidCalories;
    const proteinToday = todaysMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const carbsToday = todaysMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const fatsToday = todaysMeals.reduce((sum, meal) => sum + (meal.fats || 0), 0);

    // Prepare bars data
    const barsData: [any, any, any, any] = [
      { 
        key: "P" as const, 
        value: proteinToday, 
        target: dailyGoals?.protein || 150,
        gradient: ["hsl(142, 76%, 36%)", "hsl(142, 71%, 45%)"] as [string, string]
      },
      { 
        key: "K" as const, 
        value: carbsToday, 
        target: dailyGoals?.carbs || 250,
        gradient: ["hsl(217, 91%, 60%)", "hsl(221, 83%, 53%)"] as [string, string]
      },
      { 
        key: "F" as const, 
        value: fatsToday, 
        target: dailyGoals?.fats || 65,
        gradient: ["hsl(43, 96%, 56%)", "hsl(0, 84%, 60%)"] as [string, string]
      },
      { 
        key: "C" as const, 
        value: kcalToday, 
        target: dailyGoals?.calories || 2000
      }
    ];

    // Prepare 7-day trend data
    const trendData = summary7
      .slice(-7)
      .map((day, index) => ({
        x: format(subDays(currentDate, 6 - index), 'EEE'),
        y: day.totalCalories || 0
      }));

    return {
      barsData,
      trendData
    };
  }, [currentDate, meals, dailyGoals, todaysFluids, summary7]);

  return (
    <FourBarsWithTrend
      bars={barsData}
      trend7d={trendData}
    />
  );
};