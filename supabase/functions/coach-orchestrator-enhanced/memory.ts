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
