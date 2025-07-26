import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealData {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  text: string;
  meal_type?: string;
}

interface UserProfile {
  goal: string;
  macro_strategy: string;
  coach_personality: string;
  weight: number;
  target_weight: number;
  activity_level: string;
  age: number;
  gender: string;
}

interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meal, profile, dailyGoals } = await req.json();

    if (!meal || !profile || !dailyGoals) {
      return new Response(
        JSON.stringify({ error: 'Missing required data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const evaluation = await evaluateMeal(meal, profile, dailyGoals);

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in evaluate-meal function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function evaluateMeal(meal: MealData, profile: UserProfile, dailyGoals: DailyGoals) {
  // Calculate base quality score (0-10)
  const macroScore = evaluateMacroBalance(meal, profile, dailyGoals);
  const goalScore = evaluateGoalAlignment(meal, profile, dailyGoals);
  const qualityScore = evaluateNutritionalQuality(meal);
  const timingScore = evaluateMealTiming(meal);

  const totalScore = Math.round((macroScore.score + goalScore.score + qualityScore.score + timingScore.score) / 4);
  
  // Calculate bonus points (0-10) - much stricter system
  let bonusPoints = 0;
  if (totalScore >= 9) bonusPoints += 3; // Only excellent meals get high bonus
  if (totalScore >= 8) bonusPoints += 1; // Good meals get small bonus
  if (macroScore.score >= 9) bonusPoints += 1;
  if (qualityScore.score >= 9) bonusPoints += 2;

  // Generate AI feedback
  const aiFeedback = await generateCoachFeedback(meal, profile, totalScore, {
    macro: macroScore,
    goal: goalScore,
    quality: qualityScore,
    timing: timingScore
  });

  return {
    quality_score: Math.max(0, Math.min(10, totalScore)),
    bonus_points: Math.max(0, Math.min(10, bonusPoints)),
    ai_feedback: aiFeedback,
    evaluation_criteria: {
      macro_balance: macroScore,
      goal_alignment: goalScore,
      nutritional_quality: qualityScore,
      meal_timing: timingScore
    }
  };
}

function evaluateMacroBalance(meal: MealData, profile: UserProfile, dailyGoals: DailyGoals) {
  const proteinRatio = meal.protein / (dailyGoals.protein / 4); // Assuming 4 meals per day
  const carbRatio = meal.carbs / (dailyGoals.carbs / 4);
  const fatRatio = meal.fats / (dailyGoals.fats / 4);

  let score = 10;
  let feedback = "Perfekte Makro-Balance!";

  // Evaluate based on macro strategy
  if (profile.macro_strategy === 'high_protein') {
    if (proteinRatio < 0.8) {
      score -= 3;
      feedback = "Mehr Protein wäre optimal für deine High-Protein Strategie.";
    }
  } else if (profile.macro_strategy === 'low_carb') {
    if (carbRatio > 1.2) {
      score -= 3;
      feedback = "Weniger Kohlenhydrate für deine Low-Carb Strategie.";
    }
  }

  // General balance check
  if (Math.abs(proteinRatio - 1) > 0.5 || Math.abs(carbRatio - 1) > 0.5 || Math.abs(fatRatio - 1) > 0.5) {
    score -= 2;
    if (feedback === "Perfekte Makro-Balance!") {
      feedback = "Die Makro-Verteilung könnte ausgewogener sein.";
    }
  }

  return {
    score: Math.max(0, score),
    feedback,
    ratios: { protein: proteinRatio, carbs: carbRatio, fats: fatRatio }
  };
}

function evaluateGoalAlignment(meal: MealData, profile: UserProfile, dailyGoals: DailyGoals) {
  const calorieRatio = meal.calories / (dailyGoals.calories / 4);
  let score = 10;
  let feedback = "Perfekt für dein Ziel!";

  if (profile.goal === 'lose') {
    if (calorieRatio > 1.3) {
      score -= 4;
      feedback = "Zu kalorienreich für dein Abnehm-Ziel.";
    } else if (calorieRatio > 1.1) {
      score -= 2;
      feedback = "Etwas weniger Kalorien wären ideal zum Abnehmen.";
    }
  } else if (profile.goal === 'gain') {
    if (calorieRatio < 0.8) {
      score -= 3;
      feedback = "Mehr Kalorien needed für den Muskelaufbau!";
    }
  } else if (profile.goal === 'maintain') {
    if (Math.abs(calorieRatio - 1) > 0.2) {
      score -= 2;
      feedback = "Für Gewicht halten sind die Kalorien nicht optimal.";
    }
  }

  return { score: Math.max(0, score), feedback };
}

function evaluateNutritionalQuality(meal: MealData) {
  let score = 3; // Much lower base score - neutral starting point
  let feedback = "Durchschnittliche Nährstoffqualität.";

  const text = meal.text.toLowerCase();
  
  // Positive indicators - expanded list
  const healthyKeywords = [
    'gemüse', 'obst', 'vollkorn', 'nüsse', 'fisch', 'hähnchen', 'quinoa', 'hafer',
    'salat', 'brokkoli', 'spinat', 'tomate', 'gurke', 'paprika', 'avocado',
    'lachs', 'thunfisch', 'ei', 'joghurt', 'quark', 'hülsenfrüchte', 'linsen'
  ];
  
  // Massively expanded unhealthy keywords - especially German desserts
  const processedKeywords = [
    'fast', 'fertig', 'chips', 'süß', 'schokolade', 'limonade', 'pizza',
    'käsekuchen', 'kuchen', 'torte', 'sahne', 'creme', 'dessert', 'nachspeise',
    'süßigkeiten', 'bonbon', 'gummibärchen', 'eis', 'eiscreme', 'zucker',
    'nutella', 'marmelade', 'honig', 'sirup', 'keks', 'gebäck', 'muffin',
    'donut', 'croissant', 'burger', 'pommes', 'würstchen', 'wurst', 'speck',
    'cola', 'energy', 'softdrink', 'alkohol', 'bier', 'wein', 'schnaps'
  ];

  // Special dessert keywords for extra harsh penalty
  const dessertKeywords = [
    'käsekuchen', 'kuchen', 'torte', 'sahnetorte', 'schwarzwälder', 'tiramisu',
    'mousse', 'pudding', 'creme', 'dessert', 'nachspeise', 'eis', 'eiscreme'
  ];

  const healthyCount = healthyKeywords.filter(keyword => text.includes(keyword)).length;
  const processedCount = processedKeywords.filter(keyword => text.includes(keyword)).length;
  const dessertCount = dessertKeywords.filter(keyword => text.includes(keyword)).length;

  // Calculate calorie density penalty (kcal per 100g)
  const caloriesPerGram = meal.calories / 100; // Rough estimation
  if (caloriesPerGram > 2.5) { // Very calorie dense (like cheesecake ~270kcal/100g)
    score -= 2;
  }

  score += healthyCount * 2; // Bigger bonus for healthy foods
  score -= processedCount * 3; // Stronger penalty for processed foods
  score -= dessertCount * 4; // Massive penalty for obvious desserts

  // Feedback based on content
  if (dessertCount > 0) {
    feedback = "Das ist ein Dessert - gönn dir das mal, aber achte auf die Balance!";
  } else if (healthyCount >= 3) {
    feedback = "Ausgezeichnete Nährstoffqualität!";
  } else if (healthyCount >= 1) {
    feedback = "Gute Nährstoffauswahl!";
  } else if (processedCount >= 2) {
    feedback = "Versuche mehr natürliche Lebensmittel zu wählen.";
  } else if (processedCount >= 1) {
    feedback = "Verarbeitete Lebensmittel sparsam verwenden.";
  }

  return { score: Math.max(0, Math.min(10, score)), feedback };
}

function evaluateMealTiming(meal: MealData) {
  const now = new Date();
  const hour = now.getHours();
  let score = 8; // Default good score
  let feedback = "Gutes Timing!";

  if (meal.meal_type === 'breakfast' && (hour < 6 || hour > 11)) {
    score -= 2;
    feedback = "Ungewöhnliche Zeit für Frühstück.";
  } else if (meal.meal_type === 'lunch' && (hour < 11 || hour > 15)) {
    score -= 2;
    feedback = "Ungewöhnliche Zeit für Mittagessen.";
  } else if (meal.meal_type === 'dinner' && (hour < 17 || hour > 21)) {
    score -= 2;
    feedback = "Ungewöhnliche Zeit für Abendessen.";
  }

  return { score: Math.max(0, score), feedback };
}

async function generateCoachFeedback(meal: MealData, profile: UserProfile, score: number, criteria: any): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    return getDefaultFeedback(profile.coach_personality, score);
  }

  try {
    const personalityPrompt = getPersonalityPrompt(profile.coach_personality);
    const goalContext = getGoalContext(profile.goal, profile.macro_strategy);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: `${personalityPrompt} ${goalContext} Sei ehrlich bei der Bewertung - Desserts sind Desserts, auch wenn sie mal okay sind. Gib kurzes, prägnantes Feedback (max 2 Sätze) zur Mahlzeit. Bei niedrigen Scores sei konstruktiv kritisch, aber nicht demotivierend. Verwende deutsche Sprache.`
          },
          { 
            role: 'user', 
            content: `Bewerte diese Mahlzeit: ${meal.text}. Score: ${score}/10. Kriterien: Makros ${criteria.macro.score}/10, Ziel ${criteria.goal.score}/10, Qualität ${criteria.quality.score}/10, Timing ${criteria.timing.score}/10. ${criteria.quality.score <= 3 ? 'Das ist offensichtlich ein Dessert/ungesunde Mahlzeit.' : ''}`
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content || getDefaultFeedback(profile.coach_personality, score);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return getDefaultFeedback(profile.coach_personality, score);
  }
}

function getPersonalityPrompt(personality: string): string {
  switch (personality) {
    case 'streng':
      return "Du bist Sascha - direkt und ehrlich, aber sprich wie ein echter Mensch. Zeig Interesse und stell ruhig Nachfragen wenn du mehr verstehen willst.";
    case 'liebevoll':
      return "Du bist Lucy - warmherzig und unterstützend. Sprich natürlich und freundlich, als würdest du mit einem guten Freund sprechen.";
    default:
      return "Du bist Kai - motivierend und energisch. Sprich wie ein Kumpel, der sich wirklich für die Person interessiert und gerne nachfragt.";
  }
}

function getGoalContext(goal: string, macroStrategy: string): string {
  const goalText = goal === 'lose' ? 'Abnehmen' : goal === 'gain' ? 'Zunehmen/Muskelaufbau' : 'Gewicht halten';
  const strategyText = macroStrategy === 'high_protein' ? 'High-Protein' : macroStrategy === 'low_carb' ? 'Low-Carb' : 'Standard';
  return `User-Ziel: ${goalText}, Strategie: ${strategyText}.`;
}

function getDefaultFeedback(personality: string, score: number): string {
  if (score >= 8) {
    return personality === 'streng' ? "Solide Wahl! Weiter so." : 
           personality === 'liebevoll' ? "Fantastisch! Du machst das großartig! 💪" : 
           "Excellente Mahlzeit! Perfekt für deine Ziele.";
  } else if (score >= 6) {
    return personality === 'streng' ? "Geht so. Da ist noch Luft nach oben." : 
           personality === 'liebevoll' ? "Gut gemacht! Kleine Anpassungen und es wird perfekt! 😊" : 
           "Gute Wahl! Mit kleinen Optimierungen wird's noch besser.";
  } else if (score >= 4) {
    return personality === 'streng' ? "Das ist nicht optimal. Mehr Nährstoffe, weniger Verarbeitung!" : 
           personality === 'liebevoll' ? "Gönn dir das mal! Aber lass uns beim nächsten Mal was Gesünderes wählen! 🌱" : 
           "Hier ist noch Verbesserungspotential. Du schaffst das!";
  } else {
    return personality === 'streng' ? "Das ist ein Dessert, oder? Fokus auf echte Nährstoffe!" : 
           personality === 'liebevoll' ? "Lecker, aber das ist eindeutig ein Dessert! Nächstes Mal was Nährstoffreicheres? 🍰" : 
           "Das war ein Treat! Lass uns beim nächsten Mal auf die Nährstoffe achten.";
  }
}