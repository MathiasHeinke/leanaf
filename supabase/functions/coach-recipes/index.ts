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

    console.log('Fetching user profile and data for:', user.id);

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

    // Calculate current nutrition averages
    const totalMeals = recentMeals?.length || 0;
    const avgCalories = totalMeals > 0 ? (recentMeals?.reduce((sum, meal) => sum + Number(meal.calories || 0), 0) || 0) / totalMeals : 0;
    const avgProtein = totalMeals > 0 ? (recentMeals?.reduce((sum, meal) => sum + Number(meal.protein || 0), 0) || 0) / totalMeals : 0;

    const systemPrompt = `Du bist ein erfahrener Ernährungscoach und Kochexperte. Erstelle personalisierte Rezeptempfehlungen basierend auf den Benutzerdaten.

Benutzerdaten:
- Tagesziele: ${userContext.goals.calories} kcal, ${userContext.goals.protein}g Protein, ${userContext.goals.carbs}g Carbs, ${userContext.goals.fats}g Fette
- Durchschnitt letzte 7 Tage: ${Math.round(avgCalories)} kcal, ${Math.round(avgProtein)}g Protein
- Geschlecht: ${profile?.gender || 'nicht angegeben'}
- Ziel: ${profile?.goal || 'nicht angegeben'}
- Aktivitätslevel: ${profile?.activity_level || 'nicht angegeben'}
- Coach-Persönlichkeit: ${profile?.coach_personality || 'motivierend'}
- Muskelerhalt-Priorität: ${profile?.muscle_maintenance_priority ? 'Ja' : 'Nein'}
- Makro-Strategie: ${profile?.macro_strategy || 'standard'}

Erstelle 3 personalisierte Rezeptempfehlungen im folgenden JSON-Format:

{
  "meals": [
    {
      "name": "Rezeptname",
      "description": "Kurze Beschreibung (1 Satz) im ${profile?.coach_personality || 'motivierend'}en Stil",
      "calories": Kalorien,
      "protein": Protein in g,
      "carbs": Kohlenhydrate in g,
      "fats": Fette in g,
      "ingredients": ["Zutat 1", "Zutat 2", "Zutat 3"],
      "preparation": "Kurze Zubereitungsanleitung (2-3 Sätze) im ${profile?.coach_personality || 'motivierend'}en Stil",
      "mealType": "Frühstück|Mittagessen|Abendessen|Snack"
    }
  ]
}

Berücksichtige:
- Die Rezepte sollen zu den Zielen des Benutzers passen
- Abwechslungsreiche Mahlzeitentypen
- Realistische Portionsgrößen
- Einfache Zubereitung
- Deutsche Küche und verfügbare Zutaten
- Coach-Persönlichkeit: ${profile?.coach_personality || 'motivierend'} (Beschreibungen und Anleitungen in diesem Stil)
${profile?.muscle_maintenance_priority ? '- WICHTIG: Höhere Protein-Priorität für Muskelerhalt (min. 1.8g/kg Körpergewicht)' : ''}
- Makro-Strategie: ${profile?.macro_strategy || 'standard'} beachten`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Erstelle 3 personalisierte Rezeptempfehlungen für mich.' }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendations = data.choices[0].message.content;

    console.log('Generated recommendations successfully');

    return new Response(JSON.stringify({ 
      recommendations,
      userContext: {
        profile: profile || {},
        goals: userContext.goals,
        avgCalories: Math.round(avgCalories),
        avgProtein: Math.round(avgProtein),
        totalMeals
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in coach-recipes function:', error);
    return new Response(JSON.stringify({ 
      error: 'Fehler bei der Erstellung der Empfehlungen',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});