import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

export default async function handleMassBuildingCalculator(conv: any[], userId: string, args: any) {
  try {
    const { 
      current_weight, 
      height, 
      age, 
      activity_level, 
      training_intensity,
      goal_weight_gain_per_week,
      current_body_fat
    } = args;

    // ARES Mass Building Protocol
    const massCalculations = calculateMassBuildingNeeds({
      currentWeight: current_weight || 80,
      height: height || 180,
      age: age || 25,
      activityLevel: activity_level || 'very_active',
      trainingIntensity: training_intensity || 'heavy',
      goalWeightGain: goal_weight_gain_per_week || 0.5,
      currentBodyFat: current_body_fat || 15
    });

    // Store calculations in user profile or daily goals
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        target_weight: massCalculations.target_weight,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) console.error('Profile update error:', updateError);

    return {
      role: 'assistant',
      content: `**⚡ ARES MASS BUILDING PROTOCOL ⚡**

**Schwer ist korrekt. Weiter.** - ULTIMATE performance demands TOTAL commitment!

## **Deine Makros für maximalen Masseaufbau:**

**🔥 Kalorien:** ${massCalculations.daily_calories} kcal/Tag
*"Viel hilft viel - keine halben Sachen!"*

**🥩 Protein:** ${massCalculations.protein_grams}g (${massCalculations.protein_calories} kcal)
*${massCalculations.protein_grams / (current_weight || 80)} g/kg Körpergewicht*

**🍚 Kohlenhydrate:** ${massCalculations.carbs_grams}g (${massCalculations.carbs_calories} kcal) 
*Reis, Haferflocken, Kartoffeln - bewährte Energielieferanten*

**🥑 Fette:** ${massCalculations.fats_grams}g (${massCalculations.fats_calories} kcal)
*Nussmus, Avocado, Eigelb - natürliche Quellen*

## **Markus' Masse-Strategien:**

**📅 Mahlzeiten-Timing:**
• **5-6 Mahlzeiten** über den Tag verteilt
• **Frühstück:** ${Math.round(massCalculations.daily_calories * 0.2)} kcal (6 Eier + Haferflocken)
• **Post-Workout:** ${Math.round(massCalculations.daily_calories * 0.25)} kcal (3 Messlöffel Whey + Kohlenhydrate)
• **Vor dem Schlafen:** ${Math.round(massCalculations.daily_calories * 0.15)} kcal (Magerquark + Nüsse)

**🛒 Rühls Einkaufsliste:**
• Magerquark, Haferflocken, Reis, Hühnchen, Rindfleisch, Fisch
• Eier (viele!), Vollmilch, Bananen, Kartoffeln
• *"Keine ausgefallenen Superfoods - bodenständige Massenkost!"*

**⚡ Legendärer Thunfisch-Shake:**
*"Thunfisch mit Wasser püriert - kein Genuss, aber schneller Protein-Kick!"*

**Ziel:** +${goal_weight_gain_per_week || 0.5}kg/Woche = ${massCalculations.target_weight}kg in 12 Wochen`,

      preview_card: {
        title: "Mass Building Plan - Markus Rühl",
        description: `${massCalculations.daily_calories} kcal • ${massCalculations.protein_grams}g Protein • ${massCalculations.carbs_grams}g Carbs`,
        content: `Ziel: +${goal_weight_gain_per_week || 0.5}kg/Woche | 5-6 Mahlzeiten täglich`,
        actions: [
          { 
            label: "Mahlzeiten planen", 
            action: "plan_meals", 
            data: { 
              calories: massCalculations.daily_calories,
              protein: massCalculations.protein_grams,
              carbs: massCalculations.carbs_grams,
              fats: massCalculations.fats_grams
            } 
          }
        ]
      }
    };

  } catch (error) {
    console.error('Error in massBuildingCalculator:', error);
    return {
      role: 'assistant',
      content: "Fehler beim Berechnen der Masse-Makros. Markus würde sagen: 'Erstmal ordentlich essen, dann nochmal rechnen!' 🍽️"
    };
  }
}

function calculateMassBuildingNeeds(params: any) {
  const {
    currentWeight,
    height,
    age,
    activityLevel,
    trainingIntensity,
    goalWeightGain,
    currentBodyFat
  } = params;

  // Markus Rühl's approach: Higher calories for mass building
  // Base BMR calculation (Mifflin-St Jeor)
  const bmr = (10 * currentWeight) + (6.25 * height) - (5 * age) + 5;

  // Activity multipliers (Markus style - higher for heavy training)
  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly_active': 1.375,
    'moderately_active': 1.55,
    'very_active': 1.725,      // Markus standard
    'extremely_active': 1.9    // Contest prep training
  };

  // Training intensity bonus (Markus Heavy Training)
  const intensityMultipliers = {
    'light': 1.0,
    'moderate': 1.1,
    'heavy': 1.2,      // Markus signature
    'extreme': 1.3
  };

  const maintenanceCalories = bmr * (activityMultipliers[activityLevel] || 1.725);
  const trainingBonus = maintenanceCalories * (intensityMultipliers[trainingIntensity] - 1);
  
  // Markus approach: Surplus for mass (500-800 kcal above maintenance)
  const surplus = goalWeightGain * 1100; // ~1100 kcal per kg weight gain per week
  const dailyCalories = Math.round(maintenanceCalories + trainingBonus + surplus);

  // Markus Rühl macro distribution for mass building
  // Higher protein and carbs for growth
  const proteinPerKg = trainingIntensity === 'heavy' ? 3.0 : 2.5; // Markus goes high
  const proteinGrams = Math.round(currentWeight * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  // Carbs: 6-8g per kg for heavy training (Markus standard)
  const carbsPerKg = 6.5;
  const carbsGrams = Math.round(currentWeight * carbsPerKg);
  const carbsCalories = carbsGrams * 4;

  // Remaining calories from fats
  const remainingCalories = dailyCalories - proteinCalories - carbsCalories;
  const fatsGrams = Math.round(remainingCalories / 9);
  const fatsCalories = fatsGrams * 9;

  // Target weight calculation
  const weeksToTarget = 12; // 3 months mass building cycle
  const targetWeight = Math.round(currentWeight + (goalWeightGain * weeksToTarget));

  return {
    daily_calories: dailyCalories,
    maintenance_calories: Math.round(maintenanceCalories),
    surplus_calories: Math.round(surplus),
    
    protein_grams: proteinGrams,
    protein_calories: proteinCalories,
    protein_percentage: Math.round((proteinCalories / dailyCalories) * 100),
    
    carbs_grams: carbsGrams,
    carbs_calories: carbsCalories,
    carbs_percentage: Math.round((carbsCalories / dailyCalories) * 100),
    
    fats_grams: fatsGrams,
    fats_calories: fatsCalories,
    fats_percentage: Math.round((fatsCalories / dailyCalories) * 100),
    
    target_weight: targetWeight,
    weeks_to_target: weeksToTarget,
    
    // Markus specific recommendations
    meal_frequency: 5,
    post_workout_carbs: Math.round(carbsGrams * 0.4), // 40% post-workout
    pre_sleep_protein: Math.round(proteinGrams * 0.2), // 20% casein before bed
    
    // Sample day structure
    sample_day: {
      breakfast: {
        calories: Math.round(dailyCalories * 0.2),
        description: "6 Eier + 3 Eiklar + Haferflocken + Vollmilch"
      },
      pre_workout: {
        calories: Math.round(dailyCalories * 0.1),
        description: "Banane + Kaffee + optional Kreatin"
      },
      post_workout: {
        calories: Math.round(dailyCalories * 0.25),
        description: "3 Messlöffel Whey + Reis/Kartoffeln + Banane"
      },
      lunch: {
        calories: Math.round(dailyCalories * 0.2),
        description: "Rindfleisch/Hähnchen + Reis + Gemüse"
      },
      dinner: {
        calories: Math.round(dailyCalories * 0.15),
        description: "Fisch/Hähnchen + Kartoffeln + Salat"
      },
      before_bed: {
        calories: Math.round(dailyCalories * 0.1),
        description: "Magerquark + Nüsse/Nussmus"
      }
    }
  };
}