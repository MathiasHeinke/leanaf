import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MealData {
  calories: number
  protein: number
  carbs: number
  fats: number
  text: string
  meal_type: string
}

interface UserProfile {
  goal: string
  activity_level: string
  target_weight?: number
  weight?: number
  height?: number
  age?: number
  gender?: string
  macro_strategy: string
  muscle_maintenance_priority: boolean
  coach_personality: string
}

interface DailyGoals {
  calories: number
  protein: number
  carbs: number
  fats: number
  calorie_deficit: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { meal, profile, dailyGoals } = await req.json()
    console.log('Evaluating meal:', { meal, profile, dailyGoals })

    // Get user from token
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const evaluation = await evaluateMeal(meal, profile, dailyGoals)
    console.log('Meal evaluation result:', evaluation)

    return new Response(
      JSON.stringify(evaluation),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error evaluating meal:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function evaluateMeal(meal: MealData, profile: UserProfile, dailyGoals: DailyGoals) {
  // Calculate quality score based on multiple criteria
  let qualityScore = 0
  let bonusPoints = 0
  let evaluationCriteria: any = {}

  // 1. Macro balance evaluation (0-3 points)
  const macroScore = evaluateMacroBalance(meal, profile, dailyGoals)
  qualityScore += macroScore.score
  evaluationCriteria.macro_balance = macroScore

  // 2. Goal alignment evaluation (0-3 points)
  const goalScore = evaluateGoalAlignment(meal, profile, dailyGoals)
  qualityScore += goalScore.score
  evaluationCriteria.goal_alignment = goalScore

  // 3. Nutritional quality evaluation (0-2 points)
  const nutritionScore = evaluateNutritionalQuality(meal)
  qualityScore += nutritionScore.score
  evaluationCriteria.nutritional_quality = nutritionScore

  // 4. Meal timing evaluation (0-2 points)
  const timingScore = evaluateMealTiming(meal)
  qualityScore += timingScore.score
  evaluationCriteria.meal_timing = timingScore

  // Calculate bonus points (0-10 based on excellence)
  if (qualityScore >= 9) bonusPoints = 10
  else if (qualityScore >= 8) bonusPoints = 7
  else if (qualityScore >= 7) bonusPoints = 5
  else if (qualityScore >= 6) bonusPoints = 3
  else if (qualityScore >= 5) bonusPoints = 1

  // Generate AI feedback based on coach personality
  const aiFeedback = await generateCoachFeedback(meal, profile, qualityScore, evaluationCriteria)

  return {
    quality_score: Math.round(qualityScore),
    bonus_points: bonusPoints,
    ai_feedback: aiFeedback,
    evaluation_criteria: evaluationCriteria
  }
}

function evaluateMacroBalance(meal: MealData, profile: UserProfile, dailyGoals: DailyGoals) {
  let score = 0
  let feedback = []

  const mealCalorieRatio = meal.calories / dailyGoals.calories
  const mealProteinRatio = meal.protein / dailyGoals.protein
  const mealCarbsRatio = meal.carbs / dailyGoals.carbs
  const mealFatsRatio = meal.fats / dailyGoals.fats

  // Protein evaluation (most important for most goals)
  if (mealProteinRatio >= 0.2 && mealProteinRatio <= 0.4) {
    score += 1.5
    feedback.push("Excellent protein content")
  } else if (mealProteinRatio >= 0.15) {
    score += 1
    feedback.push("Good protein content")
  } else {
    feedback.push("Could use more protein")
  }

  // Carb evaluation based on strategy
  if (profile.macro_strategy === 'low_carb' && mealCarbsRatio <= 0.15) {
    score += 1
    feedback.push("Perfect for low-carb strategy")
  } else if (profile.macro_strategy === 'high_carb' && mealCarbsRatio >= 0.3) {
    score += 1
    feedback.push("Great carb content for your strategy")
  } else if (mealCarbsRatio >= 0.15 && mealCarbsRatio <= 0.35) {
    score += 0.5
    feedback.push("Balanced carb content")
  }

  // Fat evaluation
  if (mealFatsRatio >= 0.15 && mealFatsRatio <= 0.35) {
    score += 0.5
    feedback.push("Good fat balance")
  }

  return { score: Math.min(score, 3), feedback, ratios: { protein: mealProteinRatio, carbs: mealCarbsRatio, fats: mealFatsRatio } }
}

function evaluateGoalAlignment(meal: MealData, profile: UserProfile, dailyGoals: DailyGoals) {
  let score = 0
  let feedback = []

  const caloriesPerMeal = dailyGoals.calories / 4 // Assuming 3 main meals + snacks

  switch (profile.goal) {
    case 'lose':
      if (meal.calories <= caloriesPerMeal * 0.8) {
        score += 2
        feedback.push("Perfect portion size for weight loss")
      } else if (meal.calories <= caloriesPerMeal) {
        score += 1.5
        feedback.push("Good portion control")
      } else {
        feedback.push("Consider smaller portions for weight loss")
      }
      
      // High protein bonus for weight loss
      if (meal.protein >= caloriesPerMeal * 0.3 / 4) {
        score += 1
        feedback.push("Excellent protein for preserving muscle while losing weight")
      }
      break

    case 'gain':
      if (meal.calories >= caloriesPerMeal * 1.1) {
        score += 2
        feedback.push("Great calorie density for weight gain")
      } else if (meal.calories >= caloriesPerMeal) {
        score += 1.5
        feedback.push("Good calories for your goal")
      } else {
        feedback.push("Consider adding more calories for weight gain")
      }
      break

    case 'maintain':
      if (meal.calories >= caloriesPerMeal * 0.9 && meal.calories <= caloriesPerMeal * 1.1) {
        score += 2
        feedback.push("Perfect balance for maintenance")
      } else {
        score += 1
        feedback.push("Close to your maintenance target")
      }
      break
  }

  return { score: Math.min(score, 3), feedback }
}

function evaluateNutritionalQuality(meal: MealData) {
  let score = 0
  let feedback = []

  const mealText = meal.text.toLowerCase()

  // Check for whole foods indicators
  const wholefoods = ['gemüse', 'obst', 'vollkorn', 'nüsse', 'samen', 'fisch', 'hähnchen', 'pute', 'bohnen', 'linsen', 'quinoa', 'reis', 'haferflocken']
  const processedFoods = ['pizza', 'burger', 'pommes', 'chips', 'süßigkeiten', 'schokolade', 'kekse', 'limonade', 'cola']

  const wholefoodCount = wholefoods.filter(food => mealText.includes(food)).length
  const processedCount = processedFoods.filter(food => mealText.includes(food)).length

  if (wholefoodCount >= 3) {
    score += 2
    feedback.push("Excellent variety of whole foods")
  } else if (wholefoodCount >= 2) {
    score += 1.5
    feedback.push("Good whole food content")
  } else if (wholefoodCount >= 1) {
    score += 1
    feedback.push("Some whole foods included")
  }

  if (processedCount > 0) {
    score -= 0.5
    feedback.push("Try to reduce processed foods")
  }

  return { score: Math.max(0, Math.min(score, 2)), feedback }
}

function evaluateMealTiming(meal: MealData) {
  let score = 1 // Base score
  let feedback = []

  const hour = new Date().getHours()
  
  // Breakfast timing (6-11 AM)
  if (meal.meal_type === 'breakfast' && hour >= 6 && hour <= 11) {
    if (meal.protein >= 20) {
      score += 1
      feedback.push("Great protein-rich breakfast timing")
    } else {
      score += 0.5
      feedback.push("Good breakfast timing")
    }
  }
  
  // Lunch timing (11 AM - 3 PM)
  else if (meal.meal_type === 'lunch' && hour >= 11 && hour <= 15) {
    score += 0.5
    feedback.push("Perfect lunch timing")
  }
  
  // Dinner timing (5-9 PM)
  else if (meal.meal_type === 'dinner' && hour >= 17 && hour <= 21) {
    score += 0.5
    feedback.push("Good dinner timing")
  }

  return { score: Math.min(score, 2), feedback }
}

async function generateCoachFeedback(meal: MealData, profile: UserProfile, score: number, criteria: any): Promise<string> {
  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIKey) {
      return getDefaultFeedback(profile.coach_personality, score)
    }

    const personality = getPersonalityPrompt(profile.coach_personality)
    const goalContext = getGoalContext(profile.goal, profile.macro_strategy)

    const prompt = `${personality}

Bewerte diese Mahlzeit für einen Nutzer mit folgenden Zielen:
${goalContext}

Mahlzeit: ${meal.text}
Nährwerte: ${meal.calories} kcal, ${meal.protein}g Protein, ${meal.carbs}g Kohlenhydrate, ${meal.fats}g Fett
Qualitätsscore: ${score}/10

Bewertungskriterien:
- Makro-Balance: ${criteria.macro_balance?.feedback?.join(', ') || 'N/A'}
- Ziel-Ausrichtung: ${criteria.goal_alignment?.feedback?.join(', ') || 'N/A'}
- Nährstoffqualität: ${criteria.nutritional_quality?.feedback?.join(', ') || 'N/A'}

Gib ein kurzes, persönliches Feedback (max 2 Sätze) im gewählten Tonfall.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein personalisierter Ernährungs-Coach. Antworte immer auf Deutsch und bleibe im gewählten Tonfall.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    return data.choices?.[0]?.message?.content || getDefaultFeedback(profile.coach_personality, score)

  } catch (error) {
    console.error('Error generating AI feedback:', error)
    return getDefaultFeedback(profile.coach_personality, score)
  }
}

function getPersonalityPrompt(personality: string): string {
  switch (personality) {
    case 'streng':
      return 'Du bist ein strenger aber fairer Coach. Sei direkt, ehrlich und fordere Verbesserungen. Verwende einen bestimmten, professionellen Ton.'
    
    case 'liebevoll':
      return 'Du bist ein sehr liebevoller, unterstützender Coach. Sei warmherzig, ermutigend und verwende liebevolle Anreden wie "Schatz" oder "mein Lieber/meine Liebe".'
    
    default: // 'moderat'
      return 'Du bist ein ausgewogener Coach. Sei freundlich aber ehrlich, ermutigend aber realistisch. Verwende einen warmen, professionellen Ton.'
  }
}

function getGoalContext(goal: string, macroStrategy: string): string {
  const goalTexts = {
    lose: 'Abnehmen mit Kaloriendefizit',
    gain: 'Zunehmen mit Kalorienüberschuss',
    maintain: 'Gewicht halten mit ausgeglichener Kalorienbilanz'
  }

  const strategyTexts = {
    low_carb: 'Low-Carb Ernährung',
    high_protein: 'High-Protein Ernährung',
    standard: 'Ausgewogene Makroverteilung'
  }

  return `Ziel: ${goalTexts[goal] || goal}
Strategie: ${strategyTexts[macroStrategy] || macroStrategy}`
}

function getDefaultFeedback(personality: string, score: number): string {
  const feedbackTemplates = {
    streng: {
      high: 'Solide Leistung! Das kann sich sehen lassen.',
      medium: 'Geht in Ordnung, aber da ist noch Luft nach oben.',
      low: 'Das können wir besser machen. Mehr Fokus auf die Nährstoffqualität!'
    },
    liebevoll: {
      high: 'Fantastisch, Schatz! Du machst das richtig gut! 💪',
      medium: 'Das war schon ganz gut, meine/r Liebe/r. Du bist auf dem richtigen Weg!',
      low: 'Ach Schatz, das nächste Mal wird bestimmt besser. Ich glaube an dich! 😊'
    },
    moderat: {
      high: 'Sehr gute Wahl! Du bist definitiv auf dem richtigen Weg.',
      medium: 'Das ist schon okay. Ein paar kleine Anpassungen und es wird noch besser.',
      low: 'Da können wir beim nächsten Mal sicher noch etwas optimieren.'
    }
  }

  const level = score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low'
  return feedbackTemplates[personality]?.[level] || feedbackTemplates.moderat[level]
}