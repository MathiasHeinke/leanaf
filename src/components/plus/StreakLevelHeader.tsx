import React, { useEffect } from 'react';
import { CardContent } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface UserPoints {
  current_level: number;
  level_name: string;
  total_points: number;
}

export const StreakLevelHeader: React.FC = () => {
  const [points, setPoints] = React.useState<UserPoints | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from('user_points')
        .select('current_level, level_name, total_points')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setPoints(data as any);
    };
    load();
  }, []);

  return (
    <PlusCard>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <div className="text-sm text-muted-foreground">Dashboard</div>
          <div className="text-2xl font-semibold">Streak & Rewards</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge>Level {points?.current_level ?? 1} {points?.level_name ?? 'Rookie'}</Badge>
          <Badge variant="secondary">{points?.total_points?.toLocaleString() ?? '0'} Punkte</Badge>
          <Badge variant="outline">🔥 Tagesmission aktiv</Badge>
        </div>
      </CardContent>
    </PlusCard>
  );
};
