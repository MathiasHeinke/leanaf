
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log('🍳 Coach Recipes - Generating recommendations with GPT-4.1 for user:', user.id);

    // Check if user has active subscription
    let userTier = 'free';
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('subscribed, subscription_tier')
      .eq('user_id', user.id)
      .single();
      
    if (subscriber?.subscribed) {
      userTier = 'pro';
    }
    
    // For free users, check usage limits
    if (userTier === 'free') {
      const { data: usageResult } = await supabase.rpc('check_ai_usage_limit', {
        p_user_id: user.id,
        p_feature_type: 'coach_recipes'
      });
      
      if (!usageResult?.can_use) {
        console.log('⛔ [COACH-RECIPES] Usage limit exceeded for user:', user.id);
        return new Response(JSON.stringify({ 
          error: 'Tägliches Limit für Coach-Rezepte erreicht. Upgrade zu Pro für unbegrenzte Nutzung.',
          code: 'USAGE_LIMIT_EXCEEDED',
          daily_remaining: usageResult?.daily_remaining || 0,
          monthly_remaining: usageResult?.monthly_remaining || 0
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    // Get daily goals
    const { data: goals, error: goalsError } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (goalsError) {
      console.error('Goals error:', goalsError);
    }

    // Get recent meals (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentMeals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (mealsError) {
      console.error('Meals error:', mealsError);
    }

    // Get weight history
    const { data: weightHistory, error: weightError } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(10);

    if (weightError) {
      console.error('Weight error:', weightError);
    }

    // Prepare context for AI
    const userContext = {
      profile: profile || {},
      goals: goals || { calories: 2000, protein: 150, carbs: 250, fats: 65 },
      recentMeals: recentMeals || [],
      weightHistory: weightHistory || []
    };

    // Calculate current nutrition averages and patterns
    const totalMeals = recentMeals?.length || 0;
    const avgCalories = totalMeals > 0 ? (recentMeals?.reduce((sum, meal) => sum + Number(meal.calories || 0), 0) || 0) / totalMeals : 0;
    const avgProtein = totalMeals > 0 ? (recentMeals?.reduce((sum, meal) => sum + Number(meal.protein || 0), 0) || 0) / totalMeals : 0;
    const avgCarbs = totalMeals > 0 ? (recentMeals?.reduce((sum, meal) => sum + Number(meal.carbs || 0), 0) || 0) / totalMeals : 0;
    const avgFats = totalMeals > 0 ? (recentMeals?.reduce((sum, meal) => sum + Number(meal.fats || 0), 0) || 0) / totalMeals : 0;

    // Analyze meal patterns for better recommendations
    const mealTypes = recentMeals?.reduce((acc: any, meal) => {
      const type = meal.meal_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}) || {};

    const personalityStyle = profile?.coach_personality || 'motivierend';
    const muscleMaintenancePriority = profile?.muscle_maintenance_priority || false;
    const macroStrategy = profile?.macro_strategy || 'standard';

    const getPersonalityStyle = (personality: string) => {
      switch (personality) {
        case 'streng':
          return 'Sascha - direkt und ehrlich, aber menschlich und interessiert';
        case 'liebevoll':
          return 'Lucy - warmherzig und unterstützend, spricht wie eine gute Freundin';
        default:
          return 'Kai - energisch und motivierend, spricht wie ein begeisterter Kumpel';
      }
    };

    const systemPrompt = `Du bist ${getPersonalityStyle(personalityStyle)}. Du hilfst bei Rezeptempfehlungen, aber sprich dabei ganz natürlich und menschlich - als würdest du einem Freund helfen, der nach Kochideen fragt.

Erstelle 3 praktische Rezeptempfehlungen, aber bleib dabei in deiner natürlichen Art. Du musst nicht übermäßig technical werden, außer der User fragt explizit nach detaillierten Analysen.

USER-INFO (nutze das was relevant ist, aber übertreib nicht):
- Ziel: ${userContext.goals.calories} kcal, ${userContext.goals.protein}g Protein
- Aktuelle Durchschnitte: ${Math.round(avgCalories)} kcal, ${Math.round(avgProtein)}g Protein  
- Hauptziel: ${profile?.goal || 'nicht angegeben'}
- Muskelerhalt wichtig: ${muscleMaintenancePriority ? 'Ja, mehr Protein wäre gut' : 'Normal'}

EINFACH 3 GUTE REZEPTE VORSCHLAGEN:
Die sollen zu den Zielen passen und lecker sein. Berücksichtige was der User letzte Woche so gegessen hat für Abwechslung.

Antworte als JSON, aber sprich dabei natürlich in deiner Art:

{
  "meals": [
    {
      "name": "Einfacher, leckerer Name",
      "description": "Sprich natürlich - warum ist das gut? Was gefällt dir daran?",
      "calories": Realistische_Kalorien,
      "protein": Protein_in_g,
      "carbs": Kohlenhydrate_in_g,
      "fats": Fette_in_g,
      "ingredients": ["Zutat 1 mit Menge", "etc"],
      "preparation": "Normale Erklärung, als würdest du es einem Freund erklären",
      "mealType": "Frühstück|Mittagessen|Abendessen|Snack",
      "cookingTime": "Zeit in Minuten",
      "difficulty": "einfach|mittel|fortgeschritten",
      "specialFeature": "Warum passt das gut?"
    }
  ],
  "personalizedTip": "Ein persönlicher Tipp in deiner natürlichen Art",
  "nutritionFocus": "Was du gerade wichtig findest"
}

Mach es einfach, praktisch und lecker. ${muscleMaintenancePriority ? 'Der User will Muskeln erhalten, also gerne mehr Protein.' : ''}`;

    console.log('🤖 Sending advanced recipe request to GPT-4.1...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Hey! Ich hätte gerne 3 gute Rezeptideen, die zu mir passen. Was würdest du mir empfehlen?' }
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices[0].message.content;

    console.log('✅ Advanced recipe recommendations generated successfully');

    return new Response(JSON.stringify({ 
      recommendations,
      userContext: {
        profile: profile || {},
        goals: userContext.goals,
        avgCalories: Math.round(avgCalories),
        avgProtein: Math.round(avgProtein),
        avgCarbs: Math.round(avgCarbs),
        avgFats: Math.round(avgFats),
        totalMeals,
        mealPatterns: mealTypes,
        personalityStyle,
        muscleMaintenancePriority,
        macroStrategy
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in coach-recipes function:', error);
    return new Response(JSON.stringify({ 
      error: 'Fehler bei der Erstellung der Rezept-Empfehlungen',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
