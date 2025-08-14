import React, { useMemo } from "react";
import NutritionOverview from "./NutritionOverview";
import { useDailySummaryData } from "@/hooks/useDailySummaryData";
import { format, subDays } from "date-fns";

interface Props {
  currentDate: Date;
  meals: any[];
  dailyGoals: any;
}

export const DashboardNutritionOverview: React.FC<Props> = ({
  currentDate,
  meals,
  dailyGoals
}) => {
  const { data: summary7 } = useDailySummaryData(7);
  const { data: summary30 } = useDailySummaryData(30);

  const { kcalToday, macros, history7, history30 } = useMemo(() => {
    // Calculate today's calories from meals
    const todayString = format(currentDate, 'yyyy-MM-dd');
    const todaysMeals = meals.filter(meal => {
      const mealDate = format(new Date(meal.date || meal.created_at), 'yyyy-MM-dd');
      return mealDate === todayString;
    });
    
    const kcalToday = todaysMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    
    // Calculate today's macros from meals
    const proteinToday = todaysMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const carbsToday = todaysMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const fatsToday = todaysMeals.reduce((sum, meal) => sum + (meal.fats || 0), 0);

    // Prepare macro data with our color system
    const macros = [
      { 
        label: "P" as const, 
        value: proteinToday, 
        target: dailyGoals?.protein || 120, 
        colors: ["hsl(142, 76%, 36%)", "hsl(142, 71%, 45%)"] as [string, string]
      },
      { 
        label: "K" as const, 
        value: carbsToday, 
        target: dailyGoals?.carbs || 200, 
        colors: ["hsl(217, 91%, 60%)", "hsl(221, 83%, 53%)"] as [string, string]
      },
      { 
        label: "F" as const, 
        value: fatsToday, 
        target: dailyGoals?.fats || 60, 
        colors: ["hsl(43, 96%, 56%)", "hsl(0, 84%, 60%)"] as [string, string]
      }
    ];

    // Prepare 7-day history
    const history7 = summary7
      .slice(-7)
      .map((day, index) => ({
        day: format(subDays(currentDate, 6 - index), 'EEE'),
        kcal: day.totalCalories || 0
      }));

    // Prepare 30-day history  
    const history30 = summary30
      .slice(-30)
      .map((day, index) => ({
        day: String(index + 1),
        kcal: day.totalCalories || 0
      }));

    return {
      kcalToday,
      macros,
      history7,
      history30
    };
  }, [currentDate, meals, dailyGoals, summary7, summary30]);

  return (
    <NutritionOverview
      kcalToday={kcalToday}
      kcalGoal={dailyGoals?.calories || 2000}
      macros={macros}
      history7={history7}
      history30={history30}
    />
  );
};