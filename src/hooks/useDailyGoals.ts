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
      try {
        const query = loadDailyGoals(user.id);
        const res = await withWatchdog(query, 6000);
        if (ac.signal.aborted) return;
        if (res.error) { 
          console.error('[useDailyGoals] RPC failed, trying profile fallback:', res.error.message);
          
          // Fallback: Try to get profile targets instead of hardcoded values
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('daily_calorie_target, protein_target_g, carbs_target_g, fats_target_g')
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
                fluids: 2500,
                fluid_goal_ml: 2500,
                steps_goal: 10000
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
          setData(res.data ?? null); 
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