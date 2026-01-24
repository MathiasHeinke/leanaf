import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface FocusDataPoint {
  date: string;
  score: number;
}

export function FocusScoreTracker() {
  const [data, setData] = useState<FocusDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFocusData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

        const { data: logs, error } = await supabase
          .from('peptide_intake_log')
          .select('taken_at, notes')
          .eq('user_id', user.id)
          .gte('taken_at', thirtyDaysAgo)
          .like('notes', '%Focus Score:%')
          .order('taken_at', { ascending: true });

        if (error) throw error;

        // Parse focus scores from notes
        const focusData: FocusDataPoint[] = (logs || []).map(log => {
          const match = log.notes?.match(/Focus Score: (\d+)/);
          return {
            date: format(new Date(log.taken_at!), 'dd.MM'),
            score: match ? parseInt(match[1]) : 0,
          };
        }).filter(d => d.score > 0);

        setData(focusData);
      } catch (err) {
        console.error('Error fetching focus data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFocusData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Noch keine Focus-Score-Daten</p>
          <p className="text-xs mt-1">Logge deine erste Nootropic-Einnahme</p>
        </CardContent>
      </Card>
    );
  }

  const avgScore = data.reduce((sum, d) => sum + d.score, 0) / data.length;
  const firstScore = data[0]?.score || 0;
  const lastScore = data[data.length - 1]?.score || 0;
  const trend = lastScore - firstScore;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground';

  // Simple bar chart
  const maxScore = 10;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Focus-Score Verlauf
          </CardTitle>
          <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{avgScore.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Ø Score</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{data.length}</div>
            <div className="text-xs text-muted-foreground">Einträge</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">{lastScore}</div>
            <div className="text-xs text-muted-foreground">Letzter</div>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-1">
          <div className="flex items-end justify-between gap-1 h-24">
            {data.slice(-14).map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-full rounded-t transition-all",
                    point.score >= 7 ? "bg-green-500" :
                    point.score >= 4 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ height: `${(point.score / maxScore) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {data.slice(-14).map((point, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 3 === 0 && point.date}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
