import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserInsight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  last_relevant_at: string | null;
}

export interface InsightsByCategory {
  goals: UserInsight[];
  preferences: UserInsight[];
  health: UserInsight[];
  lifestyle: UserInsight[];
  context: UserInsight[];
  other: UserInsight[];
}

const CATEGORY_MAP: Record<string, keyof InsightsByCategory> = {
  goal: 'goals',
  preference: 'preferences',
  health_status: 'health',
  lifestyle: 'lifestyle',
  context: 'context',
  behavioral_pattern: 'lifestyle',
  emotional_state: 'context',
  constraint: 'preferences',
  knowledge_gap: 'other',
  success_pattern: 'goals',
};

export const useUserInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [byCategory, setByCategory] = useState<InsightsByCategory>({
    goals: [],
    preferences: [],
    health: [],
    lifestyle: [],
    context: [],
    other: [],
  });
  const [loading, setLoading] = useState(false);
  const [insightCount, setInsightCount] = useState(0);

  const fetchInsights = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_insights')
        .select('id, category, insight, confidence, importance, created_at, last_relevant_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('importance', { ascending: true }) // critical first
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useUserInsights] Error fetching insights:', error);
        return;
      }

      const typedData = (data || []) as UserInsight[];
      setInsights(typedData);
      setInsightCount(typedData.length);

      // Group by category
      const grouped: InsightsByCategory = {
        goals: [],
        preferences: [],
        health: [],
        lifestyle: [],
        context: [],
        other: [],
      };

      typedData.forEach((insight) => {
        const mappedCategory = CATEGORY_MAP[insight.category] || 'other';
        grouped[mappedCategory].push(insight);
      });

      setByCategory(grouped);
    } catch (err) {
      console.error('[useUserInsights] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const getTopInsights = useCallback((limit: number = 5): UserInsight[] => {
    return insights.slice(0, limit);
  }, [insights]);

  const getInsightProgress = useCallback((): number => {
    // Progress based on insight count (max 100 at 20+ insights)
    return Math.min(100, (insightCount / 20) * 100);
  }, [insightCount]);

  return {
    insights,
    byCategory,
    loading,
    insightCount,
    fetchInsights,
    getTopInsights,
    getInsightProgress,
  };
};
