import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

export interface DailyCompliance {
  date: string;
  displayDate: string;
  dayName: string;
  rate: number;
  taken: number;
  total: number;
}

export interface SupplementRanking {
  id: string;
  name: string;
  compliance: number;
  daysCount: number;
  totalDays: number;
}

export interface SupplementAnalyticsData {
  dailyCompliance: DailyCompliance[];
  supplementRanking: SupplementRanking[];
  stats: {
    averageCompliance: number;
    bestStreak: number;
    mostConsistent: string;
    totalSupplements: number;
  };
  loading: boolean;
}

export function useSupplementAnalytics(period: 7 | 30 = 7): SupplementAnalyticsData {
  const { user } = useAuth();
  const [data, setData] = useState<SupplementAnalyticsData>({
    dailyCompliance: [],
    supplementRanking: [],
    stats: {
      averageCompliance: 0,
      bestStreak: 0,
      mostConsistent: "-",
      totalSupplements: 0,
    },
    loading: true,
  });

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, period - 1);
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      // Fetch all user supplements (active ones)
      const { data: userSupplements } = await supabase
        .from("user_supplements")
        .select(`
          id,
          name,
          custom_name,
          supplement_database(name)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (!userSupplements || userSupplements.length === 0) {
        setData({
          dailyCompliance: [],
          supplementRanking: [],
          stats: {
            averageCompliance: 0,
            bestStreak: 0,
            mostConsistent: "-",
            totalSupplements: 0,
          },
          loading: false,
        });
        return;
      }

      // Fetch intake logs for the period
      const { data: intakeLogs } = await supabase
        .from("supplement_intake_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDateStr)
        .lte("date", endDateStr);

      // Generate all dates in the range
      const allDates = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Calculate daily compliance
      const dailyCompliance: DailyCompliance[] = allDates.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayLogs = intakeLogs?.filter((log) => log.date === dateStr) || [];
        const takenCount = dayLogs.filter((log) => log.taken).length;
        const totalCount = userSupplements.length;
        const rate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

        return {
          date: dateStr,
          displayDate: format(date, "dd.MM", { locale: de }),
          dayName: format(date, "EE", { locale: de }),
          rate,
          taken: takenCount,
          total: totalCount,
        };
      });

      // Calculate supplement ranking
      const supplementRanking: SupplementRanking[] = userSupplements.map((supp) => {
        const suppLogs = intakeLogs?.filter(
          (log) => log.user_supplement_id === supp.id && log.taken
        ) || [];
        const daysCount = suppLogs.length;
        const totalDays = period;
        const compliance = Math.round((daysCount / totalDays) * 100);

        // Get the display name
        const dbName = (supp.supplement_database as any)?.name;
        const displayName = supp.custom_name || supp.name || dbName || "Unbekannt";

        return {
          id: supp.id,
          name: displayName,
          compliance,
          daysCount,
          totalDays,
        };
      }).sort((a, b) => b.compliance - a.compliance);

      // Calculate stats
      const avgCompliance = dailyCompliance.length > 0
        ? Math.round(
            dailyCompliance.reduce((sum, day) => sum + day.rate, 0) / dailyCompliance.length
          )
        : 0;

      // Calculate best streak
      let currentStreak = 0;
      let bestStreak = 0;
      for (const day of dailyCompliance) {
        if (day.rate >= 80) {
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      const mostConsistent = supplementRanking.length > 0 ? supplementRanking[0].name : "-";

      setData({
        dailyCompliance,
        supplementRanking: supplementRanking.slice(0, 5), // Top 5
        stats: {
          averageCompliance: avgCompliance,
          bestStreak,
          mostConsistent,
          totalSupplements: userSupplements.length,
        },
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching supplement analytics:", error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, [user?.id, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return data;
}
