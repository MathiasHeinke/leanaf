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
  NecessityTier,
  FormQuality,
  SupplementBrand,
  SupplementProduct
} from '@/types/supplementLibrary';

// Query keys for React Query
export const SUPPLEMENT_LIBRARY_KEYS = {
  library: ['supplement-library'] as const,
  userStack: (userId: string) => ['user-stack', userId] as const,
  products: (supplementId: string) => ['supplement-products', supplementId] as const,
  brands: ['supplement-brands'] as const,
};

// Fetch master supplement library with Premium UX v2 fields
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
        // Premium UX v2 fields
        form_quality: item.form_quality as FormQuality | null,
        synergies: item.synergies || null,
        blockers: item.blockers || null,
        cycling_required: item.cycling_required ?? false,
        cycling_protocol: item.cycling_protocol || null,
        underrated_score: item.underrated_score || null,
        warnung: item.warnung || null,
      }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - library rarely changes
  });
};

// Fetch supplement products for a specific supplement
export const useSupplementProducts = (supplementId?: string) => {
  return useQuery({
    queryKey: SUPPLEMENT_LIBRARY_KEYS.products(supplementId || ''),
    queryFn: async (): Promise<SupplementProduct[]> => {
      const { data, error } = await supabase
        .from('supplement_products')
        .select(`
          *,
          supplement_brands(*)
        `)
        .eq('supplement_id', supplementId!)
        .order('is_recommended', { ascending: false })
        .order('price_per_serving', { ascending: true });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        brand_id: item.brand_id,
        supplement_id: item.supplement_id,
        product_name: item.product_name,
        pack_size: item.pack_size,
        pack_unit: item.pack_unit,
        servings_per_pack: item.servings_per_pack,
        dose_per_serving: item.dose_per_serving,
        dose_unit: item.dose_unit,
        price_eur: item.price_eur,
        price_per_serving: item.price_per_serving,
        form: item.form,
        is_vegan: item.is_vegan,
        is_recommended: item.is_recommended,
        is_verified: item.is_verified,
        amazon_asin: item.amazon_asin,
        product_url: item.product_url,
        brand: item.supplement_brands ? {
          id: item.supplement_brands.id,
          name: item.supplement_brands.name,
          slug: item.supplement_brands.slug,
          country: item.supplement_brands.country,
          website: item.supplement_brands.website,
          price_tier: item.supplement_brands.price_tier,
          specialization: item.supplement_brands.specialization,
          quality_certifications: item.supplement_brands.quality_certifications,
          description: item.supplement_brands.description,
          logo_url: item.supplement_brands.logo_url,
        } : null,
      }));
    },
    enabled: !!supplementId,
    staleTime: 1000 * 60 * 5,
  });
};

// Fetch all supplement brands
export const useSupplementBrands = () => {
  return useQuery({
    queryKey: SUPPLEMENT_LIBRARY_KEYS.brands,
    queryFn: async (): Promise<SupplementBrand[]> => {
      const { data, error } = await supabase
        .from('supplement_brands')
        .select('*')
        .order('name');

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        country: item.country,
        website: item.website,
        price_tier: item.price_tier,
        specialization: item.specialization,
        quality_certifications: item.quality_certifications,
        description: item.description,
        logo_url: item.logo_url,
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - brands rarely change
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
            amazon_de_asin,
            form_quality,
            synergies,
            blockers,
            cycling_required,
            cycling_protocol,
            underrated_score,
            warnung
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
            // Premium UX v2 fields
            form_quality: supplement.form_quality as FormQuality | null,
            synergies: supplement.synergies || null,
            blockers: supplement.blockers || null,
            cycling_required: supplement.cycling_required ?? false,
            cycling_protocol: supplement.cycling_protocol || null,
            underrated_score: supplement.underrated_score || null,
            warnung: supplement.warnung || null,
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

// Group user stack by necessity tier for pyramid navigation
export const useUserStackByTier = () => {
  const { data: stack, ...rest } = useUserStack();

  const activeStack = (stack || []).filter(item => item.is_active);

  const groupedByTier = activeStack.reduce((acc, item) => {
    const tier = item.supplement?.necessity_tier || 'optimizer';
    if (!acc[tier]) {
      acc[tier] = [];
    }
    acc[tier].push(item);
    return acc;
  }, {} as Record<NecessityTier, UserStackItem[]>);

  return { 
    groupedByTier, 
    essentials: groupedByTier.essential || [],
    optimizers: groupedByTier.optimizer || [],
    specialists: groupedByTier.specialist || [],
    activeStack, 
    stack, 
    ...rest 
  };
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
