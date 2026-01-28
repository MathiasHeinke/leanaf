export async function loadRollingSummary(supabase: any, userId: string, coachId: string) {
  try {
    const { data, error } = await supabase
      .from('coach_conversation_memory')
      .select('rolling_summary')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .maybeSingle();
    if (error) return '';
    return data?.rolling_summary || '';
  } catch (_e) {
    return '';
  }
}

export async function loadUserProfile(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        age, gender, height, weight, target_weight, goal, activity_level, macro_strategy, 
        display_name, email, preferred_name, first_name, last_name,
        start_weight, start_bmi, current_bmi, target_bmi, target_date,
        muscle_maintenance_priority, medical_screening_completed, medical_risk_level,
        goal_type, target_body_fat_percentage, subscription_status,
        daily_calorie_target, calorie_deficit, bmr, tdee,
        protein_target_g, carbs_target_g, fats_target_g,
        protein_percentage, carbs_percentage, fats_percentage,
        weekly_weight_loss_target, nutrition_calculation_date
      `)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return {};
    return data || {};
  } catch (_e) {
    return {};
  }
}

export async function loadRecentDailySummaries(supabase: any, userId: string, limit = 7) {
  try {
    const { data, error } = await supabase
      .from('daily_summaries')
      .select('summary_md')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []).map((r: { summary_md: string }) => r.summary_md).filter(Boolean);
  } catch (_e) {
    return [];
  }
}

export async function loadCoachAnalytics7d(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_coach_analytics_7d', { 
      p_user_id: userId 
    });
    if (error) {
      console.warn('Failed to load 7d analytics:', error);
      return {};
    }
    return data || {};
  } catch (_e) {
    console.warn('Error loading 7d analytics:', _e);
    return {};
  }
}

// Phase 2: Enhanced context loading for ARES mood integration
export async function loadUserMoodDataForCoaching(supabase: any, userId: string) {
  try {
    console.log('[MEMORY] Loading enhanced mood data for user:', userId);
    
    // Get recent journal entries with mood and energy
    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('mood_score, energy_level, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Get cycle assessment data for female users
    const { data: cycleData } = await supabase
      .from('cycle_assessments')
      .select('current_phase, energy_level, mood_assessment, symptoms, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2);
    
    // Get recent workout consistency
    const { data: workoutConsistency } = await supabase
      .from('workouts')
      .select('date, did_workout, workout_type, notes')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    // Get nutrition quality indicators
    const { data: nutritionQuality } = await supabase
      .from('daily_summaries')
      .select('date, total_calories, macro_distribution, sleep_score, hydration_score')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7);
    
    return {
      mood_history: journalEntries || [],
      cycle_context: cycleData || [],
      workout_consistency: workoutConsistency || [],
      nutrition_quality: nutritionQuality || [],
      loaded_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('[MEMORY] Error loading mood data:', error);
    return {
      mood_history: [],
      cycle_context: [],
      workout_consistency: [],
      nutrition_quality: [],
      loaded_at: new Date().toISOString()
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELEFANTENGEDÄCHTNIS 2.0: Rolling Summary Generator
// Compresses older conversations into a concise summary using Gemini Flash
// ═══════════════════════════════════════════════════════════════════════════════

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

/**
 * Generates a rolling summary of older conversations using Gemini Flash
 * This is triggered when rawMessageCount > 40 and no summary exists
 * 
 * @param supaClient - Supabase client with service role
 * @param userId - User ID
 * @param coachId - Coach personality ID (e.g., 'ares')
 * @param oldMessages - Array of older message pairs to summarize
 */
export async function generateRollingSummary(
  supaClient: any,
  userId: string,
  coachId: string,
  oldMessages: { message: string; response: string }[]
): Promise<void> {
  // Minimum threshold for meaningful summary
  if (!oldMessages || oldMessages.length < 10) {
    console.log('[MEMORY-SUMMARY] Not enough messages for summary:', oldMessages?.length || 0);
    return;
  }
  
  if (!LOVABLE_API_KEY) {
    console.warn('[MEMORY-SUMMARY] LOVABLE_API_KEY not configured, skipping summary generation');
    return;
  }
  
  console.log(`[MEMORY-SUMMARY] Generating summary from ${oldMessages.length} message pairs`);
  
  // Format conversation for LLM (take max 20 pairs to avoid token overflow)
  const messagesToSummarize = oldMessages.slice(0, 20);
  const conversation = messagesToSummarize
    .map(p => `User: ${p.message}\nARES: ${p.response}`)
    .join('\n\n');
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview-05-20',
        messages: [
          {
            role: 'system',
            content: `Du bist ein präziser Zusammenfasser für Coaching-Gespräche.
Erstelle eine kompakte Zusammenfassung die folgendes enthält:
- Hauptthemen die besprochen wurden
- Wichtige Entscheidungen oder Vereinbarungen
- User-Ziele und Fortschritte
- Besondere Umstände (z.B. Medikamente, Beschwerden, Pläne)

Maximal 150 Wörter, auf Deutsch. Schreibe in der dritten Person ("Der User...").
Fokussiere auf Fakten die für zukünftige Gespräche relevant sind.`
          },
          {
            role: 'user',
            content: `Fasse dieses Coaching-Gespräch zusammen:\n\n${conversation}`
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MEMORY-SUMMARY] API error:', response.status, errorText);
      return;
    }
    
    const data = await response.json();
    const summaryText = data.choices?.[0]?.message?.content || '';
    
    if (!summaryText || summaryText.length < 50) {
      console.warn('[MEMORY-SUMMARY] Summary too short or empty, skipping save');
      return;
    }
    
    console.log(`[MEMORY-SUMMARY] Generated summary: ${summaryText.length} chars`);
    
    // Upsert to coach_conversation_memory
    const { error: upsertError } = await supaClient
      .from('coach_conversation_memory')
      .upsert({
        user_id: userId,
        coach_id: coachId,
        rolling_summary: summaryText,
        last_updated: new Date().toISOString()
      }, { 
        onConflict: 'user_id,coach_id' 
      });
    
    if (upsertError) {
      console.error('[MEMORY-SUMMARY] Failed to save summary:', upsertError.message);
    } else {
      console.log('[MEMORY-SUMMARY] Summary saved successfully');
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error('[MEMORY-SUMMARY] Exception:', error.message);
    } else {
      console.error('[MEMORY-SUMMARY] Unknown error:', error);
    }
  }
}
