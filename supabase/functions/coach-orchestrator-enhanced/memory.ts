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
        goal_type, target_body_fat_percentage, subscription_status
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
    return (data || []).map(r => r.summary_md).filter(Boolean);
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
