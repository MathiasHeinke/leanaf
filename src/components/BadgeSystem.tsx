
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Target, Zap, Calendar, Medal, ChevronRight } from "lucide-react";
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

interface BadgeCategory {
  name: string;
  badges: UserBadge[];
  icon: React.ReactNode;
}

export const BadgeSystem = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAllBadges, setShowAllBadges] = useState(false);

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

  // Extract emoji from badge name or use fallback icon
  const getBadgeIcon = (badgeName: string, badgeType: string) => {
    // Extract emoji from badge name (emojis are usually at the end)
    const emojiMatch = badgeName.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
    
    if (emojiMatch && emojiMatch.length > 0) {
      return (
        <span className="text-2xl" style={{ fontSize: '24px' }}>
          {emojiMatch[0]}
        </span>
      );
    }

    // Fallback to Lucide icons
    switch (badgeType) {
      case 'measurement_consistency': return <Target className="h-6 w-6" />;
      case 'workout_streak': return <Zap className="h-6 w-6" />;
      case 'deficit_consistency': return <Star className="h-6 w-6" />;
      case 'first_measurement': return <Medal className="h-6 w-6" />;
      case 'weekly_goal': return <Calendar className="h-6 w-6" />;
      case 'level_achievement': return <Trophy className="h-6 w-6" />;
      default: return <Trophy className="h-6 w-6" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'measurement_consistency': return 'hsl(270, 70%, 55%)';
      case 'workout_streak': return 'hsl(160, 70%, 45%)';
      case 'deficit_consistency': return 'hsl(210, 70%, 55%)';
      case 'first_measurement': return 'hsl(45, 80%, 55%)';
      case 'weekly_goal': return 'hsl(350, 70%, 55%)';
      case 'level_achievement': return 'hsl(280, 70%, 50%)';
      case 'streak_badge': return 'hsl(15, 80%, 55%)';
      case 'commitment_badge': return 'hsl(120, 60%, 45%)';
      case 'special_achievement': return 'hsl(330, 70%, 50%)';
      default: return 'hsl(220, 20%, 50%)';
    }
  };

  // Categorize badges
  const categorizeItems = (): BadgeCategory[] => {
    const categories: BadgeCategory[] = [
      { name: 'Levels', badges: [], icon: <Trophy className="h-4 w-4" /> },
      { name: 'Streaks', badges: [], icon: <Zap className="h-4 w-4" /> },
      { name: 'Konsistenz', badges: [], icon: <Target className="h-4 w-4" /> },
      { name: 'Spezial', badges: [], icon: <Star className="h-4 w-4" /> },
    ];

    badges.forEach(badge => {
      if (badge.badge_type === 'level_achievement') {
        categories[0].badges.push(badge);
      } else if (badge.badge_type.includes('streak')) {
        categories[1].badges.push(badge);
      } else if (badge.badge_type.includes('consistency') || badge.badge_type === 'weekly_goal') {
        categories[2].badges.push(badge);
      } else {
        categories[3].badges.push(badge);
      }
    });

    return categories.filter(cat => cat.badges.length > 0);
  };

  const categories = categorizeItems();
  const displayBadges = selectedCategory === 'all' ? badges : 
    categories.find(cat => cat.name.toLowerCase() === selectedCategory)?.badges || [];

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

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 p-2 bg-background/50 rounded-lg">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background/80 hover:bg-background'
              }`}
            >
              Alle ({badges.length})
            </button>
            {categories.map(category => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name.toLowerCase())}
                className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                  selectedCategory === category.name.toLowerCase() 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background/80 hover:bg-background'
                }`}
              >
                {category.icon}
                {category.name} ({category.badges.length})
              </button>
            ))}
          </div>
        )}

        {displayBadges.length > 0 ? (
          <div className="space-y-4">
            {/* Badge Grid - Max 3 per row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(showAllBadges ? displayBadges : displayBadges.slice(0, 3)).map((badge) => {
                const badgeColor = getBadgeColor(badge.badge_type);
                return (
                  <div 
                    key={badge.id}
                    className="p-4 rounded-xl border-2 bg-background/90 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      borderColor: `${badgeColor}50`
                    }}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div 
                        className="flex-shrink-0 p-3 rounded-lg border-2 flex items-center justify-center"
                        style={{
                          backgroundColor: `${badgeColor}15`,
                          borderColor: `${badgeColor}30`,
                          color: badgeColor
                        }}
                      >
                        {getBadgeIcon(badge.badge_name, badge.badge_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground text-sm">{badge.badge_name}</div>
                        <div className="text-xs text-muted-foreground">{badge.badge_description}</div>
                        <div className="text-xs text-muted-foreground/70">
                          {new Date(badge.earned_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        className="bg-background/90 font-semibold border-2 px-2 py-1 text-xs"
                        style={{
                          color: badgeColor,
                          borderColor: `${badgeColor}50`
                        }}
                      >
                        ✓
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More/Less Button */}
            {displayBadges.length > 3 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAllBadges(!showAllBadges)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium">
                    {showAllBadges ? 'Weniger anzeigen' : `${displayBadges.length - 3} weitere anzeigen`}
                  </span>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${showAllBadges ? 'rotate-90' : ''}`} 
                  />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🏆</div>
            <h4 className="font-medium mb-2">Noch keine Badges</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Verdiene deine ersten Badges durch:
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 justify-center bg-background/60 px-3 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-xl">📏</span>
                <span>Regelmäßige Körpermaße (4 Wochen)</span>
              </div>
              <div className="flex items-center gap-2 justify-center bg-background/60 px-3 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-xl">💪</span>
                <span>Training-Streak (7 Tage)</span>
              </div>
              <div className="flex items-center gap-2 justify-center bg-background/60 px-3 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-xl">🎯</span>
                <span>Kaloriendefizit halten (1 Woche)</span>
              </div>
              <div className="flex items-center gap-2 justify-center bg-background/60 px-3 py-2 rounded-lg backdrop-blur-sm">
                <span className="text-xl">🌱</span>
                <span>Level-Aufstieg erreichen</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
