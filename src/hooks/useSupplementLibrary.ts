import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { 
  SupplementLibraryItem, 
  UserStackItem, 
  TimingConstraint, 
  InteractionTag,
  ScheduleType,
  PreferredTiming,
  EvidenceLevel,
  NecessityTier
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
        // ARES Impact Score System
        protocol_phase: item.protocol_phase ?? 0,
        impact_score: item.impact_score ?? 5.0,
        necessity_tier: (item.necessity_tier || 'optimizer') as NecessityTier,
        priority_score: item.priority_score ?? 50,
        evidence_level: (item.evidence_level || 'moderat') as EvidenceLevel,
        hallmarks_addressed: item.hallmarks_addressed || [],
        cost_per_day_eur: item.cost_per_day_eur,
        amazon_de_asin: item.amazon_de_asin,
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
            description,
            protocol_phase,
            impact_score,
            necessity_tier,
            priority_score,
            evidence_level,
            hallmarks_addressed,
            cost_per_day_eur,
            amazon_de_asin
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
            protocol_phase: supplement.protocol_phase ?? 0,
            impact_score: supplement.impact_score ?? 5.0,
            necessity_tier: (supplement.necessity_tier || 'optimizer') as NecessityTier,
            priority_score: supplement.priority_score ?? 50,
            evidence_level: (supplement.evidence_level || 'moderat') as EvidenceLevel,
            hallmarks_addressed: supplement.hallmarks_addressed || [],
            cost_per_day_eur: supplement.cost_per_day_eur,
            amazon_de_asin: supplement.amazon_de_asin,
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

// =====================================================
// ARES Impact Score System Queries
// =====================================================

// Fetch supplements by phase with tier grouping
export const useSupplementsByPhase = (phase: number) => {
  return useQuery({
    queryKey: [...SUPPLEMENT_LIBRARY_KEYS.library, 'phase', phase],
    queryFn: async (): Promise<{
      essentials: SupplementLibraryItem[];
      optimizers: SupplementLibraryItem[];
      specialists: SupplementLibraryItem[];
      all: SupplementLibraryItem[];
    }> => {
      const { data, error } = await supabase
        .from('supplement_database')
        .select('*')
        .eq('protocol_phase', phase)
        .order('impact_score', { ascending: false });

      if (error) throw error;

      const supplements = (data || []).map((item: any) => ({
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
        protocol_phase: item.protocol_phase ?? 0,
        impact_score: item.impact_score ?? 5.0,
        necessity_tier: (item.necessity_tier || 'optimizer') as NecessityTier,
        priority_score: item.priority_score ?? 50,
        evidence_level: (item.evidence_level || 'moderat') as EvidenceLevel,
        hallmarks_addressed: item.hallmarks_addressed || [],
        cost_per_day_eur: item.cost_per_day_eur,
        amazon_de_asin: item.amazon_de_asin,
      }));

      return {
        essentials: supplements.filter(s => s.necessity_tier === 'essential'),
        optimizers: supplements.filter(s => s.necessity_tier === 'optimizer'),
        specialists: supplements.filter(s => s.necessity_tier === 'specialist'),
        all: supplements,
      };
    },
    staleTime: 1000 * 60 * 10,
  });
};

// Get user's missing essentials for their phase
export const useMissingEssentials = (userPhase: number) => {
  const { data: stack } = useUserStack();
  const { data: phaseSupplements } = useSupplementsByPhase(userPhase);

  const userSupplementNames = new Set(
    (stack || []).map(s => s.name.toLowerCase().trim())
  );

  const missingEssentials = (phaseSupplements?.essentials || []).filter(
    s => !userSupplementNames.has(s.name.toLowerCase().trim())
  );

  return {
    missingEssentials,
    missingCount: missingEssentials.length,
    totalEssentials: phaseSupplements?.essentials?.length || 0,
    hasAllEssentials: missingEssentials.length === 0,
  };
};

// Get supplements grouped by category within a phase
export const useSupplementsByCategoryInPhase = (phase: number) => {
  const { data: phaseData, ...rest } = useSupplementsByPhase(phase);

  const groupedByCategory = (phaseData?.all || []).reduce((acc, item) => {
    const category = item.category || 'Sonstige';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, SupplementLibraryItem[]>);

  return { 
    groupedByCategory, 
    essentials: phaseData?.essentials || [],
    optimizers: phaseData?.optimizers || [],
    specialists: phaseData?.specialists || [],
    ...rest 
  };
};
