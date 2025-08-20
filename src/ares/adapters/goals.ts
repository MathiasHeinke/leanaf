// ARES Adapter: Profile Goals <-> ARES Context
// Extracts user goals from profile data for consistent ARES context

export type ProfileGoals = {
  daily_calorie_target?: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fats_target_g?: number;
  fluid_goal_ml?: number;
  steps_goal?: number;
  target_weight?: number;
  weekly_weight_loss_target?: number;
};

export type ARESGoalContext = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  hydration: number;
  steps: number;
  weight_target?: number;
  weight_loss_rate?: number;
};

export const extractGoalsFromProfile = (profile: any): ARESGoalContext => {
  // Default values based on moderate activity level
  const defaults = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
    hydration: 2500,
    steps: 10000
  };

  return {
    calories: profile?.daily_calorie_target || defaults.calories,
    protein: profile?.protein_target_g || defaults.protein,
    carbs: profile?.carbs_target_g || defaults.carbs,
    fats: profile?.fats_target_g || defaults.fats,
    hydration: profile?.fluid_goal_ml || defaults.hydration,
    steps: profile?.steps_goal || defaults.steps,
    weight_target: profile?.target_weight || undefined,
    weight_loss_rate: profile?.weekly_weight_loss_target || undefined
  };
};

// Calculate goal achievement percentages
export const calculateGoalAchievement = (
  goals: ARESGoalContext, 
  actual: Partial<ARESGoalContext>
): Record<string, number> => {
  const achievements: Record<string, number> = {};
  
  Object.keys(goals).forEach(key => {
    const goal = goals[key as keyof ARESGoalContext];
    const value = actual[key as keyof ARESGoalContext];
    
    if (typeof goal === 'number' && typeof value === 'number') {
      achievements[key] = Math.round((value / goal) * 100);
    }
  });
  
  return achievements;
};