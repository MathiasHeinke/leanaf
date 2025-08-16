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
  return sb
    .from("daily_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_date", today)
    .maybeSingle();
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