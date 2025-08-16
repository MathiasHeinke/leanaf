import { supabase } from "@/integrations/supabase/client";
import { todayRange } from "@/utils/timeRange";

const sb = supabase as any;
export async function loadTodaysFluids(userId: string) {
  const { start, end } = todayRange();
  return sb
    .from("user_fluids")
    .select("*")
    .eq("user_id", userId)
    .gte("intake_time", start)
    .lte("intake_time", end)
    .order("created_at", { ascending: false });
}

export async function loadTodaysWorkout(userId: string) {
  const { start, end } = todayRange();
  return sb
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", start)
    .lte("start_time", end)
    .maybeSingle();
}

export async function loadDailyGoals(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  
  // First try to get existing goals for today
  const { data: existingGoals, error } = await sb
    .from("daily_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_date", today)
    .maybeSingle();
  
  // If no goals exist for today, create default ones
  if (!existingGoals && !error) {
    const { data: createdGoals } = await sb.rpc('ensure_daily_goals', {
      user_id_param: userId
    });
    
    if (createdGoals) {
      return { data: createdGoals, error: null };
    }
  }
  
  return { data: existingGoals, error };
}

export async function loadTodaysMeals(userId: string) {
  const { start, end } = todayRange();
  return sb
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gte("eaten_at", start)
    .lte("eaten_at", end)
    .order("ts", { ascending: false });
}