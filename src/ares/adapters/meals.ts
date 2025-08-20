// ARES Adapter: Unified Meal Pipeline for Chat & Dashboard
// Single source of truth for meal analysis, saving, and context generation

import { supabase } from '@/integrations/supabase/client';

export type MealLegacy = {
  title: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  date: string;
  meal_type?: string;
  created_at?: string;
  ts?: string;
};

export type MealModern = {
  name: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  meal_date: string;
  meal_type: string;
  timestamp: string;
  confidence?: number;
};

export const toLegacyMeal = (modern: MealModern): MealLegacy => ({
  title: modern.name,
  calories: modern.nutrition.calories,
  protein: modern.nutrition.protein,
  carbs: modern.nutrition.carbs,
  fat: modern.nutrition.fats,
  date: modern.meal_date,
  meal_type: modern.meal_type,
  ts: modern.timestamp
});

export const toModernMeal = (legacy: MealLegacy): MealModern => ({
  name: legacy.title,
  nutrition: {
    calories: legacy.calories || 0,
    protein: legacy.protein || 0,
    carbs: legacy.carbs || 0,
    fats: legacy.fat || 0
  },
  meal_date: legacy.date,
  meal_type: legacy.meal_type || 'snack',
  timestamp: legacy.ts || legacy.created_at || new Date().toISOString(),
  confidence: 0.8
});

// Unified meal analysis pipeline (replaces multiple endpoints)
export async function analyzeMeal(
  input: string, 
  images?: string[],
  traceId?: string
): Promise<MealModern> {
  const { data, error } = await supabase.functions.invoke('analyze-meal', {
    body: { 
      input, 
      images: images || [], 
      traceId,
      version: 'ares-v1' 
    }
  });
  
  if (error) {
    throw new Error(`Meal analysis failed: ${error.message}`);
  }
  
  return toModernMeal(data);
}

// Unified meal saving (Chat & Dashboard use same path)
export async function saveMeal(
  meal: MealModern, 
  userId: string,
  traceId?: string
): Promise<void> {
  const legacy = toLegacyMeal(meal);
  
  const { error } = await supabase.from('meals').insert({
    ...legacy,
    text: meal.name, // Required field
    user_id: userId,
    client_event_id: traceId || `meal_${Date.now()}`
  });
  
  if (error) {
    throw new Error(`Failed to save meal: ${error.message}`);
  }
}

// Aggregate meal context for ARES
export const aggregateMealContext = (meals: MealLegacy[]): any => {
  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fats: acc.fats + (meal.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  
  const mealTypes = [...new Set(meals.map(m => m.meal_type).filter(Boolean))];
  
  return {
    ...totals,
    meal_count: meals.length,
    meal_types: mealTypes,
    last_meal: meals[0]?.title || null,
    last_meal_time: meals[0]?.ts || null
  };
};