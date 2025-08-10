import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface UnmetToolEvent {
  id: string;
  user_id: string;
  session_id: string;
  message: string;
  intent_guess: string | null;
  confidence: number | null;
  suggested_tool: string | null;
  handled_manually: boolean;
  manual_summary: string | null;
  status: 'new' | 'triaged' | 'in_progress' | 'shipped' | 'wontfix';
  created_at: string;
  updated_at: string;
}

export const useUnmetToolTracking = () => {
  const [events, setEvents] = useState<UnmetToolEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    triaged: 0,
    inProgress: 0,
    shipped: 0
  });
  const { user } = useAuth();

  const fetchEvents = async (limit: number = 50) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unmet_tool_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setEvents((data || []) as UnmetToolEvent[]);
      
      // Calculate stats
      const newStats = data?.reduce((acc, event) => {
        acc.total++;
        acc[event.status as keyof typeof acc]++;
        return acc;
      }, { total: 0, new: 0, triaged: 0, inProgress: 0, shipped: 0 }) || stats;
      
      setStats(newStats);
      
    } catch (error) {
      console.error('Failed to fetch unmet tool events:', error);
      toast.error('Failed to load tool tracking data');
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('unmet_tool_events')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      
      // Refresh events
      await fetchEvents();
      toast.success('Event status updated');
      
    } catch (error) {
      console.error('Failed to update event status:', error);
      toast.error('Failed to update status');
    }
  };

  const getTopMissingTools = () => {
    const toolCounts = events.reduce((acc, event) => {
      if (event.suggested_tool) {
        acc[event.suggested_tool] = (acc[event.suggested_tool] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tool, count]) => ({ tool, count }));
  };

  const getAverageConfidence = () => {
    const confidenceValues = events
      .filter(e => e.confidence !== null)
      .map(e => e.confidence!);
    
    if (confidenceValues.length === 0) return 0;
    
    return confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length;
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  return {
    events,
    loading,
    stats,
    topMissingTools: getTopMissingTools(),
    averageConfidence: getAverageConfidence(),
    fetchEvents,
    updateEventStatus,
    refresh: () => fetchEvents()
  };
};