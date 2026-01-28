import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { 
  SupplementLibraryItem, 
  UserStackItem, 
  TimingConstraint, 
  InteractionTag,
  ScheduleType,
  PreferredTiming 
} from '@/types/supplementLibrary';

// Query keys for React Query
export const SUPPLEMENT_LIBRARY_KEYS = {
  library: ['supplement-library'] as const,
  userStack: (userId: string) => ['user-stack', userId] as const,
};

// Fetch master supplement library
export const useSupplementLibrary = () => {
  return useQuery({
    queryKey: SUPPLEMENT_LIBRARY_KEYS.library,
    queryFn: async (): Promise<SupplementLibraryItem[]> => {
      const { data, error } = await supabase
        .from('supplement_database')
        .select('*')
        .order('name');

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category || 'Sonstige',
        default_dosage: item.default_dosage,
        default_unit: item.default_unit || 'mg',
        common_timing: item.common_timing || [],
        timing_constraint: (item.timing_constraint || 'any') as TimingConstraint,
        interaction_tags: (item.interaction_tags || []) as InteractionTag[],
        brand_recommendation: item.brand_recommendation,
        description: item.description,
        common_brands: item.common_brands,
        recognition_keywords: item.recognition_keywords,
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - library rarely changes
  });
};

// Fetch user's supplement stack with enhanced fields
export const useUserStack = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: SUPPLEMENT_LIBRARY_KEYS.userStack(user?.id || ''),
    queryFn: async (): Promise<UserStackItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_supplements')
        .select(`
          *,
          supplement_database(
            id,
            name,
            category,
            default_dosage,
            default_unit,
            common_timing,
            timing_constraint,
            interaction_tags,
            brand_recommendation,
            description
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => {
        const supplement = item.supplement_database;
        return {
          id: item.id,
          user_id: item.user_id,
          supplement_id: item.supplement_id,
          name: item.custom_name || item.name || supplement?.name || 'Unbekannt',
          custom_name: item.custom_name,
          dosage: item.dosage || supplement?.default_dosage || '',
          unit: item.unit || supplement?.default_unit || 'mg',
          timing: item.timing || [],
          schedule_type: (item.schedule_type || 'daily') as ScheduleType,
          preferred_timing: (item.preferred_timing || 'morning') as PreferredTiming,
          stock_count: item.stock_count,
          is_active: item.is_active ?? true,
          goal: item.goal,
          notes: item.notes,
          frequency_days: item.frequency_days,
          schedule: item.schedule,
          created_at: item.created_at,
          updated_at: item.updated_at,
          supplement: supplement ? {
            id: supplement.id,
            name: supplement.name,
            category: supplement.category || 'Sonstige',
            default_dosage: supplement.default_dosage,
            default_unit: supplement.default_unit || 'mg',
            common_timing: supplement.common_timing || [],
            timing_constraint: (supplement.timing_constraint || 'any') as TimingConstraint,
            interaction_tags: (supplement.interaction_tags || []) as InteractionTag[],
            brand_recommendation: supplement.brand_recommendation,
            description: supplement.description,
          } : null,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Group user stack by category
export const useUserStackByCategory = () => {
  const { data: stack, ...rest } = useUserStack();

  const groupedByCategory = (stack || []).reduce((acc, item) => {
    const category = item.supplement?.category || 'Sonstige';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, UserStackItem[]>);

  return { groupedByCategory, stack, ...rest };
};

// Group user stack by preferred timing for timeline
export const useUserStackByTiming = () => {
  const { data: stack, ...rest } = useUserStack();

  const activeStack = (stack || []).filter(item => item.is_active);

  const groupedByTiming = activeStack.reduce((acc, item) => {
    const timing = item.preferred_timing || 'morning';
    if (!acc[timing]) {
      acc[timing] = [];
    }
    acc[timing].push(item);
    return acc;
  }, {} as Record<PreferredTiming, UserStackItem[]>);

  return { groupedByTiming, activeStack, stack, ...rest };
};
