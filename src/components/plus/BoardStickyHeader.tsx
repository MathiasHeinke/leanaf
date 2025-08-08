import React, { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface UserPoints {
  current_level: number;
  level_name: string;
  total_points: number;
}

export const BoardStickyHeader: React.FC = () => {
  const [points, setPoints] = React.useState<UserPoints | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("user_points")
        .select("current_level, level_name, total_points")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setPoints(data as any);
    };
    load();
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/40">
      <div className="container mx-auto px-4 max-w-5xl h-12 flex items-center justify-between">
        <h1 className="text-base md:text-lg font-semibold">Momentum‑Board</h1>
        <div className="flex items-center gap-2">
          <Badge>
            Level {points?.current_level ?? 1} {points?.level_name ?? "Rookie"}
          </Badge>
          <Badge variant="secondary">{points?.total_points?.toLocaleString() ?? "0"} Punkte</Badge>
          <Badge variant="outline">🔥 Tagesmission</Badge>
        </div>
      </div>
    </header>
  );
};

export default BoardStickyHeader;
