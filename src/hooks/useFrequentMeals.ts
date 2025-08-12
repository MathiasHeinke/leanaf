import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Daypart = "morning" | "noon" | "evening" | "night";

export type FrequentMeals = Partial<Record<Daypart, string[]>>;

function getDaypartFromHour(h: number): Daypart {
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 22) return "evening";
  return "night";
}

export function useFrequentMeals(userId?: string, lookbackDays = 45) {
  const [data, setData] = useState<FrequentMeals>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const since = new Date();
        since.setDate(since.getDate() - lookbackDays);

        const { data: meals, error } = await supabase
          .from("meals")
          .select("id,title,name,text,created_at")
          .eq("user_id", userId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) {
          console.warn("useFrequentMeals: error fetching meals", error);
          if (!isCancelled) setData({});
          return;
        }

        const counts: Record<Daypart, Record<string, number>> = {
          morning: {},
          noon: {},
          evening: {},
          night: {},
        };

        (meals || []).forEach((m: any) => {
          const title = (m.text || m.title || m.name || "Meal").trim();
          const hour = new Date(m.created_at).getHours();
          const part = getDaypartFromHour(hour);
          counts[part][title] = (counts[part][title] || 0) + 1;
        });

        const top3 = (map: Record<string, number>) =>
          Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([t]) => t);

        const result: FrequentMeals = {
          morning: top3(counts.morning),
          noon: top3(counts.noon),
          evening: top3(counts.evening),
          night: top3(counts.night),
        };

        if (!isCancelled) setData(result);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [userId, lookbackDays]);

  return { frequent: data, loading } as const;
}
