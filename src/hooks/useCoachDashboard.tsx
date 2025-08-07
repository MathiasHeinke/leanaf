import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { DashboardRow, ConversationDetail, DashboardFilters, AdminNote } from '@/types/coach-dashboard';

export const useConversations = (filters: DashboardFilters) => {
  return useSWR(
    ['coach-dashboard', filters],
    async () => {
      let query = supabase
        .from('v_coach_dashboard')
        .select('*')
        .order('last_msg_at', { ascending: false });

      // Apply filters
      if (filters.from) {
        query = query.gte('started_at', filters.from.toISOString());
      }
      if (filters.to) {
        query = query.lte('last_msg_at', filters.to.toISOString());
      }
      if (filters.coach) {
        query = query.eq('coach', filters.coach);
      }
      if (filters.status) {
        query = query.eq('admin_status', filters.status);
      }
      if (filters.hasRag !== undefined) {
        query = query.eq('used_rag', filters.hasRag);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as DashboardRow[];
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Auto-refresh every 30 seconds
    }
  );
};

export const useConversationDetail = (conversationId: string | null) => {
  return useSWR(
    conversationId ? ['conversation-detail', conversationId] : null,
    async () => {
      if (!conversationId) return null;

      // Parse conversation ID to get user_id, coach, and date
      const [userId, coach, dateStr] = conversationId.split('-');
      
      const [messagesRes, ragRes, toolsRes, plansRes] = await Promise.allSettled([
        supabase
          .from('coach_conversations')
          .select('*')
          .eq('user_id', userId)
          .eq('coach_personality', coach)
          .eq('conversation_date', dateStr)
          .order('created_at'),
        
        supabase
          .from('rag_chunk_logs')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at'),
        
        supabase
          .from('tool_usage_events')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at'),
        
        supabase
          .from('coach_plans')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at'),
      ]);

      return {
        messages: messagesRes.status === 'fulfilled' ? messagesRes.value.data || [] : [],
        rag: ragRes.status === 'fulfilled' ? ragRes.value.data || [] : [],
        tools: toolsRes.status === 'fulfilled' ? toolsRes.value.data || [] : [],
        plans: plansRes.status === 'fulfilled' ? plansRes.value.data || [] : [],
      } as ConversationDetail;
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 10000, // Refresh every 10 seconds for active conversations
    }
  );
};

export const useAdminNotes = (conversationId: string | null) => {
  return useSWR(
    conversationId ? ['admin-notes', conversationId] : null,
    async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('admin_conversation_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminNote[];
    }
  );
};

export const useCreateAdminNote = () => {
  return async (conversationId: string, note: string, status: string) => {
    const { data, error } = await supabase
      .from('admin_conversation_notes')
      .insert({
        conversation_id: conversationId,
        admin_user_id: (await supabase.auth.getUser()).data.user?.id,
        note,
        status,
        metadata: {}
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  };
};

export const useUpdateAdminNoteStatus = () => {
  return async (noteId: string, status: string) => {
    const { data, error } = await supabase
      .from('admin_conversation_notes')
      .update({ status })
      .eq('id', noteId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  };
};