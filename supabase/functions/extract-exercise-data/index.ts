import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getTaskModel } from '../_shared/openai-config.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============= EXERCISE EXTRACTION FUNCTIONS =============

// Extract exercise data from user text
const extractExerciseFromText = (text: string) => {
  const lowerText = text.toLowerCase();
  
  console.log('🔍 Analyzing text for exercise data:', text.substring(0, 100));
  
  // Check for exercise-related keywords
  const exerciseKeywords = [
    'übung', 'training', 'deadlift', 'kreuzheben', 'squat', 'kniebeuge', 
    'bench', 'bankdrücken', 'press', 'drücken', 'row', 'rudern', 
    'pull', 'klimmzug', 'push', 'liegestütz', 'curl', 'bizeps',
    'kg', 'rpe', 'satz', 'sätze', 'wiederholung', 'wdh', 'rep', 'reps',
    'x', '×', 'mal', 'hinzufüg', 'add', 'log'
  ];
  
  const hasExerciseKeywords = exerciseKeywords.some(keyword => lowerText.includes(keyword));
  
  if (!hasExerciseKeywords) {
    console.log('❌ No exercise keywords found');
    return null;
  }
  
  // Enhanced exercise name extraction patterns
  const exercisePatterns = [
    /(?:deadlift|kreuzheben|deadlifts)/gi,
    /(?:squat|kniebeuge|squats)/gi,
    /(?:bench\s*press|bankdrücken)/gi,
    /(?:overhead\s*press|schulterdrücken|military\s*press)/gi,
    /(?:barbell\s*row|langhantel\s*rudern|rudern)/gi,
    /(?:pull\s*up|klimmzug|klimmzüge)/gi,
    /(?:push\s*up|liegestütz|liegestütze)/gi,
    /(?:bicep\s*curl|bizeps\s*curl|curl)/gi,
    /(?:dip|dips)/gi,
    /(?:lat\s*pulldown|latzug)/gi,
    /(?:leg\s*press|beinpresse)/gi,
    /(?:leg\s*curl|beincurl)/gi,
    /(?:calf\s*raise|wadenheben)/gi
  ];
  
  let exerciseName = '';
  for (const pattern of exercisePatterns) {
    const match = text.match(pattern);
    if (match) {
      exerciseName = match[0];
      console.log('💪 Found exercise:', exerciseName);
      break;
    }
  }
  
  if (!exerciseName) {
    console.log('❌ No specific exercise found');
    return null;
  }
  
  const sets = [];
  
  // Enhanced German text parsing for "10x 90kg rpe 7 und 5x 110kg rpe 9"
  const germanSetPattern = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*kg(?:\s*rpe\s*(\d+))?/gi;
  
  // Split by "und" to handle multiple sets
  const setParts = text.split(/\s+und\s+/gi);
  
  for (const part of setParts) {
    let match;
    while ((match = germanSetPattern.exec(part)) !== null) {
      const reps = parseInt(match[1]);
      const weight = parseFloat(match[2]);
      const rpe = match[3] ? parseInt(match[3]) : null;
      
      if (reps && weight && reps < 100 && weight < 1000) { // Sanity check
        sets.push({ reps, weight, rpe });
        console.log('📝 Added set:', { reps, weight, rpe });
      }
    }
  }
  // Fallback patterns if the German parsing didn't catch everything
  const fallbackPatterns = [
    /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*kg(?:\s*rpe\s*(\d+))?/gi,
    /(\d+(?:\.\d+)?)\s*kg\s*[x×]\s*(\d+)(?:\s*rpe\s*(\d+))?/gi
  ];
  
  if (sets.length === 0) {
    for (const pattern of fallbackPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let reps, weight, rpe;
        
        if (match[0].includes('kg') && match[0].indexOf('kg') < match[0].indexOf('x')) {
          weight = parseFloat(match[1]);
          reps = parseInt(match[2]);
          rpe = match[3] ? parseInt(match[3]) : null;
        } else {
          reps = parseInt(match[1]);
          weight = parseFloat(match[2]);
          rpe = match[3] ? parseInt(match[3]) : null;
        }
        
        if (reps > 0 && weight > 0 && reps < 100 && weight < 1000) {
          sets.push({ reps, weight, rpe });
          console.log('📝 Added fallback set:', { reps, weight, rpe });
        }
      }
    }
  }
  
  if (sets.length === 0) {
    console.log('❌ No valid sets found');
    return null;
  }
  
  const result = {
    exerciseName: normalizeExerciseName(exerciseName),
    sets,
    originalText: text
  };
  
  console.log('✅ Exercise extraction successful:', result);
  return result;
};

// Normalize exercise names to match database entries
const normalizeExerciseName = (exerciseName: string) => {
  const exerciseMap: { [key: string]: string } = {
    'deadlift': 'Deadlift',
    'kreuzheben': 'Deadlift',
    'squat': 'Squat',
    'kniebeuge': 'Squat',
    'bench press': 'Bench Press',
    'bankdrücken': 'Bench Press',
    'overhead press': 'Overhead Press',
    'schulterdrücken': 'Overhead Press',
    'row': 'Barbell Row',
    'rudern': 'Barbell Row',
    'pull up': 'Pull-up',
    'klimmzug': 'Pull-up',
    'push up': 'Push-up',
    'liegestütz': 'Push-up',
    'curl': 'Bicep Curl',
    'bizeps': 'Bicep Curl',
    'dip': 'Dip',
    'dips': 'Dip',
    'lat pulldown': 'Lat Pulldown',
    'latzug': 'Lat Pulldown'
  };
  
  const normalized = exerciseMap[exerciseName.toLowerCase().trim()] || exerciseName;
  return normalized;
};

// Save exercise data to database
const saveExerciseData = async (supabase: any, userId: string, exerciseData: any) => {
  try {
    console.log('💪 Attempting to save exercise data:', {
      exercise: exerciseData.exerciseName,
      setsCount: exerciseData.sets.length,
      userId: userId.substring(0, 8) + '...'
    });
    
    // 1. Create exercise session first
    const today = new Date().toISOString().split('T')[0];
    console.log('📝 Creating exercise session for date:', today);
    
    const { data: session, error: sessionError } = await supabase
      .from('exercise_sessions')
      .insert({
        user_id: userId,
        date: today,
        session_name: `${exerciseData.exerciseName} Session`,
        workout_type: 'strength',
        notes: `Automatisch hinzugefügt: ${exerciseData.originalText}`,
        overall_rpe: exerciseData.sets.filter((s: any) => s.rpe).length > 0 
          ? Math.round(exerciseData.sets.filter((s: any) => s.rpe).reduce((sum: number, set: any) => sum + set.rpe, 0) / exerciseData.sets.filter((s: any) => s.rpe).length)
          : null
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('❌ Error creating exercise session:', sessionError);
      return { success: false, error: sessionError.message };
    }
    
    console.log('✅ Exercise session created with ID:', session.id);
    
    // 2. Find or create the exercise
    let { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('*')
      .eq('name', exerciseData.exerciseName)
      .single();
    
    if (exerciseError && exerciseError.code === 'PGRST116') {
      // Exercise doesn't exist, create it
      console.log('🆕 Creating new exercise:', exerciseData.exerciseName);
      const { data: newExercise, error: createError } = await supabase
        .from('exercises')
        .insert({
          name: exerciseData.exerciseName,
          category: 'Strength',
          muscle_groups: ['Full Body'],
          is_public: true,
          created_by: userId
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating exercise:', createError);
        return { success: false, error: createError.message };
      }
      
      exercise = newExercise;
      console.log('✅ Exercise created with ID:', exercise.id);
    } else if (exerciseError) {
      console.error('❌ Error finding exercise:', exerciseError);
      return { success: false, error: exerciseError.message };
    } else {
      console.log('✅ Exercise found:', exercise.name);
    }
    
    // 3. Create individual sets with proper foreign keys
    const setsData = exerciseData.sets.map((set: any, index: number) => ({
      session_id: session.id,
      user_id: userId,
      exercise_id: exercise.id,
      set_number: index + 1,
      reps: set.reps,
      weight_kg: set.weight,
      rpe: set.rpe
    }));
    
    console.log('📝 Creating sets:', setsData.length, 'sets for exercise:', exercise.name);
    
    const { error: setsError } = await supabase
      .from('exercise_sets')
      .insert(setsData);
    
    if (setsError) {
      console.error('❌ Error creating exercise sets:', setsError);
      return { success: false, error: setsError.message };
    }
    
    console.log('✅ All exercise data saved successfully!');
    return { success: true, data: { session, exercise, sets: setsData } };
    
  } catch (error) {
    console.error('❌ Fatal error in saveExerciseData:', error);
    return { success: false, error: error.message };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Exercise data extraction request received at:', new Date().toISOString());

    const { userId, mediaUrls, userMessage } = await req.json();
    console.log('Request data:', { userId: userId?.substring(0, 8) + '...', mediaCount: mediaUrls?.length, hasMessage: !!userMessage });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // First try text extraction if userMessage is provided
    if (userMessage) {
      console.log('🔍 Checking text for exercise data...');
      const textExtractionResult = extractExerciseFromText(userMessage);
      
      if (textExtractionResult) {
        console.log('💪 Exercise found in text, returning for preview...');
        
        return new Response(JSON.stringify({
          success: true,
          source: 'text',
          saved: false,
          exerciseData: {
            exercise_name: textExtractionResult.exerciseName,
            sets: textExtractionResult.sets,
            overall_rpe: textExtractionResult.sets.filter((s: any) => s.rpe).length > 0 
              ? Math.round(textExtractionResult.sets.filter((s: any) => s.rpe).reduce((sum: number, set: any) => sum + set.rpe, 0) / textExtractionResult.sets.filter((s: any) => s.rpe).length)
              : null,
            confidence: 0.95
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('❌ No exercise data found in text using regex, trying GPT-4.1...');
        
        // Try GPT-4.1 for text extraction
        try {
          const textExtractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: getTaskModel('extract-exercise-data'),
              messages: [
                {
                  role: "system",
                  content: `You are an expert exercise data extraction system. Extract exercise data from German text and return ONLY valid JSON in this exact format:
{
  "exercise_name": "string",
  "sets": [
    {
      "reps": number,
      "weight": number,
      "rpe": number
    }
  ],
  "confidence": number
}

Examples:
- "Füge deadlift Übung hinzu 10x 90kg rpe 7 und 5x 110kg rpe 9" should extract:
  {"exercise_name": "Deadlift", "sets": [{"reps": 10, "weight": 90, "rpe": 7}, {"reps": 5, "weight": 110, "rpe": 9}], "confidence": 0.95}

CRITICAL: Return ONLY the JSON, no additional text or explanations.`
                },
                {
                  role: "user",
                  content: userMessage
                }
              ],
              max_tokens: 300,
              temperature: 0.1
            }),
          });

          if (textExtractionResponse.ok) {
            const gptData = await textExtractionResponse.json();
            const gptResponse = gptData.choices[0].message.content;
            
            console.log('GPT-4.1 text extraction response:', gptResponse);
            
            try {
              const gptExtractedData = JSON.parse(gptResponse);
              
              if (gptExtractedData.exercise_name && gptExtractedData.sets && Array.isArray(gptExtractedData.sets)) {
                console.log('💪 GPT-4.1 extracted exercise data, returning for preview...');
                
                return new Response(JSON.stringify({
                  success: true,
                  source: 'gpt-4.1-text',
                  saved: false,
                  exerciseData: {
                    exercise_name: gptExtractedData.exercise_name,
                    sets: gptExtractedData.sets,
                    confidence: gptExtractedData.confidence || 0.9
                  }
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            } catch (parseError) {
              console.error('Failed to parse GPT-4.1 text extraction response:', parseError);
            }
          }
        } catch (gptError) {
          console.error('Error with GPT-4.1 text extraction:', gptError);
        }
      }
    }

    // If no text extraction or mediaUrls provided, try vision API
    if (!mediaUrls || mediaUrls.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No exercise data found in text and no media URLs provided',
        exerciseData: null
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${mediaUrls.length} media items for exercise data extraction`);

    // Prepare messages for OpenAI Vision API
    const messages = [
      {
        role: "system",
        content: `You are an expert exercise data extraction system. Your ONLY job is to analyze workout images/videos and extract structured exercise data in JSON format.

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "exercise_name": "string",
  "sets": [
    {
      "reps": number,
      "weight": number,
      "rpe": number
    }
  ],
  "confidence": number
}

RULES:
- exercise_name: German exercise name (e.g., "Deadlift", "Squat")
- sets: Array of sets with reps, weight in kg, and estimated RPE
- confidence: 0-1 how confident you are in extraction
- If bodyweight exercise, use weight: 0
- If weight unclear, estimate based on visible equipment
- NO additional text, explanations, or markdown - ONLY JSON`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userMessage || "Extract exercise data from this workout image/video"
          },
          ...mediaUrls.map((url: string) => ({
            type: "image_url",
            image_url: {
              url: url,
              detail: "high"
            }
          }))
        ]
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getTaskModel('extract-exercise-data'),
        messages,
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0].message.content;

    console.log('Raw OpenAI response:', rawResponse);

    // Parse JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback: extract JSON from mixed response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    // Validate extracted data structure
    if (!extractedData.exercise_name || !extractedData.sets || !Array.isArray(extractedData.sets)) {
      throw new Error('Invalid exercise data structure');
    }

    console.log('💪 Vision analysis found exercise data, returning for preview...');
    
    return new Response(JSON.stringify({
      success: true,
      source: 'gpt-vision',
      saved: false,
      exerciseData: {
        exercise_name: extractedData.exercise_name,
        sets: extractedData.sets,
        overall_rpe: extractedData.overall_rpe,
        confidence: extractedData.confidence || 0.8
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-exercise-data function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      exerciseData: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});