import { supabase } from "@/integrations/supabase/client";

export async function loadTodaysFluids(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  return supabase
    .from("user_fluids")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("created_at", { ascending: false });
}

export async function loadTodaysWorkout(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  return supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
}

export async function loadDailyGoals(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  return supabase
    .from("daily_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_date", today)
    .maybeSingle();
}

export async function loadTodaysMeals(userId: string) {
  const today = new Date().toISOString().slice(0,10);
  return supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .order("ts", { ascending: false });
}