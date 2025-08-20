import { useEffect, useState, useRef } from "react";
import { loadDailyGoals } from "@/data/queries";
import { withWatchdog } from "@/utils/timeRange";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { extractGoalsFromProfile, type ARESGoalContext } from "@/ares/adapters/goals";

export function useDailyGoals() {
  const [data, setData] = useState<ARESGoalContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const acRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController(); 
    acRef.current = ac;

    (async () => {
      setLoading(true); 
      setError(null);
      const todayStr = new Date().toISOString().slice(0,10);
      try {
        const query = loadDailyGoals(user.id);
        const res = await withWatchdog(query, 6000);
        if (ac.signal.aborted) return;
        if (res.error) { 
          console.error('[useDailyGoals] RPC failed, trying profile fallback:', res.error.message);
          
          // Fallback order: 1) today's daily_goals row 2) profile targets
          try {
            const { data: todayGoal } = await supabase
              .from('daily_goals')
              .select('id, user_id, goal_date, calories, protein, carbs, fats, fluids, fluid_goal_ml, steps_goal')
              .eq('user_id', user.id)
              .eq('goal_date', todayStr)
              .maybeSingle();
            if (todayGoal) {
              console.log('[useDailyGoals] Using daily_goals fallback for today:', todayGoal);
              // Convert to ARES format
              const goals: ARESGoalContext = {
                calories: todayGoal.calories || 2000,
                protein: todayGoal.protein || 150,
                carbs: todayGoal.carbs || 250,
                fats: todayGoal.fats || 65,
                hydration: todayGoal.fluid_goal_ml || 2500,
                steps: todayGoal.steps_goal || 10000
              };
              setData(goals);
              setError(null);
              return;
            }
          } catch (dgErr) {
            console.error('[useDailyGoals] daily_goals fallback failed:', dgErr);
          }

          // Fallback: Use ARES adapter to extract goals from profile
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            
            const goals = extractGoalsFromProfile(profileData);
            console.log('[useDailyGoals] Using ARES goals adapter:', goals);
            setData(goals);
            setError(null);
            return;
          } catch (profileError) {
            console.error('[useDailyGoals] Profile fallback failed:', profileError);
          }
          
          setError(res.error.message); 
          setData(null); 
        } else { 
          console.log('[useDailyGoals] Successfully loaded daily goals:', res.data);
          // Convert legacy goals to ARES format using adapter
          if (res.data) {
            const goals = extractGoalsFromProfile(res.data);
            setData(goals);
          } else {
            setData(null);
          }
        }
      } catch (e: any) {
        if (!ac.signal.aborted) { 
          console.error('[useDailyGoals] Exception:', e);
          setError(e.message || String(e)); 
          setData(null); 
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [user?.id]);

  return { data, error, loading };
}