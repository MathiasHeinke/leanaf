import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";

export interface WeeklyTrainingStats {
  rptSessions: number;
  rptGoal: number;
  rptProgress: number;
  zone2Minutes: number;
  zone2Goal: number;
  zone2Progress: number;
  vo2maxSessions: number;
  vo2maxGoal: number;
  vo2maxProgress: number;
  saunaSessions: number;
  saunaGoal: number;
  saunaProgress: number;
  weekStart: Date;
  weekEnd: Date;
}

export function useWeeklyTraining() {
  const [stats, setStats] = useState<WeeklyTrainingStats>({
    rptSessions: 0,
    rptGoal: 3,
    rptProgress: 0,
    zone2Minutes: 0,
    zone2Goal: 150,
    zone2Progress: 0,
    vo2maxSessions: 0,
    vo2maxGoal: 1,
    vo2maxProgress: 0,
    saunaSessions: 0,
    saunaGoal: 4,
    saunaProgress: 0,
    weekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    weekEnd: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      const sessions = data || [];

      // Calculate stats - using correct field name: total_duration_minutes
      const rptSessions = sessions.filter(s => s.training_type === 'rpt').length;
      const zone2Minutes = sessions
        .filter(s => s.training_type === 'zone2')
        .reduce((sum, s) => sum + (s.total_duration_minutes || 0), 0);
      const vo2maxSessions = sessions.filter(s => s.training_type === 'vo2max').length;
      const saunaSessions = sessions.filter(s => s.training_type === 'sauna').length;

      setStats({
        rptSessions,
        rptGoal: 3,
        rptProgress: Math.min(100, Math.round((rptSessions / 3) * 100)),
        zone2Minutes,
        zone2Goal: 150,
        zone2Progress: Math.min(100, Math.round((zone2Minutes / 150) * 100)),
        vo2maxSessions,
        vo2maxGoal: 1,
        vo2maxProgress: Math.min(100, Math.round((vo2maxSessions / 1) * 100)),
        saunaSessions,
        saunaGoal: 4,
        saunaProgress: Math.min(100, Math.round((saunaSessions / 4) * 100)),
        weekStart,
        weekEnd,
      });
    } catch (err) {
      console.error('Error fetching training stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
