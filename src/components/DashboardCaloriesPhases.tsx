import React, { useMemo } from 'react';
import DailyCaloriesPhases from './DailyCaloriesPhases';

interface Props {
  meals: any[];
  dailyGoals: any;
  currentDate: Date;
}

// Helper function to determine meal phase based on timestamp
function getMealPhase(timestamp: string | Date): "breakfast" | "lunch" | "dinner" | "snacks" {
  const date = new Date(timestamp);
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 22) return "dinner";
  return "snacks";
}

// Helper function to format date for comparison
function formatDateForComparison(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function DashboardCaloriesPhases({ meals, dailyGoals, currentDate }: Props) {
  const { phaseMeals, macros, goalKcal } = useMemo(() => {
    const todayString = formatDateForComparison(currentDate);
    
    // Filter meals for current date
    const todaysMeals = meals.filter(meal => {
      if (!meal.date && !meal.ts && !meal.created_at) return false;
      
      const mealDate = meal.date || meal.ts || meal.created_at;
      const mealDateString = formatDateForComparison(new Date(mealDate));
      
      return mealDateString === todayString;
    });

    // Group meals by phases
    const phaseGroups = {
      breakfast: { kcal: 0, protein: 0, carbs: 0, fats: 0 },
      lunch: { kcal: 0, protein: 0, carbs: 0, fats: 0 },
      dinner: { kcal: 0, protein: 0, carbs: 0, fats: 0 },
      snacks: { kcal: 0, protein: 0, carbs: 0, fats: 0 }
    };

    todaysMeals.forEach(meal => {
      const phase = getMealPhase(meal.ts || meal.created_at || meal.date);
      const kcal = meal.kcal || meal.calories || 0;
      const protein = meal.protein || 0;
      const carbs = meal.carbs || 0;
      const fats = meal.fat || meal.fats || 0;

      phaseGroups[phase].kcal += kcal;
      phaseGroups[phase].protein += protein;
      phaseGroups[phase].carbs += carbs;
      phaseGroups[phase].fats += fats;
    });

    // Create phase meals array
    const phaseMeals = [
      { key: "breakfast" as const, label: "FRÜH", consumedKcal: phaseGroups.breakfast.kcal, weight: 0.25 },
      { key: "lunch" as const, label: "MITTAG", consumedKcal: phaseGroups.lunch.kcal, weight: 0.35 },
      { key: "dinner" as const, label: "ABEND", consumedKcal: phaseGroups.dinner.kcal, weight: 0.30 },
      { key: "snacks" as const, label: "SNACKS", consumedKcal: phaseGroups.snacks.kcal, weight: 0.10 }
    ];

    // Calculate total macros
    const totalProtein = Object.values(phaseGroups).reduce((sum, phase) => sum + phase.protein, 0);
    const totalCarbs = Object.values(phaseGroups).reduce((sum, phase) => sum + phase.carbs, 0);
    const totalFats = Object.values(phaseGroups).reduce((sum, phase) => sum + phase.fats, 0);

    // Get goals with fallbacks
    const goals = {
      calories: dailyGoals?.calories || 2000,
      protein: dailyGoals?.protein || 150,
      carbs: dailyGoals?.carbs || 250,
      fats: dailyGoals?.fats || 70
    };

    const macros = [
      { 
        label: "P" as const, 
        value: totalProtein, 
        target: goals.protein, 
        colorFrom: "hsl(var(--primary))", 
        colorTo: "hsl(var(--primary-variant))" 
      },
      { 
        label: "K" as const, 
        value: totalCarbs, 
        target: goals.carbs, 
        colorFrom: "hsl(var(--accent))", 
        colorTo: "hsl(var(--accent-variant))" 
      },
      { 
        label: "F" as const, 
        value: totalFats, 
        target: goals.fats, 
        colorFrom: "hsl(var(--secondary))", 
        colorTo: "hsl(var(--secondary-variant))" 
      }
    ];

    return {
      phaseMeals,
      macros,
      goalKcal: goals.calories
    };
  }, [meals, dailyGoals, currentDate]);

  return (
    <DailyCaloriesPhases
      goalKcal={goalKcal}
      meals={phaseMeals}
      macros={macros}
      height={150}
    />
  );
}