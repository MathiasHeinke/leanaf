import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface UserPoints {
  current_level: number;
  level_name: string;
  total_points: number;
}

export const BoardStickyHeader: React.FC = () => {
  const [points, setPoints] = useState<UserPoints | null>(null);

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
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-xl font-semibold">Momentum-Board</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">🔥 Tagesmission</Badge>
            <Badge variant="secondary" className="text-xs">🏅 Level {points?.current_level ?? 1}</Badge>
            <Badge className="text-xs">{points?.total_points?.toLocaleString() ?? '0'} Punkte</Badge>
          </div>
        </div>
      </div>
    </header>
  );
};