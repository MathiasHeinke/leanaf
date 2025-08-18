import { supabase } from "@/integrations/supabase/client";
import { todayRange } from "@/utils/timeRange";

const sb = supabase as any;
export async function loadTodaysFluids(userId: string) {
  const { start, end } = todayRange();
  return sb
    .from("user_fluids")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start.split('T')[0])
    .lte("date", end.split('T')[0])
    .order("created_at", { ascending: false });
}

export async function loadTodaysWorkout(userId: string) {
  const { start, end } = todayRange();
  return sb
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("date", start.split('T')[0])
    .maybeSingle();
}

export async function loadDailyGoals(userId: string) {
  try {
    // Always try ensure_daily_goals first - creates if missing, returns if exists
    const { data: goals, error: rpcError } = await sb.rpc('ensure_daily_goals', {
      user_id_param: userId
    });
    
    if (goals && !rpcError) {
      if (import.meta.env.DEV) {
        console.log('[loadDailyGoals] ✅ RPC success:', goals);
      }
      return { data: goals, error: null };
    }
    
    console.warn('[loadDailyGoals] RPC failed, fallback to defaults:', rpcError);
    
    // Fallback: return sensible defaults if RPC fails
    const fallbackGoals = {
      id: null,
      user_id: userId,
      goal_date: new Date().toISOString().slice(0,10),
      calories: 2000,
      protein: 150,
      carbs: 250,
      fats: 65,
      fluids: 2000,
      fluid_goal_ml: 2000,
      steps_goal: 10000
    };
    
    return { data: fallbackGoals, error: null };
  } catch (e) {
    console.error('[loadDailyGoals] Exception:', e);
    return { data: null, error: e };
  }
}

export async function loadTodaysMeals(userId: string) {
  const { start, end } = todayRange();
  return sb
    .from("meals")
    .select(`
      *,
      meal_images:meal_images!meal_images_meal_id_fkey(id, url, thumbnail_url)
    `)
    .eq("user_id", userId)
    .gte("eaten_at", start)
    .lte("eaten_at", end)
    .order("ts", { ascending: false });
}