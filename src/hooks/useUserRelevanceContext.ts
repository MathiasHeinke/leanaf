// =====================================================
// ARES Matrix-Scoring: User Relevance Context Hook (Extended v2)
// =====================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserRelevanceContext } from '@/types/relevanceMatrix';
import { 
  GLP1_AGENTS, 
  TRT_AGENTS, 
  getPeptideCategories 
} from '@/types/relevanceMatrix';

/**
 * Hook to aggregate user context for relevance scoring
 * Fetches and combines data from profiles, peptide_protocols, user_bloodwork, user_protocol_status, daily_goals
 */
export function useUserRelevanceContext(): {
  context: UserRelevanceContext | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { user } = useAuth();
  
  // Fetch user profile for protocol_mode, goal, demographics
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile-relevance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('protocol_mode, goal_type, age, gender, weight, target_weight')
        .eq('user_id', user.id)  // FIX: user_id statt id
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch user protocol status for current phase
  const { data: protocolStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['user-protocol-status-relevance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_protocol_status')
        .select('current_phase')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
  
  // Fetch active peptide protocols
  const { data: peptideProtocols, isLoading: peptidesLoading } = useQuery({
    queryKey: ['user-peptides-relevance', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('peptide_protocols')
        .select('peptides, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
  
  // Fetch latest bloodwork (last 90 days)
  const { data: bloodwork, isLoading: bloodworkLoading } = useQuery({
    queryKey: ['user-bloodwork-relevance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data, error } = await supabase
        .from('user_bloodwork')
        .select('*')
        .eq('user_id', user.id)
        .gte('test_date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  // Fetch daily goals for calorie deficit info
  const { data: dailyGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['user-daily-goals-relevance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('daily_goals')
        .select('calorie_deficit, goal_type')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
  
  // Compute the context
  const context = useMemo<UserRelevanceContext | null>(() => {
    if (!user?.id) return null;
    
    // Parse protocol modes (comma-separated)
    const protocolModeStr = profile?.protocol_mode || 'natural';
    const protocolModes = protocolModeStr.split(',').map(m => m.trim().toLowerCase());
    
    // Extract peptide names from active protocols
    const activePeptideNames: string[] = [];
    for (const protocol of peptideProtocols || []) {
      const peptides = protocol.peptides as Array<{ name: string; dose?: number; unit?: string }> | null;
      if (peptides && Array.isArray(peptides)) {
        for (const pep of peptides) {
          if (pep.name) {
            activePeptideNames.push(pep.name.toLowerCase());
          }
        }
      }
    }
    
    // Determine TRT status
    const isOnTRT = protocolModes.includes('clinical') || 
      activePeptideNames.some(p => 
        TRT_AGENTS.some(agent => p.includes(agent))
      );
    
    // Determine GLP-1 status
    const isOnGLP1 = activePeptideNames.some(p =>
      GLP1_AGENTS.some(agent => p.includes(agent))
    );
    
    // Has any active peptides (excluding TRT compounds)
    const hasActivePeptides = activePeptideNames.length > 0;
    
    // Compute core flags
    const isTrueNatural = protocolModes.includes('natural') && 
                           !hasActivePeptides && 
                           !isOnTRT;
    
    const isEnhancedNoTRT = hasActivePeptides && !isOnTRT;
    
    // Generate bloodwork flags
    const bloodworkFlags = generateBloodworkFlags(bloodwork);
    
    // Get phase (default to 0)
    const phase = (protocolStatus?.current_phase ?? 0) as 0 | 1 | 2 | 3;
    
    // Determine caloric status
    const calorieStatus = determineCalorieStatus(
      profile?.weight || null,
      profile?.target_weight || null,
      dailyGoals?.calorie_deficit || null
    );
    
    // Get demographic flags
    const age = profile?.age || null;
    const gender = profile?.gender || null;
    
    // Get active peptide classes
    const activePeptideClasses = getPeptideCategories(activePeptideNames);
    
    // Estimate daily protein per kg based on available data
    // TODO: Connect to actual nutrition logs when available
    let estimatedProteinPerKg = 1.5; // Baseline
    if (phase === 3) estimatedProteinPerKg = 1.8; // Mastery phase
    if (profile?.goal_type === 'muscle_gain') estimatedProteinPerKg = 2.0;
    if (protocolModes.includes('enhanced') || protocolModes.includes('clinical')) {
      estimatedProteinPerKg = 2.2; // Higher protein needs with peptides/TRT
    }
    
    // Data Confidence v2: Profile completeness checks
    const hasBloodworkData = bloodworkFlags.length > 0;
    const hasBasicProfile = !!(profile?.age && (profile?.goal_type || dailyGoals?.goal_type) && profile?.weight);
    
    // Track specifically what's missing for UI hints
    const missingProfileFields: string[] = [];
    if (!profile?.age) missingProfileFields.push('age');
    if (!profile?.gender) missingProfileFields.push('gender');
    if (!profile?.weight) missingProfileFields.push('weight');
    if (!profile?.goal_type && !dailyGoals?.goal_type) missingProfileFields.push('goal');
    
    const profileCompleteness: 'full' | 'basic' | 'minimal' = 
      hasBloodworkData ? 'full' :
      hasBasicProfile ? 'basic' :
      'minimal';
    
    return {
      isTrueNatural,
      isEnhancedNoTRT,
      isOnTRT,
      isOnGLP1,
      isInDeficit: calorieStatus === 'deficit',
      isInSurplus: calorieStatus === 'surplus',
      ageOver40: age !== null && age >= 40,
      ageOver50: age !== null && age >= 50,
      ageOver60: age !== null && age >= 60,
      isFemale: gender === 'female',
      isMale: gender === 'male',
      activePeptideClasses,
      phase,
      protocolModes,
      activePeptides: activePeptideNames,
      goal: profile?.goal_type || dailyGoals?.goal_type || 'maintenance',
      bloodworkFlags,
      dailyProteinPerKg: estimatedProteinPerKg,
      // Data Confidence v2
      hasBloodworkData,
      hasBasicProfile,
      profileCompleteness,
      missingProfileFields,
    };
  }, [user?.id, profile, protocolStatus, peptideProtocols, bloodwork, dailyGoals]);
  
  const isLoading = profileLoading || statusLoading || peptidesLoading || bloodworkLoading || goalsLoading;
  
  return {
    context,
    isLoading,
    error: null,
  };
}

/**
 * Determine caloric status based on available data
 */
function determineCalorieStatus(
  currentWeight: number | null,
  targetWeight: number | null,
  calorieDeficit: number | null
): 'deficit' | 'surplus' | 'maintenance' {
  // Primary: Direct deficit field from daily_goals
  if (calorieDeficit !== null) {
    if (calorieDeficit > 200) return 'deficit';
    if (calorieDeficit < -200) return 'surplus';
    return 'maintenance';
  }
  
  // Fallback: Weight comparison
  if (currentWeight && targetWeight) {
    const diff = currentWeight - targetWeight;
    if (diff > 2) return 'deficit';  // Wants to lose weight
    if (diff < -2) return 'surplus'; // Wants to gain weight
  }
  
  return 'maintenance';
}

/**
 * Generate bloodwork flags from latest bloodwork data
 */
function generateBloodworkFlags(bw: Record<string, unknown> | null): string[] {
  if (!bw) return [];
  const flags: string[] = [];
  
  // Hormones
  const cortisol = bw.cortisol as number | null;
  if (cortisol && cortisol > 25) flags.push('cortisol_high');
  
  const totalTestosterone = bw.total_testosterone as number | null;
  if (totalTestosterone && totalTestosterone < 300) flags.push('testosterone_low');
  
  const dheaS = bw.dhea_s as number | null;
  if (dheaS && dheaS < 100) flags.push('dhea_low');
  
  // Lipids
  const hdl = bw.hdl as number | null;
  if (hdl && hdl < 40) flags.push('hdl_low');
  
  const ldl = bw.ldl as number | null;
  if (ldl && ldl > 130) flags.push('ldl_high');
  
  const triglycerides = bw.triglycerides as number | null;
  if (triglycerides && triglycerides > 150) flags.push('triglycerides_high');
  
  const apob = bw.apob as number | null;
  if (apob && apob > 100) flags.push('apob_high');
  
  // Vitamins/Minerals
  const vitaminD = bw.vitamin_d as number | null;
  if (vitaminD && vitaminD < 30) flags.push('vitamin_d_low');
  
  const vitaminB12 = bw.vitamin_b12 as number | null;
  if (vitaminB12 && vitaminB12 < 400) flags.push('b12_low');
  
  const magnesium = bw.magnesium as number | null;
  if (magnesium && magnesium < 0.85) flags.push('magnesium_low');
  
  const ferritin = bw.ferritin as number | null;
  if (ferritin && ferritin > 300) flags.push('ferritin_high');
  
  const iron = bw.iron as number | null;
  if (iron && iron < 60) flags.push('iron_low');
  
  // Metabolic
  const fastingGlucose = bw.fasting_glucose as number | null;
  if (fastingGlucose && fastingGlucose > 100) flags.push('glucose_high');
  
  const hba1c = bw.hba1c as number | null;
  if (hba1c && hba1c > 5.7) flags.push('hba1c_elevated');
  
  const insulin = bw.insulin as number | null;
  if (insulin && insulin > 10) flags.push('insulin_high');
  
  const homaIr = bw.homa_ir as number | null;
  if (homaIr && homaIr > 2.5) flags.push('insulin_resistant');
  
  // Inflammation
  const hsCrp = bw.hs_crp as number | null;
  if (hsCrp && hsCrp > 1) flags.push('inflammation_high');
  
  const homocysteine = bw.homocysteine as number | null;
  if (homocysteine && homocysteine > 10) flags.push('homocysteine_high');
  
  // Thyroid
  const tsh = bw.tsh as number | null;
  if (tsh && tsh > 4) flags.push('thyroid_slow');
  if (tsh && tsh < 0.5) flags.push('thyroid_overactive');
  
  return flags;
}

/**
 * Helper hook to get a summarized context description for UI
 */
export function useContextSummary(): string {
  const { context } = useUserRelevanceContext();
  
  if (!context) return 'Lade...';
  
  const parts: string[] = [];
  
  if (context.isTrueNatural) {
    parts.push('Natural');
  } else if (context.isOnTRT) {
    parts.push('TRT');
    if (context.isOnGLP1) parts.push('+ GLP-1');
  } else if (context.isEnhancedNoTRT) {
    parts.push('Peptide');
    if (context.isOnGLP1) parts.push('(GLP-1)');
  }
  
  parts.push(`Phase ${context.phase}`);
  
  // Add caloric status
  if (context.isInDeficit) {
    parts.push('Defizit');
  } else if (context.isInSurplus) {
    parts.push('Aufbau');
  }
  
  // Add peptide classes if any
  if (context.activePeptideClasses.length > 0) {
    parts.push(`${context.activePeptideClasses.length} Peptid-Klassen`);
  }
  
  if (context.bloodworkFlags.length > 0) {
    parts.push(`${context.bloodworkFlags.length} Blutwert-Trigger`);
  }
  
  return parts.join(' · ');
}
