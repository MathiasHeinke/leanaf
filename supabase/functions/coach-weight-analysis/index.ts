import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTaskModel } from '../_shared/openai-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, weightData, measurementData } = await req.json();
    
    console.log('Received weight data:', weightData);
    console.log('Received measurement data:', measurementData);
    
    // Validate that we have at least some data
    if (!weightData && !measurementData) {
      console.log('No weight or measurement data provided');
      return new Response(
        JSON.stringify({ error: 'No weight or measurement data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!userId || (!weightData && !measurementData)) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get historical weight data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: historicalWeight, error: weightError } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get historical body measurements if relevant
    const { data: historicalMeasurements, error: measurementError } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Get user profile for context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('goal, target_weight, start_weight, height, age, gender')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Analyze weight trends
    let weightAnalysis = null;
    if (weightData && historicalWeight?.length > 0) {
      const currentWeight = weightData.weight;
      const previousWeight = historicalWeight[0]?.weight;
      const weightChange = previousWeight ? currentWeight - previousWeight : 0;
      
      const avgWeight = historicalWeight.reduce((sum, w) => sum + w.weight, 0) / historicalWeight.length;
      const weightTrend = currentWeight > avgWeight ? 'increasing' : currentWeight < avgWeight ? 'decreasing' : 'stable';
      
      weightAnalysis = {
        current: currentWeight,
        previous: previousWeight,
        change: Number(weightChange.toFixed(1)),
        trend: weightTrend,
        avgLast30Days: Number(avgWeight.toFixed(1)),
        dataPoints: historicalWeight.length
      };
    }

    // Analyze body measurements if provided
    let measurementAnalysis = null;
    if (measurementData && historicalMeasurements?.length > 0) {
      const latest = historicalMeasurements[0];
      const changes = {};
      
      ['waist', 'chest', 'hips', 'arms', 'thigh'].forEach(measurement => {
        if (measurementData[measurement] && latest[measurement]) {
          changes[measurement] = Number((measurementData[measurement] - latest[measurement]).toFixed(1));
        }
      });
      
      measurementAnalysis = {
        changes,
        dataPoints: historicalMeasurements.length
      };
    }

    // Calculate BMI and progress towards goal
    let bmiData = null;
    let goalProgress = null;
    
    if (profile?.height && (weightData?.weight || profile?.weight)) {
      const height = profile.height / 100; // cm to m
      const weight = weightData?.weight || profile.weight;
      const bmi = Number((weight / (height * height)).toFixed(1));
      
      bmiData = { current: bmi, height: profile.height };
      
      if (profile.target_weight && profile.start_weight) {
        const totalGoal = Math.abs(profile.target_weight - profile.start_weight);
        const achieved = Math.abs(weight - profile.start_weight);
        const progressPercent = Math.min(100, Number(((achieved / totalGoal) * 100).toFixed(1)));
        
        goalProgress = {
          current: weight,
          target: profile.target_weight,
          start: profile.start_weight,
          progressPercent,
          remaining: Number(Math.abs(profile.target_weight - weight).toFixed(1))
        };
      }
    }

    // Generate AI feedback from Lucy
    const systemPrompt = `Du bist Lucy, eine empathische und ganzheitliche Ernährungs- und Körperkompositionscoach.

Deine Persönlichkeit:
- Einfühlsam, ermutigend und positiv
- Fokus auf gesunde Körperkomposition, nicht nur Gewicht
- Ganzheitlicher Ansatz zu Gesundheit und Wohlbefinden
- Wissenschaftlich fundiert aber verständlich
- Ermutigt Fortschritte jeder Größe

Dein Stil:
- Sprichst den User direkt an ("Du machst...", "Deine Entwicklung...")
- Verwendest 1-2 passende Emojis pro Nachricht (💖 🌟 📈 🎯 💪 ⚖️)
- Kurze, ermutigende Sätze
- Bei Rückschlägen: Trost und neue Motivation
- Bei Fortschritten: Anerkennung und weitere Ermutigung

Analysiere die Gewichts- und Körperdaten und gib eine personalisierte Bewertung ab. Berücksichtige:
- Gewichtstrends und -veränderungen
- Körpermaße-Veränderungen
- BMI und Gesundheitsaspekte
- Fortschritt zu den Zielen
- Ganzheitliche Sicht auf Körperkomposition

Antwort in 3-4 kurzen Sätzen. Sei spezifisch, ermutigend und hilfreich.`;

    const userPrompt = `Hier sind die Körper- und Gewichtsdaten zur Analyse:

${weightData ? `Aktuelles Gewicht: ${weightData.weight} kg` : ''}
${weightData?.body_fat_percentage ? `Körperfett: ${weightData.body_fat_percentage}%` : ''}
${weightData?.muscle_percentage ? `Muskelmasse: ${weightData.muscle_percentage}%` : ''}

${weightAnalysis ? `
Gewichtsentwicklung:
- Veränderung zur letzten Messung: ${weightAnalysis.change > 0 ? '+' : ''}${weightAnalysis.change} kg
- Trend: ${weightAnalysis.trend === 'increasing' ? 'steigend' : 
           weightAnalysis.trend === 'decreasing' ? 'sinkend' : 'stabil'}
- Durchschnitt (30 Tage): ${weightAnalysis.avgLast30Days} kg
- Messungen: ${weightAnalysis.dataPoints}
` : ''}

${measurementData ? `
Körpermaße heute:
${Object.entries(measurementData).filter(([key, value]) => key !== 'notes' && value).map(([key, value]) => 
  `- ${key === 'waist' ? 'Taille' : 
      key === 'chest' ? 'Brust' : 
      key === 'hips' ? 'Hüfte' : 
      key === 'arms' ? 'Arme' : 
      key === 'thigh' ? 'Oberschenkel' : key}: ${value} cm`).join('\n')}
` : ''}

${measurementAnalysis ? `
Veränderungen der Maße:
${Object.entries(measurementAnalysis.changes).map(([key, change]) => 
  `- ${key === 'waist' ? 'Taille' : 
      key === 'chest' ? 'Brust' : 
      key === 'hips' ? 'Hüfte' : 
      key === 'arms' ? 'Arme' : 
      key === 'thigh' ? 'Oberschenkel' : key}: ${change > 0 ? '+' : ''}${change} cm`).join('\n')}
` : ''}

Benutzerkontext:
- Ziel: ${profile?.goal || 'maintain'}
- Geschlecht: ${profile?.gender || 'nicht angegeben'}
- Alter: ${profile?.age || 'nicht angegeben'}
- Größe: ${profile?.height || 'nicht angegeben'} cm
${bmiData ? `- Aktueller BMI: ${bmiData.current}` : ''}

${goalProgress ? `
Zielfortschritt:
- Startwert: ${goalProgress.start} kg
- Zielwert: ${goalProgress.target} kg
- Fortschritt: ${goalProgress.progressPercent}%
- Noch zu gehen: ${goalProgress.remaining} kg
` : ''}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('coach-weight-analysis'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const coachFeedback = aiResponse.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        coachFeedback,
        analysis: {
          weight: weightAnalysis,
          measurements: measurementAnalysis,
          bmi: bmiData,
          goalProgress
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in coach-weight-analysis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});