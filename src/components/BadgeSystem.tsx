
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
    <Card className="p-6 bg-gradient-to-br from-amber-50/80 via-amber-25/40 to-amber-50/30 dark:from-amber-950/30 dark:via-amber-950/15 dark:to-amber-950/10 border-amber-200/40 dark:border-amber-800/40 shadow-xl shadow-amber-500/10">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/30 rounded-2xl shadow-lg">
              <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            {/* Sparkle decoration */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-white to-yellow-200 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-xl bg-gradient-to-r from-amber-700 to-amber-600 dark:from-amber-300 dark:to-amber-200 bg-clip-text text-transparent">
              Deine Erfolge
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              {badges.length > 0 ? `🏆 ${badges.length} Badges verdient!` : 'Sammle deine ersten Badges!'}
            </p>
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 lg:gap-3 p-3 lg:p-4 bg-gradient-to-r from-background/60 via-background/80 to-background/60 rounded-2xl border border-border/50 backdrop-blur-sm">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 lg:px-6 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-all duration-300 ${
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
                className={`px-4 py-2 lg:px-6 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-all duration-300 flex items-center gap-2 ${
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
        )}

        {displayBadges.length > 0 ? (
          <div className="space-y-4">
            {/* Badge Grid - Better desktop layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
              {(showAllBadges ? displayBadges : displayBadges.slice(0, isDesktop ? 8 : 3)).map((badge, index) => {
                const badgeColor = getBadgeColor(badge.badge_type);
                return (
                  <div 
                    key={badge.id}
                    className="group relative p-5 rounded-2xl border-2 bg-gradient-to-br from-background/95 via-background/90 to-background/80 backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 animate-fade-in"
                    style={{
                      borderColor: `${badgeColor}60`,
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"
                      style={{
                        background: `linear-gradient(45deg, ${badgeColor}40, ${badgeColor}20)`
                      }}
                    />
                    
                    {/* Badge content */}
                    <div className="relative z-10 flex flex-col items-center text-center gap-4">
                      {/* Icon with gradient background */}
                      <div 
                        className="relative flex-shrink-0 p-4 rounded-2xl border-2 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${badgeColor}25, ${badgeColor}10)`,
                          borderColor: `${badgeColor}50`,
                          color: badgeColor,
                          boxShadow: `0 8px 32px ${badgeColor}30`
                        }}
                      >
                        {/* Sparkle effect */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-white to-yellow-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />
                        
                        {getBadgeIcon(badge.badge_name, badge.badge_type)}
                      </div>
                      
                      {/* Badge info */}
                      <div className="space-y-2">
                        <div className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                          {badge.badge_name}
                        </div>
                        <div className="text-sm text-muted-foreground leading-relaxed">
                          {badge.badge_description}
                        </div>
                        <div className="text-xs text-muted-foreground/80 font-medium">
                          {new Date(badge.earned_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'short', 
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      
                      {/* Achievement checkmark */}
                      <div className="absolute top-3 right-3">
                        <div 
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}80)`,
                            borderColor: `${badgeColor}`,
                            boxShadow: `0 4px 16px ${badgeColor}40`
                          }}
                        >
                          <span className="text-white text-sm font-bold">✓</span>
                        </div>
                      </div>
                      
                      {/* Bottom gradient line */}
                      <div 
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full opacity-60 group-hover:opacity-100 group-hover:w-24 transition-all duration-300"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${badgeColor}, transparent)`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More/Less Button */}
            {displayBadges.length > (isDesktop ? 8 : 3) && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowAllBadges(!showAllBadges)}
                  className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary/10 via-primary/15 to-primary/10 hover:from-primary/20 hover:via-primary/25 hover:to-primary/20 text-primary rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                >
                  <span className="font-medium">
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
