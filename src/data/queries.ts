import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;
export async function loadTodaysFluids(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  return sb
    .from("user_fluids")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: false });
}

export async function loadTodaysWorkout(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  return sb
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
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
  const today = new Date().toISOString().slice(0,10);
  return sb
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("ts", { ascending: false });
}