import { useEffect, useState, useRef } from "react";
import { loadDailyGoals } from "@/data/queries";
import { withWatchdog } from "@/utils/timeRange";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function useDailyGoals() {
  const [data, setData] = useState<any | null>(null);
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
              setData(todayGoal);
              setError(null);
              return;
            }
          } catch (dgErr) {
            console.error('[useDailyGoals] daily_goals fallback failed:', dgErr);
          }

          // Fallback: Try to get profile targets instead of hardcoded values
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('daily_calorie_target, protein_target_g, carbs_target_g, fats_target_g, fluid_goal_ml, steps_goal')
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (profileData && profileData.daily_calorie_target) {
              const profileFallback = {
                id: null,
                user_id: user.id,
                goal_date: new Date().toISOString().slice(0,10),
                calories: profileData.daily_calorie_target,
                protein: profileData.protein_target_g || 150,
                carbs: profileData.carbs_target_g || 250,
                fats: profileData.fats_target_g || 65,
                fluids: profileData.fluid_goal_ml || 2500,
                fluid_goal_ml: profileData.fluid_goal_ml || 2500,
                steps_goal: profileData.steps_goal || 10000
              };
              console.log('[useDailyGoals] Using profile fallback:', profileFallback);
              setData(profileFallback);
              setError(null);
              return;
            }
          } catch (profileError) {
            console.error('[useDailyGoals] Profile fallback failed:', profileError);
          }
          
          setError(res.error.message); 
          setData(null); 
        } else { 
          console.log('[useDailyGoals] Successfully loaded daily goals:', res.data);
          if (res.data && res.data.goal_date !== todayStr) {
            console.warn('[useDailyGoals] RPC returned stale goal_date. Attempting to fetch today\'s row.', { returnedDate: res.data.goal_date, today: todayStr });
            try {
              const { data: todayGoal } = await supabase
                .from('daily_goals')
                .select('id, user_id, goal_date, calories, protein, carbs, fats, fluids, fluid_goal_ml, steps_goal')
                .eq('user_id', user.id)
                .eq('goal_date', todayStr)
                .maybeSingle();
              if (todayGoal) {
                setData(todayGoal);
              } else {
                setData(res.data ?? null);
              }
            } catch (dgErr) {
              console.error('[useDailyGoals] Fetching today\'s daily_goals failed:', dgErr);
              setData(res.data ?? null);
            }
          } else {
            setData(res.data ?? null);
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