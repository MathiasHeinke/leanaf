import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { entryText, photoUrl, userId, entryId } = await req.json();

    if (!entryText || !userId) {
      throw new Error('Missing required fields: entryText and userId');
    }

    console.log('Starting advanced journal analysis for user:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AI Text Analysis
    const textAnalysis = await analyzeJournalText(entryText);
    
    // Photo Analysis (if photo provided)
    let photoAnalysis = null;
    if (photoUrl) {
      photoAnalysis = await analyzeJournalPhoto(photoUrl);
      
      // Save photo analysis to database
      const { error: photoError } = await supabase
        .from('journal_photo_analyses')
        .insert({
          journal_entry_id: entryId,
          photo_url: photoUrl,
          scene_description: photoAnalysis.scene_description,
          detected_objects: photoAnalysis.detected_objects,
          mood_analysis: photoAnalysis.mood_analysis,
          color_palette: photoAnalysis.color_palette,
          memory_tags: photoAnalysis.memory_tags,
          ai_interpretation: photoAnalysis.ai_interpretation,
          confidence_score: photoAnalysis.confidence_score
        });

      if (photoError) {
        console.error('Error saving photo analysis:', photoError);
      }
    }

    // Calculate Wellness Score (0-100)
    const wellnessScore = calculateWellnessScore(textAnalysis, photoAnalysis);

    // Update journal entry with AI analysis
    const { error: updateError } = await supabase
      .from('journal_entries')
      .update({
        ai_analysis_metadata: {
          text_analysis: textAnalysis,
          photo_analysis: photoAnalysis,
          analysis_timestamp: new Date().toISOString(),
          version: '1.0'
        },
        emotional_scores: textAnalysis.emotional_scores,
        wellness_score: wellnessScore
      })
      .eq('id', entryId);

    if (updateError) {
      throw new Error(`Failed to update journal entry: ${updateError.message}`);
    }

    // Update or create daily summary
    await updateDailySummary(supabase, userId, new Date());

    const result = {
      success: true,
      analysis: {
        text_analysis: textAnalysis,
        photo_analysis: photoAnalysis,
        wellness_score: wellnessScore,
        insights: generateInsights(textAnalysis, photoAnalysis)
      }
    };

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in advanced-journal-analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeJournalText(text: string) {
  const analysisPrompt = `
Analysiere den folgenden Tagebucheintrag und extrahiere strukturierte Informationen:

Text: "${text}"

Analysiere und gib zurück (als JSON):
1. emotional_scores: Bewerte jede Emotion von 0-100
   - joy (Freude)
   - stress (Stress) 
   - gratitude (Dankbarkeit)
   - energy (Energie)
   - calmness (Ruhe)
   - fulfillment (Erfüllung)

2. key_themes: Array der Hauptthemen (z.B. ["work", "relationships", "health", "dreams", "growth"])

3. sentiment_trend: "very_positive" | "positive" | "neutral" | "negative" | "very_negative"

4. life_areas: Bewerte Bereiche von 0-100
   - career (Beruf)
   - relationships (Beziehungen) 
   - health (Gesundheit)
   - personal_growth (Persönliche Entwicklung)
   - spirituality (Spiritualität)

5. transformation_indicators: Array von Entwicklungshinweisen
6. goal_progress: Erkannte Fortschritte oder Herausforderungen
7. summary: Kurze Zusammenfassung der wichtigsten Punkte

Antworte nur mit validen JSON.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein empathischer KI-Analyst für persönliche Reflexion und Entwicklung. Antworte nur mit validen JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', analysisText);
      // Fallback basic analysis
      return {
        emotional_scores: { joy: 50, stress: 30, gratitude: 40, energy: 50, calmness: 50, fulfillment: 50 },
        key_themes: ["reflection"],
        sentiment_trend: "neutral",
        life_areas: { career: 50, relationships: 50, health: 50, personal_growth: 50, spirituality: 50 },
        transformation_indicators: [],
        goal_progress: "Keine spezifischen Fortschritte erkannt",
        summary: text.substring(0, 200) + "..."
      };
    }
  } catch (error) {
    console.error('Error in text analysis:', error);
    throw new Error('Failed to analyze journal text');
  }
}

async function analyzeJournalPhoto(photoUrl: string) {
  const photoPrompt = `
Analysiere dieses Foto für ein persönliches Tagebuch und gib strukturierte Informationen zurück:

1. scene_description: Beschreibung der Szene (2-3 Sätze)
2. detected_objects: Array der erkannten Objekte/Elemente
3. mood_analysis: Stimmungsanalyse basierend auf visuellen Hinweisen
   - mood_indicators: Array von Stimmungsindikatoren
   - overall_mood: "very_positive" | "positive" | "neutral" | "melancholic" | "energetic"
   - emotional_tone: Beschreibung der emotionalen Atmosphäre
4. color_palette: Dominante Farben und ihre Wirkung
5. memory_tags: Tags für Erinnerungsverknüpfung (Ort, Aktivität, Menschen, etc.)
6. ai_interpretation: Interpretation der Bedeutung für persönliche Entwicklung
7. confidence_score: Vertrauenswert der Analyse (0-1)

Antworte nur mit validen JSON.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Du bist ein KI-Analyst für visuelle Inhalte in persönlichen Tagebüchern. Analysiere Fotos empathisch und unterstützend.' 
          },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: photoPrompt },
              { type: 'image_url', image_url: { url: photoUrl } }
            ]
          }
        ],
        temperature: 0.3
      }),
    });

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    try {
      return JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse photo analysis JSON:', analysisText);
      return {
        scene_description: "Foto wurde hochgeladen und ist verfügbar für die Erinnerung.",
        detected_objects: ["image"],
        mood_analysis: {
          mood_indicators: ["visual_content"],
          overall_mood: "neutral",
          emotional_tone: "Visueller Inhalt geteilt"
        },
        color_palette: { dominant_colors: ["various"] },
        memory_tags: ["photo", "memory"],
        ai_interpretation: "Ein visueller Beitrag zur Tagebucherinnerung.",
        confidence_score: 0.5
      };
    }
  } catch (error) {
    console.error('Error in photo analysis:', error);
    return null;
  }
}

function calculateWellnessScore(textAnalysis: any, photoAnalysis: any): number {
  try {
    const emotional = textAnalysis.emotional_scores || {};
    
    // Base wellness score from emotions (weighted)
    const positiveEmotions = (emotional.joy || 0) * 0.3 + 
                           (emotional.gratitude || 0) * 0.2 + 
                           (emotional.energy || 0) * 0.2 +
                           (emotional.calmness || 0) * 0.15 +
                           (emotional.fulfillment || 0) * 0.15;
    
    const negativeImpact = (emotional.stress || 0) * 0.3;
    
    let score = Math.max(0, positiveEmotions - negativeImpact);
    
    // Boost from photo positivity
    if (photoAnalysis?.mood_analysis) {
      const photoMood = photoAnalysis.mood_analysis.overall_mood;
      if (photoMood === 'very_positive') score += 10;
      else if (photoMood === 'positive' || photoMood === 'energetic') score += 5;
    }
    
    // Sentiment adjustment
    const sentiment = textAnalysis.sentiment_trend;
    if (sentiment === 'very_positive') score += 15;
    else if (sentiment === 'positive') score += 8;
    else if (sentiment === 'negative') score -= 10;
    else if (sentiment === 'very_negative') score -= 20;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  } catch (error) {
    console.error('Error calculating wellness score:', error);
    return 50; // Default neutral score
  }
}

function generateInsights(textAnalysis: any, photoAnalysis: any): string[] {
  const insights = [];
  
  try {
    // Emotional insights
    const emotions = textAnalysis.emotional_scores || {};
    if (emotions.gratitude > 70) {
      insights.push("🙏 Deine Dankbarkeit strahlt heute besonders stark - das ist ein kraftvoller Zustand für persönliches Wachstum.");
    }
    if (emotions.stress > 60) {
      insights.push("😓 Ich erkenne erhöhten Stress. Achte heute besonders auf Selbstfürsorge und Entspannung.");
    }
    if (emotions.energy > 80) {
      insights.push("⚡ Deine Energie ist heute hoch - eine perfekte Zeit für wichtige Projekte oder neue Schritte.");
    }
    
    // Theme insights
    const themes = textAnalysis.key_themes || [];
    if (themes.includes('growth') || themes.includes('transformation')) {
      insights.push("🌱 Du befindest dich in einer Phase des Wachstums - vertraue dem Prozess der Veränderung.");
    }
    
    // Photo insights
    if (photoAnalysis?.mood_analysis?.overall_mood === 'very_positive') {
      insights.push("📸 Dein Foto strahlt positive Energie aus - diese visuellen Erinnerungen verstärken dein Wohlbefinden.");
    }
    
    if (insights.length === 0) {
      insights.push("✨ Jeder Moment der Reflexion ist wertvoll für deine persönliche Entwicklung.");
    }
    
    return insights.slice(0, 3); // Max 3 insights
  } catch (error) {
    console.error('Error generating insights:', error);
    return ["✨ Danke für deine Reflexion - jeder Eintrag trägt zu deinem Wachstum bei."];
  }
}

async function updateDailySummary(supabase: any, userId: string, date: Date) {
  try {
    const dateStr = date.toISOString().split('T')[0];
    
    // Get today's entries for summary calculation
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('wellness_score, emotional_scores, ai_analysis_metadata')
      .eq('user_id', userId)
      .gte('created_at', `${dateStr}T00:00:00Z`)
      .lt('created_at', `${dateStr}T23:59:59Z`);

    if (entriesError) {
      console.error('Error fetching entries for daily summary:', entriesError);
      return;
    }

    if (!entries || entries.length === 0) return;

    // Calculate summary metrics
    const totalEntries = entries.length;
    const avgWellnessScore = entries
      .filter(e => e.wellness_score)
      .reduce((sum, e) => sum + e.wellness_score, 0) / Math.max(1, entries.filter(e => e.wellness_score).length);

    // Aggregate emotions
    const dominantEmotions = {};
    entries.forEach(entry => {
      if (entry.emotional_scores) {
        Object.entries(entry.emotional_scores).forEach(([emotion, score]: [string, any]) => {
          dominantEmotions[emotion] = (dominantEmotions[emotion] || 0) + score;
        });
      }
    });

    // Average emotions
    Object.keys(dominantEmotions).forEach(emotion => {
      dominantEmotions[emotion] = Math.round(dominantEmotions[emotion] / totalEntries);
    });

    // Extract key themes
    const allThemes = entries.flatMap(e => 
      e.ai_analysis_metadata?.text_analysis?.key_themes || []
    );
    const keyThemes = [...new Set(allThemes)];

    // Upsert daily summary
    const { error: summaryError } = await supabase
      .from('journal_daily_summaries')
      .upsert({
        user_id: userId,
        date: dateStr,
        total_entries: totalEntries,
        avg_wellness_score: Math.round(avgWellnessScore),
        dominant_emotions: dominantEmotions,
        key_themes: keyThemes,
        ai_summary: `Tag mit ${totalEntries} Reflex${totalEntries === 1 ? 'ion' : 'ionen'}. Durchschnittlicher Wellness-Score: ${Math.round(avgWellnessScore)}/100.`
      }, {
        onConflict: 'user_id,date'
      });

    if (summaryError) {
      console.error('Error updating daily summary:', summaryError);
    } else {
      console.log('Daily summary updated successfully');
    }
  } catch (error) {
    console.error('Error in updateDailySummary:', error);
  }
}