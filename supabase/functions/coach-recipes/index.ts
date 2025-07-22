
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

    const systemPrompt = `Du bist ein erfahrener Ernährungscoach und kreativer Kochexperte mit tiefem Verständnis für personalisierte Ernährung. Erstelle innovative, maßgeschneiderte Rezeptempfehlungen basierend auf detaillierten Benutzerdaten und Ernährungsmustern.

BENUTZERPROFIL & ZIELE:
- Tagesziele: ${userContext.goals.calories} kcal, ${userContext.goals.protein}g Protein, ${userContext.goals.carbs}g Carbs, ${userContext.goals.fats}g Fette
- Aktuelle Durchschnitte (7 Tage): ${Math.round(avgCalories)} kcal, ${Math.round(avgProtein)}g Protein, ${Math.round(avgCarbs)}g Carbs, ${Math.round(avgFats)}g Fette
- Geschlecht: ${profile?.gender || 'nicht angegeben'}
- Hauptziel: ${profile?.goal || 'nicht angegeben'}
- Aktivitätslevel: ${profile?.activity_level || 'nicht angegeben'}
- Coach-Persönlichkeit: ${personalityStyle}
- Muskelerhalt-Priorität: ${muscleMaintenancePriority ? 'HOCH - Fokus auf Protein-optimierte Rezepte' : 'Standard'}
- Makro-Strategie: ${macroStrategy}

ERNÄHRUNGSMUSTER ANALYSE:
- Gesamte Mahlzeiten (7 Tage): ${totalMeals}
- Häufigste Mahlzeitentypen: ${JSON.stringify(mealTypes)}
- Gewichtsentwicklung: ${weightHistory?.length > 0 ? 'Verfügbar für Trendanalyse' : 'Keine Daten'}

AUFTRAG:
Erstelle 3 innovative, personalisierte Rezeptempfehlungen die perfekt zu den Zielen, Präferenzen und Ernährungsmustern passen. Berücksichtige Abwechslung zu den letzten Mahlzeiten und optimiere für die spezifischen Ziele.

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:

{
  "meals": [
    {
      "name": "Kreativer, ansprechender Rezeptname",
      "description": "Motivierende Beschreibung (2-3 Sätze) im ${personalityStyle}en Stil - erkläre warum dieses Rezept perfekt zu den Zielen passt",
      "calories": Exakte Kalorien,
      "protein": Protein in g,
      "carbs": Kohlenhydrate in g,
      "fats": Fette in g,
      "ingredients": ["Zutat 1 mit Menge", "Zutat 2 mit Menge", "Zutat 3 mit Menge", "etc"],
      "preparation": "Detaillierte, aber prägnante Zubereitungsanleitung (3-4 Schritte) im ${personalityStyle}en Stil",
      "mealType": "Frühstück|Mittagessen|Abendessen|Snack",
      "cookingTime": "Zubereitungszeit in Minuten",
      "difficulty": "einfach|mittel|fortgeschritten",
      "specialFeature": "Warum dieses Rezept besonders gut zu den aktuellen Zielen passt"
    }
  ],
  "personalizedTip": "Persönlicher Tipp basierend auf den Ernährungsmustern (${personalityStyle}er Stil)",
  "nutritionFocus": "Aktueller Ernährungsfokus basierend auf der Analyse"
}

WICHTIGE ANFORDERUNGEN:
- Rezepte sollen zu den spezifischen Makro-Zielen passen
- Berücksichtige die letzten Mahlzeiten für Abwechslung
- Deutsche Küche mit verfügbaren Zutaten
- ${personalityStyle}er Coaching-Stil in allen Texten
${muscleMaintenancePriority ? '- KRITISCH: Mindestens 2 der 3 Rezepte sollen protein-reich sein (min. 25g Protein)' : ''}
- Realistische Portionsgrößen und Zubereitungszeiten
- Makro-Strategie "${macroStrategy}" optimal umsetzen
- Kreative aber praktische Rezepte`;

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
          { role: 'user', content: 'Erstelle 3 personalisierte, innovative Rezeptempfehlungen die perfekt zu meinem Profil und meinen aktuellen Ernährungsmustern passen.' }
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
