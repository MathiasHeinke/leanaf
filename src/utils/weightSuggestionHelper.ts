// Weight suggestion helper based on user profile and exercise type
export interface UserProfile {
  weight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

export interface ExerciseWeightSuggestion {
  name: string;
  suggestedWeight: number;
  reasoning: string;
}

// Base weight suggestions as percentage of body weight for different exercises
const exerciseWeightPercentages = {
  // Upper Body Push
  'Bankdrücken': { male: 0.8, female: 0.6 },
  'Schulterdrücken': { male: 0.5, female: 0.4 },
  'Liegestütze': { male: 0, female: 0 }, // Bodyweight
  'Seitenheben': { male: 0.1, female: 0.08 },
  
  // Upper Body Pull
  'Klimmzüge': { male: 0, female: 0 }, // Bodyweight
  'Latzug': { male: 0.7, female: 0.55 },
  'Rudern am Kabel': { male: 0.6, female: 0.45 },
  'Rudern': { male: 0.6, female: 0.45 },
  'Kreuzheben': { male: 1.2, female: 0.9 },
  'Bizeps Curls': { male: 0.2, female: 0.15 },
  
  // Lower Body
  'Kniebeugen': { male: 1.0, female: 0.8 },
  'Rumänisches Kreuzheben': { male: 0.8, female: 0.6 },
  'Beinpresse': { male: 1.5, female: 1.2 },
  'Lunges': { male: 0.3, female: 0.25 },
  'Wadenheben': { male: 0.4, female: 0.3 },
  
  // Default fallback
  'default': { male: 0.4, female: 0.3 }
};

// Activity level multipliers
const activityMultipliers = {
  'sedentary': 0.7,
  'light': 0.8,
  'moderate': 1.0,
  'active': 1.2,
  'very_active': 1.4
};

// Age adjustment factors (peak strength typically around 25-35)
const getAgeMultiplier = (age?: number): number => {
  if (!age) return 1.0;
  if (age < 20) return 0.8;
  if (age < 30) return 1.0;
  if (age < 40) return 0.95;
  if (age < 50) return 0.9;
  if (age < 60) return 0.8;
  return 0.7;
};

export const suggestWeightForExercise = (
  exerciseName: string,
  userProfile: UserProfile
): ExerciseWeightSuggestion => {
  const bodyWeight = userProfile.weight || 70; // Default 70kg if no weight provided
  const gender = userProfile.gender || 'male';
  const activityLevel = userProfile.activity_level || 'moderate';
  
  // Get base percentage for this exercise
  const exerciseKey = exerciseName in exerciseWeightPercentages 
    ? exerciseName 
    : 'default';
  const basePercentage = exerciseWeightPercentages[exerciseKey as keyof typeof exerciseWeightPercentages][gender];
  
  // Apply modifiers
  const activityMultiplier = activityMultipliers[activityLevel];
  const ageMultiplier = getAgeMultiplier(userProfile.age);
  
  // Calculate suggested weight
  let suggestedWeight = bodyWeight * basePercentage * activityMultiplier * ageMultiplier;
  
  // Round to nearest 2.5kg for practical gym use
  if (suggestedWeight > 0) {
    suggestedWeight = Math.round(suggestedWeight / 2.5) * 2.5;
  }
  
  // Minimum weights for safety
  if (suggestedWeight > 0 && suggestedWeight < 5) {
    suggestedWeight = 5;
  }
  
  let reasoning = `Basierend auf ${bodyWeight}kg Körpergewicht`;
  if (activityLevel !== 'moderate') {
    reasoning += `, ${activityLevel} Aktivitätslevel`;
  }
  if (userProfile.age && userProfile.age !== 30) {
    reasoning += `, Alter ${userProfile.age}`;
  }
  
  return {
    name: exerciseName,
    suggestedWeight: suggestedWeight,
    reasoning: reasoning
  };
};

export const suggestWeightsForWorkoutPlan = (
  exercises: Array<{ name: string }>,
  userProfile: UserProfile
): ExerciseWeightSuggestion[] => {
  return exercises.map(exercise => suggestWeightForExercise(exercise.name, userProfile));
};