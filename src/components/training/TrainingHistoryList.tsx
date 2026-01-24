import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Heart, Zap, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import type { Json } from "@/integrations/supabase/types";

interface TrainingSession {
  id: string;
  session_date: string;
  training_type: string;
  total_duration_minutes: number | null;
  session_data: Json | null;
}

const TYPE_INFO: Record<string, { label: string; icon: typeof Dumbbell; colorClass: string }> = {
  'rpt': { label: 'Kraft', icon: Dumbbell, colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  'zone2': { label: 'Zone 2', icon: Heart, colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  'vo2max': { label: 'VO2max', icon: Zap, colorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

export function TrainingHistoryList() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fourteenDaysAgo = format(subDays(new Date(), 14), 'yyyy-MM-dd');

        const { data, error } = await supabase
          .from('training_sessions')
          .select('id, session_date, training_type, total_duration_minutes, session_data')
          .eq('user_id', user.id)
          .gte('session_date', fourteenDaysAgo)
          .order('session_date', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error('Error fetching training history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Historie (14 Tage)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Noch keine Training-Sessions</p>
            <p className="text-sm">Starte mit deinem ersten Training!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Historie (14 Tage)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => {
            const info = TYPE_INFO[session.training_type] || TYPE_INFO['rpt'];
            const Icon = info.icon;
            const sessionData = session.session_data as Record<string, unknown> | null;
            const vo2maxProtocol = sessionData?.protocol as string | undefined;

            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-background">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(session.session_date), 'EEEE, dd. MMM', { locale: de })}
                    </p>
                    <Badge variant="secondary" className={info.colorClass}>
                      {info.label}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {session.training_type === 'zone2' && session.total_duration_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{session.total_duration_minutes} min</span>
                    </div>
                  )}
                  {session.training_type === 'vo2max' && vo2maxProtocol && (
                    <Badge variant="outline">{vo2maxProtocol}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
