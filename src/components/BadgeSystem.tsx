import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Target, Zap, Calendar, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
  metadata: any;
}

export const BadgeSystem = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBadges();
    }
  }, [user]);

  const loadBadges = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'measurement_consistency':
        return <Target className="h-5 w-5" />;
      case 'workout_streak':
        return <Zap className="h-5 w-5" />;
      case 'deficit_consistency':
        return <Star className="h-5 w-5" />;
      case 'first_measurement':
        return <Medal className="h-5 w-5" />;
      case 'weekly_goal':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'measurement_consistency':
        return 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800';
      case 'workout_streak':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800';
      case 'deficit_consistency':
        return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800';
      case 'first_measurement':
        return 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800';
      case 'weekly_goal':
        return 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800';
    }
  };

  if (loading) {
    return <Card className="p-6"><div>Lade Erfolge...</div></Card>;
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50/50 via-amber-25/30 to-amber-50/20 dark:from-amber-950/20 dark:via-amber-950/10 dark:to-amber-950/5 border-amber-200/30 dark:border-amber-800/30">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Deine Erfolge</h3>
            <p className="text-sm text-muted-foreground">
              {badges.length > 0 ? `${badges.length} Badges verdient` : 'Sammle deine ersten Badges!'}
            </p>
          </div>
        </div>

        {badges.length > 0 ? (
          <div className="space-y-3">
            {badges.map((badge) => (
              <div 
                key={badge.id}
                className={`p-4 rounded-xl border ${getBadgeColor(badge.badge_type)} transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getBadgeIcon(badge.badge_type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{badge.badge_name}</div>
                    <div className="text-sm opacity-80">{badge.badge_description}</div>
                    <div className="text-xs opacity-60 mt-1">
                      Verdient am {new Date(badge.earned_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h4 className="font-medium mb-2">Noch keine Badges</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Verdiene deine ersten Badges durch:
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 justify-center">
                <Target className="h-4 w-4" />
                <span>Regelmäßige Körpermaße (4 Wochen)</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Zap className="h-4 w-4" />
                <span>Training-Streak (7 Tage)</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Star className="h-4 w-4" />
                <span>Kaloriendefizit halten (1 Woche)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};