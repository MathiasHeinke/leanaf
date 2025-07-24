
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (user) {
      loadBadges();
    }
  }, [user]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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
    <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-50/80 via-amber-25/40 to-amber-50/30 dark:from-amber-950/30 dark:via-amber-950/15 dark:to-amber-950/10 border-amber-200/40 dark:border-amber-800/40 shadow-xl shadow-amber-500/10">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/30 rounded-2xl shadow-lg">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />
            </div>
            {/* Sparkle decoration */}
            <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-white to-yellow-200 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg sm:text-xl bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-300 dark:to-amber-200 bg-clip-text text-transparent">
              Deine Erfolge
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">
              {badges.length > 0 ? `🏆 ${badges.length} Badges verdient!` : 'Sammle deine ersten Badges!'}
            </p>
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="space-y-2">
            {/* Mobile: Vertical layout */}
            <div className="sm:hidden space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                  selectedCategory === 'all' 
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30' 
                    : 'bg-background/60 hover:bg-background/90 text-foreground border border-border/30'
                }`}
              >
                <span className="text-xs">Alle ({badges.length})</span>
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {categories.map(category => (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name.toLowerCase())}
                    className={`px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center justify-center gap-1 ${
                      selectedCategory === category.name.toLowerCase() 
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30' 
                        : 'bg-background/60 hover:bg-background/90 text-foreground border border-border/30'
                    }`}
                  >
                    {category.icon}
                    <span className="truncate text-xs">{category.name} ({category.badges.length})</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Desktop: Horizontal layout */}
            <div className="hidden sm:flex flex-wrap gap-2 lg:gap-3 p-3 lg:p-4 bg-gradient-to-r from-background/60 via-background/80 to-background/60 rounded-2xl border border-border/50 backdrop-blur-sm">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-300 ${
                  selectedCategory === 'all' 
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                    : 'bg-background/60 hover:bg-background/90 text-foreground hover:scale-105 border border-border/30'
                }`}
              >
                Alle ({badges.length})
              </button>
              {categories.map(category => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name.toLowerCase())}
                  className={`px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                    selectedCategory === category.name.toLowerCase() 
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 scale-105' 
                      : 'bg-background/60 hover:bg-background/90 text-foreground hover:scale-105 border border-border/30'
                  }`}
                >
                  {category.icon}
                  {category.name} ({category.badges.length})
                </button>
              ))}
            </div>
          </div>
        )}

        {displayBadges.length > 0 ? (
          <div className="space-y-4">
            {/* Badge Grid - Better desktop layout */}
            <div className="space-y-3 sm:space-y-4">
              {(showAllBadges ? displayBadges : displayBadges.slice(0, isDesktop ? 8 : 3)).map((badge, index) => {
                const badgeColor = getBadgeColor(badge.badge_type);
                return (
                <div 
                  key={badge.id}
                  className="group relative p-4 sm:p-6 rounded-xl bg-background/50 border border-border/20 transition-all duration-200 hover:bg-background/80 hover:border-border/40 animate-fade-in"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Simplified Badge Icon */}
                    <div 
                      className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-border/30 flex items-center justify-center bg-background/80"
                      style={{
                        borderColor: `${getBadgeColor(badge.badge_type)}40`,
                        color: getBadgeColor(badge.badge_type)
                      }}
                    >
                      {getBadgeIcon(badge.badge_name, badge.badge_type)}
                    </div>
                    
                    {/* Badge Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base text-foreground mb-1 break-words">
                            {badge.badge_name}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2 break-words">
                            {badge.badge_description}
                          </p>
                          <time className="text-xs text-muted-foreground/70">
                            {new Date(badge.earned_at).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: 'short', 
                              year: 'numeric'
                            })}
                          </time>
                        </div>
                        
                        {/* Simple Check Mark */}
                        <div 
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: getBadgeColor(badge.badge_type),
                          }}
                        >
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Show More/Less Button */}
            {displayBadges.length > (isDesktop ? 8 : 3) && (
              <div className="flex justify-center pt-2 sm:pt-4">
                <button
                  onClick={() => setShowAllBadges(!showAllBadges)}
                  className="group flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 hover:from-primary/20 hover:via-primary/25 hover:to-primary/20 text-primary rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                >
                  <span className="font-medium text-sm sm:text-base">
                    {showAllBadges ? 'Weniger anzeigen' : `${displayBadges.length - (isDesktop ? 8 : 3)} weitere Erfolge anzeigen`}
                  </span>
                  <ChevronRight 
                    className={`h-4 w-4 transition-all duration-300 group-hover:scale-110 ${showAllBadges ? 'rotate-90' : 'group-hover:translate-x-1'}`} 
                  />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full opacity-25 animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>
            
            <div className="relative z-10">
              <div className="text-8xl mb-6 animate-bounce">🏆</div>
              <h4 className="font-bold text-xl mb-3 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Deine Erfolgsreise beginnt hier!
              </h4>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Verdiene deine ersten Badges durch kontinuierliche Aktivität und erreiche deine Ziele:
              </p>
              <div className="space-y-3 max-w-md mx-auto">
                <div className="flex items-center gap-3 justify-start bg-gradient-to-r from-purple-50/80 to-purple-100/60 dark:from-purple-950/30 dark:to-purple-900/20 px-4 py-3 rounded-xl backdrop-blur-sm border border-purple-200/40 dark:border-purple-800/40 hover:scale-105 transition-all duration-300">
                  <span className="text-2xl">📏</span>
                  <span className="text-sm font-medium">Regelmäßige Körpermaße (4 Wochen)</span>
                </div>
                <div className="flex items-center gap-3 justify-start bg-gradient-to-r from-orange-50/80 to-red-100/60 dark:from-orange-950/30 dark:to-red-900/20 px-4 py-3 rounded-xl backdrop-blur-sm border border-orange-200/40 dark:border-orange-800/40 hover:scale-105 transition-all duration-300">
                  <span className="text-2xl">💪</span>
                  <span className="text-sm font-medium">Training-Streak (7 Tage)</span>
                </div>
                <div className="flex items-center gap-3 justify-start bg-gradient-to-r from-blue-50/80 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-900/20 px-4 py-3 rounded-xl backdrop-blur-sm border border-blue-200/40 dark:border-blue-800/40 hover:scale-105 transition-all duration-300">
                  <span className="text-2xl">🎯</span>
                  <span className="text-sm font-medium">Kaloriendefizit halten (1 Woche)</span>
                </div>
                <div className="flex items-center gap-3 justify-start bg-gradient-to-r from-green-50/80 to-emerald-100/60 dark:from-green-950/30 dark:to-emerald-900/20 px-4 py-3 rounded-xl backdrop-blur-sm border border-green-200/40 dark:border-green-800/40 hover:scale-105 transition-all duration-300">
                  <span className="text-2xl">🌱</span>
                  <span className="text-sm font-medium">Level-Aufstieg erreichen</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
