import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { parseScheduleFromProtocol } from '@/lib/schedule-utils';
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
  SupplementProduct,
  PREFERRED_TIMING_LABELS,
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

// Intake Log Types for today's taken supplements
interface TodayIntake {
  user_supplement_id: string;
  timing: string;
  taken: boolean;
}

// Group user stack by preferred timing for timeline + fetch today's intake logs
export const useUserStackByTiming = () => {
  const { user } = useAuth();
  const { data: stack, ...rest } = useUserStack();
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's intake logs from supplement_intake_log
  const { data: todayIntakes, refetch: refetchIntakes } = useQuery({
    queryKey: ['supplement-intakes-today', user?.id, today],
    queryFn: async (): Promise<TodayIntake[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, timing, taken')
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('taken', true);
      if (error) throw error;
      return (data || []) as TodayIntake[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Set for fast lookup: "supplementId|timing"
  const takenSet = new Set(
    (todayIntakes || []).map(i => `${i.user_supplement_id}|${i.timing}`)
  );

  const activeStack = (stack || []).filter(item => item.is_active);

  const groupedByTiming = activeStack.reduce((acc, item) => {
    const timing = item.preferred_timing || 'morning';
    if (!acc[timing]) {
      acc[timing] = [];
    }
    acc[timing].push(item);
    return acc;
  }, {} as Record<PreferredTiming, UserStackItem[]>);

  return { 
    groupedByTiming, 
    activeStack, 
    todayIntakes: todayIntakes || [],
    stack, 
    refetch: () => {
      rest.refetch();
      refetchIntakes();
    },
    ...rest 
  };
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

  // Compare by supplement_id instead of name for accurate matching
  const userSupplementIds = new Set(
    (stack || [])
      .filter(s => s.is_active && s.supplement_id)
      .map(s => s.supplement_id)
  );

  const missingEssentials = (phaseSupplements?.essentials || []).filter(
    s => !userSupplementIds.has(s.id)
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

// =====================================================
// Toggle & Auto-Activate Hooks (Blueprint & Flow)
// =====================================================

// Mapping function: timing_constraint + common_timing -> preferred_timing
// PRIORITY: timing_constraint > common_timing (constraint is more specific)
function mapTimingToPreferred(
  timingConstraint: string | null | undefined, 
  commonTiming: string[] | null | undefined
): PreferredTiming {
  // 1. Check timing_constraint first (most specific)
  if (timingConstraint) {
    const constraint = timingConstraint.toLowerCase();
    if (constraint === 'bedtime') return 'bedtime';
    if (constraint === 'fasted') return 'morning';
    if (constraint === 'with_food' || constraint === 'with_fats') return 'noon'; // With meals
    if (constraint === 'pre_workout') return 'pre_workout';
    if (constraint === 'post_workout') return 'post_workout';
    // 'any' falls through to common_timing
  }

  // 2. Fall back to common_timing
  if (commonTiming?.length) {
    const first = commonTiming[0]?.toLowerCase();
    if (first?.includes('morgen') || first?.includes('nüchtern') || first === 'morning') return 'morning';
    if (first?.includes('mittag') || first === 'noon') return 'noon';
    if (first?.includes('nachmittag') || first === 'afternoon') return 'afternoon';
    if (first?.includes('abend') || first?.includes('nacht') || first === 'evening') return 'evening';
    if (first?.includes('schlaf') || first === 'bedtime') return 'bedtime';
    if (first?.includes('vor training') || first === 'pre_workout') return 'pre_workout';
    if (first?.includes('nach training') || first === 'post_workout') return 'post_workout';
  }

  return 'morning'; // Default fallback
}

// Legacy wrapper for backward compatibility
function mapCommonTimingToPreferred(commonTiming: string[]): PreferredTiming {
  return mapTimingToPreferred(null, commonTiming);
}

// Toggle supplement activation (add/remove from user stack)
export const useSupplementToggle = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  const toggleSupplement = async (item: SupplementLibraryItem, activate: boolean) => {
    if (!user?.id) return;

    setIsToggling(true);
    try {
      if (activate) {
        // Smart timing: Use timing_constraint (most specific) with common_timing fallback
        const preferredTiming = mapTimingToPreferred(item.timing_constraint, item.common_timing);
        const schedule = item.cycling_required
          ? parseScheduleFromProtocol(item.cycling_protocol)
          : { type: 'daily' as const };

        const { error } = await supabase.from('user_supplements').upsert(
          {
            user_id: user.id,
            supplement_id: item.id,
            name: item.name,
            dosage: item.default_dosage || '',
            unit: item.default_unit || 'mg',
            preferred_timing: preferredTiming,
            timing: [preferredTiming], // Use mapped timing for consistency with SmartFocusCard
            schedule: schedule as any,
            is_active: true,
          },
          { onConflict: 'user_id,supplement_id' }
        );

        if (error) throw error;
        toast.success(`${item.name} aktiviert`);
      } else {
        // Deactivate (don't delete - user might want to reactivate)
        const { error } = await supabase
          .from('user_supplements')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('supplement_id', item.id);

        if (error) throw error;
        toast.success(`${item.name} pausiert`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: SUPPLEMENT_LIBRARY_KEYS.userStack(user.id) });
      window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
    } catch (err) {
      console.error('Error toggling supplement:', err);
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setIsToggling(false);
    }
  };

  return { toggleSupplement, isToggling };
};

// Auto-activate all essentials for onboarding
export const useAutoActivateEssentials = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: phaseSupplements } = useSupplementsByPhase(0); // Phase 0 = Foundation
  const [isActivating, setIsActivating] = useState(false);

  const activateEssentials = async () => {
    if (!user?.id || !phaseSupplements?.essentials?.length) {
      toast.error('Keine Essentials gefunden');
      return;
    }

    setIsActivating(true);
    try {
      const inserts = phaseSupplements.essentials.map((item) => ({
        user_id: user.id,
        supplement_id: item.id,
        name: item.name,
        dosage: item.default_dosage || '',
        unit: item.default_unit || 'mg',
        preferred_timing: mapTimingToPreferred(item.timing_constraint, item.common_timing),
        timing: [mapTimingToPreferred(item.timing_constraint, item.common_timing)], // Use mapped timing for consistency
        schedule: { type: 'daily' as const } as any,
        is_active: true,
      }));

      const { error } = await supabase
        .from('user_supplements')
        .upsert(inserts, { onConflict: 'user_id,supplement_id' });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: SUPPLEMENT_LIBRARY_KEYS.userStack(user.id) });
      window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
      toast.success(`${inserts.length} Essentials aktiviert!`);
    } catch (err) {
      console.error('Error activating essentials:', err);
      toast.error('Fehler beim Aktivieren');
    } finally {
      setIsActivating(false);
    }
  };

  return { activateEssentials, isActivating, essentialsCount: phaseSupplements?.essentials?.length || 0 };
};

// =====================================================
// Update & Delete Supplement Hooks
// =====================================================

// Update a user's supplement
export const useUpdateSupplement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateSupplement = async (
    supplementId: string, 
    updates: {
      dosage?: string;
      unit?: string;
      preferred_timing?: PreferredTiming;
      notes?: string | null;
      schedule?: { type: string; cycle_on_days?: number; cycle_off_days?: number; start_date?: string };
    }
  ): Promise<void> => {
    if (!user?.id) throw new Error('Not authenticated');

    // Cast schedule to Json-compatible type
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.dosage !== undefined) updateData.dosage = updates.dosage;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.preferred_timing !== undefined) updateData.preferred_timing = updates.preferred_timing;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.schedule !== undefined) updateData.schedule = updates.schedule;

    const { error } = await supabase
      .from('user_supplements')
      .update(updateData)
      .eq('id', supplementId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: SUPPLEMENT_LIBRARY_KEYS.userStack(user.id) });
    window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
    toast.success('Änderungen gespeichert');
  };

  return { updateSupplement };
};

// Delete (deactivate) a user's supplement
export const useDeleteSupplement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const deleteSupplement = async (supplementId: string): Promise<void> => {
    if (!user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_supplements')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', supplementId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: SUPPLEMENT_LIBRARY_KEYS.userStack(user.id) });
    window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
    toast.success('Supplement entfernt');
  };

  return { deleteSupplement };
};
