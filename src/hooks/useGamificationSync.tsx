import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useBadgeChecker } from '@/hooks/useBadgeChecker';

export interface XPGain {
  amount: number;
  source: string;
  timestamp: Date;
}

export interface DailyQuest {
  id: string;
  quest_type: string;
  quest_title: string;
  quest_description: string | null;
  target: number;
  progress: number;
  xp_reward: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface GamificationState {
  dailyXP: number;
  totalXP: number;
  streakDays: number;
  dailyQuests: DailyQuest[];
  recentGains: XPGain[];
}

export const useGamificationSync = () => {
  const { user } = useAuth();
  const { checkBadges } = useBadgeChecker();
  const [state, setState] = useState<GamificationState>({
    dailyXP: 0,
    totalXP: 0,
    streakDays: 0,
    dailyQuests: [],
    recentGains: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch current gamification state from DB
   */
  const refreshState = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Parallel fetch all gamification data
      const [pointsRes, streakRes, questsRes, statsRes] = await Promise.all([
        supabase
          .from('user_points')
          .select('total_points')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('daily_quests')
          .select('*')
          .eq('user_id', user.id)
          .eq('quest_date', today)
          .order('created_at'),
        supabase
          .from('ares_interaction_stats')
          .select('xp_earned')
          .eq('user_id', user.id)
          .eq('interaction_date', today)
          .maybeSingle(),
      ]);

      const statsData = statsRes.data as { xp_earned: number } | null;
      
      setState(prev => ({
        ...prev,
        totalXP: pointsRes.data?.total_points || 0,
        dailyXP: statsData?.xp_earned || 0,
        streakDays: streakRes.data?.current_streak || 0,
        dailyQuests: (questsRes.data || []) as DailyQuest[],
      }));
    } catch (error) {
      console.error('[Gamification] Error refreshing state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Handle XP gain from ARES interaction
   */
  const handleXPGain = useCallback((xpAmount: number, source: string = 'ARES') => {
    if (xpAmount <= 0) return;
    
    const gain: XPGain = {
      amount: xpAmount,
      source,
      timestamp: new Date(),
    };
    
    setState(prev => ({
      ...prev,
      dailyXP: prev.dailyXP + xpAmount,
      totalXP: prev.totalXP + xpAmount,
      recentGains: [gain, ...prev.recentGains.slice(0, 4)],
    }));
    
    // Show XP toast
    toast.success(`+${xpAmount} XP`, {
      description: source,
      duration: 2000,
    });
    
    // Trigger badge check after XP gain
    checkBadges();
  }, [checkBadges]);

  /**
   * Update quest progress locally (optimistic update)
   */
  const updateQuestProgress = useCallback((questId: string, newProgress: number, isCompleted: boolean) => {
    setState(prev => ({
      ...prev,
      dailyQuests: prev.dailyQuests.map(q => 
        q.id === questId 
          ? { ...q, progress: newProgress, is_completed: isCompleted }
          : q
      ),
    }));
    
    // Show completion toast if just completed
    if (isCompleted) {
      const quest = state.dailyQuests.find(q => q.id === questId);
      if (quest) {
        toast.success(`🎯 Quest abgeschlossen!`, {
          description: `${quest.quest_title} (+${quest.xp_reward} XP)`,
          duration: 4000,
        });
      }
    }
  }, [state.dailyQuests]);

  /**
   * Manually trigger quest generation (if none exist)
   */
  const ensureQuests = useCallback(async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if quests exist
    const { data: existing } = await supabase
      .from('daily_quests')
      .select('id')
      .eq('user_id', user.id)
      .eq('quest_date', today)
      .limit(1);
    
    if (existing && existing.length > 0) {
      await refreshState();
      return;
    }
    
    // Generate quests via edge function or RPC
    // For now, just refresh to pick up any server-generated quests
    await refreshState();
  }, [user, refreshState]);

  /**
   * Get streak multiplier text
   */
  const getStreakMultiplierText = useCallback((): string | null => {
    if (state.streakDays >= 30) return '2x Streak-Bonus';
    if (state.streakDays >= 14) return '1.75x Streak-Bonus';
    if (state.streakDays >= 7) return '1.5x Streak-Bonus';
    if (state.streakDays >= 3) return '1.25x Streak-Bonus';
    return null;
  }, [state.streakDays]);

  return {
    state,
    isLoading,
    refreshState,
    handleXPGain,
    updateQuestProgress,
    ensureQuests,
    getStreakMultiplierText,
  };
};
