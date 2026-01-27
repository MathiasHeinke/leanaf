import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { addMonths, differenceInWeeks, format } from 'date-fns';
import { calculateRealismScore as calculateRealismScoreFromUtils, getRealismLabel, getRealismVariant, type ProtocolTempo } from '@/utils/realismCalculator';
import { calculateProteinAnchorMacros, isProtocolIntensity, mapLegacyStrategy, type ProtocolIntensity } from '@/utils/proteinAnchorCalculator';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Target, Save, Check, Bot, Settings, Zap, Activity, Dumbbell, Heart, TrendingUp, AlertCircle, CheckCircle, User, MessageSquare, PieChart, Calculator, Brain, TrendingDown, Info, AlertTriangle, CheckCircle2, CalendarIcon, Droplets } from 'lucide-react';
import { FluidGoalSlider } from '@/components/ui/fluid-goal-slider';
import { GoalConfigurator, type MuscleGoal } from '@/components/profile/GoalConfigurator';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { intelligentCalorieCalculator, type CalorieCalculationResult } from '@/utils/intelligentCalorieCalculator';
import { TrackingPreferences } from '@/components/TrackingPreferences';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { ProfileFieldIndicator } from '@/components/ProfileFieldIndicator';
import { MedicalScreening } from '@/components/MedicalScreening';
import { AvatarSelector } from '@/components/AvatarSelector';
import { PersonaSelector } from '@/components/persona';
import { ProfileLoadingGuard } from '@/components/ProfileLoadingGuard';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';


interface ProfilePageProps {
  onClose?: () => void;
}

const Profile = ({ onClose }: ProfilePageProps) => {
  const [preferredName, setPreferredName] = useState('');
  const { t } = useTranslation();
  
  const [weight, setWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  // NEW: Protocol-driven goal states (replacing targetWeight, targetDate, goalType, targetBodyFat)
  const [weightDelta, setWeightDelta] = useState(0);
  const [muscleGoal, setMuscleGoal] = useState<MuscleGoal>('maintain');
  const [protocolTempo, setProtocolTempo] = useState<ProtocolTempo>('standard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dailyGoals, setDailyGoals] = useState({
    calories: 2000,
    protein: 30,
    carbs: 40,
    fats: 30,
    calorieDeficit: 300
  });
  const [profileExists, setProfileExists] = useState(false);
  const [intelligentCalories, setIntelligentCalories] = useState<CalorieCalculationResult | null>(null);
  const [hasUserModifiedMacros, setHasUserModifiedMacros] = useState(false);
  
  // Coach Settings State
  const [coachPersonality, setCoachPersonality] = useState('motivierend');
  const [muscleMaintenancePriority, setMuscleMaintenancePriority] = useState(false);
  const [macroStrategy, setMacroStrategy] = useState('warrior');
  
  const { user } = useAuth();
  const { language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { completionStatus, isProfileComplete: profileComplete, refreshCompletion } = useProfileCompletion();
  
  // Enhanced loading state management
  const [profileLoadingState, setProfileLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  // State for profile completion validation and success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // REMOVED: Legacy percentage states - now using Protein Anchor System (currentMacros)

  // Avatar state
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [avatarType, setAvatarType] = useState<'preset' | 'uploaded'>('preset');
  
  // Water goal state
  const [fluidGoalMl, setFluidGoalMl] = useState(2500);
  const [avatarPresetId, setAvatarPresetId] = useState('');

  // ============= Computed Values from Protocol States =============
  const computedTargetWeight = useMemo(() => {
    const currentW = parseFloat(weight) || 80;
    return currentW + weightDelta;
  }, [weight, weightDelta]);

  const computedTargetDate = useMemo(() => {
    const months = { sustainable: 12, standard: 6, aggressive: 4 };
    return addMonths(new Date(), months[protocolTempo]);
  }, [protocolTempo]);

  const computedGoal = useMemo(() => {
    if (weightDelta < -1) return 'lose';
    if (weightDelta > 1) return 'gain';
    return 'maintain';
  }, [weightDelta]);

  // Formatted target date string for DB
  const targetDateStr = useMemo(() => format(computedTargetDate, 'yyyy-MM-dd'), [computedTargetDate]);

  // Check if profile is complete for validation
  const isProfileComplete = weight && height && age && gender && activityLevel && goal;

  // Validate required fields and update visual feedback
  useEffect(() => {
    const errors: Record<string, string> = {};
    if (!weight) errors.weight = 'Gewicht ist erforderlich';
    if (!height) errors.height = 'Größe ist erforderlich';
    if (!age) errors.age = 'Alter ist erforderlich';
    if (!gender) errors.gender = 'Geschlecht ist erforderlich';
    if (!activityLevel) errors.activityLevel = 'Aktivitätslevel ist erforderlich';
    if (!goal) errors.goal = 'Ziel ist erforderlich';
    
    setValidationErrors(errors);
  }, [weight, height, age, gender, activityLevel, goal]);

  // REMOVED: Legacy useEffect for percentage mapping - now using Protein Anchor System

  // Auto-save function
  const autoSave = async () => {
    if (!user || autoSaving) return;
    
    setAutoSaving(true);
    try {
      await performSave();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user && !initialLoading) {
        autoSave();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [
    preferredName, weight, startWeight, height, age, gender, 
    activityLevel, goal, weightDelta, protocolTempo, muscleGoal, language,
    dailyGoals.calories, dailyGoals.protein, dailyGoals.carbs, 
    dailyGoals.fats, dailyGoals.calorieDeficit,
    coachPersonality, muscleMaintenancePriority, macroStrategy,
    profileAvatarUrl, avatarType, avatarPresetId,
    fluidGoalMl
  ]);

  useEffect(() => {
    if (user?.id) {
      console.log('🔄 Profile page loading data for user:', user.email);
      setProfileLoadingState('loading');
      
      Promise.all([
        loadProfile(),
        loadDailyGoals(),
        loadCurrentWeight(),
        calculateIntelligentCalories()
      ]).then(() => {
        setProfileLoadingState('loaded');
        console.log('✅ Profile page data loading complete');
      }).catch((error) => {
        console.error('❌ Profile page data loading failed:', error);
        setProfileLoadingState('error');
      });
    } else {
      setProfileLoadingState('idle');
    }
  }, [user?.id]);

  // Recalculate when relevant data changes
  useEffect(() => {
    if (user && weight && height && age && gender) {
      calculateIntelligentCalories();
    }
  }, [weight, height, age, gender, activityLevel, goal, dailyGoals.calorieDeficit]);

  const loadProfile = async () => {
    if (!user?.id) {
      console.log('⏳ Skipping profile load - no user ID available');
      return;
    }
    
    try {
      console.log('🔄 Loading profile for user:', user?.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📋 Profile data loaded:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Profile loading error:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Profile data found, populating fields:', {
          weight: data.weight,
          height: data.height,
          age: data.age,
          gender: data.gender
        });
        
        setProfileExists(true);
        setPreferredName(data.preferred_name || '');
        setWeight(data.weight ? data.weight.toString() : '');
        setStartWeight(data.start_weight ? data.start_weight.toString() : '');
        setHeight(data.height ? data.height.toString() : '');
        setAge(data.age ? data.age.toString() : '');
        setGender(data.gender || '');
        setActivityLevel(data.activity_level || 'moderate');
        setGoal(data.goal || 'maintain');
        // Migrate from legacy targetWeight/targetDate to new protocol system
        if (data.target_weight && data.weight) {
          setWeightDelta(data.target_weight - data.weight);
        }
        if (data.target_date) {
          const weeksToTarget = differenceInWeeks(new Date(data.target_date), new Date());
          if (weeksToTarget >= 48) setProtocolTempo('sustainable');
          else if (weeksToTarget >= 20) setProtocolTempo('standard');
          else setProtocolTempo('aggressive');
        }
        // Set muscle goal from legacy field
        setMuscleGoal(data.muscle_maintenance_priority ? 'maintain' : 'build');
        setCoachPersonality(data.coach_personality || 'motivierend');
        setMuscleMaintenancePriority(data.muscle_maintenance_priority || false);
        setMacroStrategy(data.macro_strategy || 'warrior');
        setProfileAvatarUrl(data.profile_avatar_url || '');
        setAvatarType((data.avatar_type as 'preset' | 'uploaded') || 'preset');
        setAvatarPresetId(data.avatar_preset_id || '');
        if (data.preferred_language) {
          setLanguage(data.preferred_language);
        }
        
        console.log('✅ Profile fields populated successfully');
      } else {
        console.log('⚠️ No profile data found, using defaults');
        setProfileExists(false);
        // Set default strategy to high_protein for new users
        setMacroStrategy('warrior');
      }
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadDailyGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setDailyGoals({
          calories: data.calories || 2000,
          protein: data.protein_percentage || 30,
          carbs: data.carbs_percentage || 40,
          fats: data.fats_percentage || 30,
          calorieDeficit: data.calorie_deficit || 300
        });
        // Load fluid goal
        setFluidGoalMl(data.fluid_goal_ml || 2500);
      } else {
        // Set High Protein as fallback for new users
        setDailyGoals({
          calories: 2000,
          protein: 50,
          carbs: 20,
          fats: 30,
          calorieDeficit: 300
        });
        setFluidGoalMl(2500);
      }
    } catch (error: any) {
      console.error('Error loading daily goals:', error);
    }
  };

  const loadCurrentWeight = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('weight, date')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading weight history:', error);
        return;
      }

      if (data && data.weight) {
        setWeight(data.weight.toString());
      }
    } catch (error: any) {
      console.error('Error loading current weight:', error);
    }
  };

  const calculateIntelligentCalories = async () => {
    if (!user || !weight || !height || !age || !gender) return;
    
    try {
      const result = await intelligentCalorieCalculator.calculateIntelligentCalories(user.id, {
        weight: parseFloat(weight),
        height: parseInt(height),
        age: parseInt(age),
        gender: gender as 'male' | 'female',
        activityLevel,
        goal: goal as 'lose' | 'maintain' | 'gain',
        calorieDeficit: calculateRequiredCalorieDeficit()?.daily || dailyGoals.calorieDeficit
      });
      
      setIntelligentCalories(result);
      
      // Update daily goals with intelligent calculation (but don't override user-modified macros)
      setDailyGoals(prev => ({
        ...prev,
        calories: result.targetCalories
      }));
    } catch (error) {
      console.error('Error calculating intelligent calories:', error);
    }
  };

  const calculateBMR = () => {
    if (!weight || !height || !age || !gender) return null;
    
    const w = parseFloat(weight);
    const h = parseInt(height);
    const a = parseInt(age);
    
    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      return (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      return (10 * w) + (6.25 * h) - (5 * a) - 161;
    }
  };

  const calculateMaintenanceCalories = () => {
    const bmr = calculateBMR();
    if (!bmr) return null;
    
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    
    return Math.round(bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers]);
  };

  const calculateTargetCalories = () => {
    const maintenance = calculateMaintenanceCalories();
    if (!maintenance) return 2000;
    
    const multiplier = goal === 'lose' ? -1 : goal === 'gain' ? 1 : 0;
    const effectiveCalorieDeficit = calculateRequiredCalorieDeficit()?.daily || dailyGoals.calorieDeficit;
    return maintenance + (multiplier * effectiveCalorieDeficit);
  };

  const calculateMacroGrams = () => {
    // Nutze das Protein Anchor System (currentMacros) statt alte Prozent-Logik
    return {
      protein: currentMacros.proteinGrams,
      carbs: currentMacros.carbGrams,
      fats: currentMacros.fatGrams,
    };
  };

  const calculateRequiredCalorieDeficit = () => {
    if (!weight || weightDelta === 0) return null;
    
    const currentWeight = parseFloat(weight);
    const goalWeight = computedTargetWeight;
    const weightDiff = Math.abs(currentWeight - goalWeight);
    const today = new Date();
    const timeDiff = Math.max(0, (computedTargetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (timeDiff <= 0) return null;
    
    const totalCalorieDeficit = weightDiff * 7700;
    const dailyCalorieDeficit = Math.round(totalCalorieDeficit / timeDiff);
    
    // Check if user wants to gain weight
    const isGaining = weightDelta > 0;
    
    return {
      daily: dailyCalorieDeficit,
      weekly: Math.round(dailyCalorieDeficit * 7),
      total: Math.round(totalCalorieDeficit),
      isGaining: isGaining
    };
  };

  // Calculate realism score using unified calculator
  const calculateRealismScore = () => {
    if (!weight || weightDelta === 0) return 100;
    
    return calculateRealismScoreFromUtils({
      currentWeight: parseFloat(weight),
      targetWeight: computedTargetWeight,
      currentBodyFat: undefined,
      targetBodyFat: undefined,
      targetDate: computedTargetDate,
      protocolTempo,
    });
  };

  const realismScore = calculateRealismScore();

  // ============= Protein Anchor System =============
  
  // Derive current intensity from macroStrategy (handle legacy values)
  const currentIntensity: ProtocolIntensity = useMemo(() => {
    if (isProtocolIntensity(macroStrategy)) {
      return macroStrategy;
    }
    return mapLegacyStrategy(macroStrategy);
  }, [macroStrategy]);

  // Calculate macros using Protein Anchor logic
  const currentMacros = useMemo(() => {
    const weightNum = parseFloat(weight) || 80;
    const calories = calculateTargetCalories() || 2000;
    return calculateProteinAnchorMacros(currentIntensity, weightNum, calories);
  }, [weight, currentIntensity, calculateTargetCalories]);

  // Handler for intensity change
  const handleIntensityChange = useCallback((intensity: ProtocolIntensity) => {
    setMacroStrategy(intensity);
    
    const weightNum = parseFloat(weight) || 80;
    const calories = calculateTargetCalories() || 2000;
    const result = calculateProteinAnchorMacros(intensity, weightNum, calories);
    
    // Update dailyGoals with calculated percentages (DB compatibility)
    setDailyGoals(prev => ({
      ...prev,
      protein: result.proteinPercent,
      carbs: result.carbPercent,
      fats: result.fatPercent
    }));
    
    setHasUserModifiedMacros(false);
  }, [weight]);

  // ============= End Protein Anchor System =============

  const applyMacroStrategy = (strategy: string) => {
    // Only apply strategy if user hasn't manually modified macros
    if (hasUserModifiedMacros) {
      return;
    }
    
    const strategies = {
      high_protein: { protein: 50, carbs: 20, fats: 30 },
      high_carb: { protein: 20, carbs: 50, fats: 30 },
      low_carb: { protein: 30, carbs: 20, fats: 50 }
    };
    
    const macros = strategies[strategy as keyof typeof strategies];
    if (macros) {
      setDailyGoals(prev => ({
        ...prev,
        protein: macros.protein,
        carbs: macros.carbs,  
        fats: macros.fats
      }));
    }
  };

  const performSave = async () => {
    if (!user) return;

    const bmr = calculateBMR();
    const tdee = calculateMaintenanceCalories();
    const targetCalories = calculateTargetCalories();
    const macroGrams = calculateMacroGrams();

    // Debug logging for calculated values
    console.log('🔍 Profile Save Debug:', {
      weight: weight,
      height: height,
      age: age,
      gender: gender,
      bmr: bmr,
      tdee: tdee,
      targetCalories: targetCalories,
      macroGrams: macroGrams
    });

    // Validation der berechneten Werte
    if (!targetCalories || isNaN(targetCalories) || targetCalories <= 0) {
      throw new Error(`Ungültige Kalorienziel-Berechnung: ${targetCalories}. Bitte überprüfe Gewicht (${weight}kg), Größe (${height}cm), Alter (${age}) und Geschlecht (${gender}).`);
    }

    if (!macroGrams.protein || isNaN(macroGrams.protein) || macroGrams.protein <= 0) {
      throw new Error(`Ungültige Protein-Berechnung: ${macroGrams.protein}g. Basierend auf Kalorienziel: ${targetCalories}`);
    }

    if (!macroGrams.carbs || isNaN(macroGrams.carbs) || macroGrams.carbs < 0) {
      throw new Error(`Ungültige Kohlenhydrat-Berechnung: ${macroGrams.carbs}g. Basierend auf Kalorienziel: ${targetCalories}`);
    }

    if (!macroGrams.fats || isNaN(macroGrams.fats) || macroGrams.fats <= 0) {
      throw new Error(`Ungültige Fett-Berechnung: ${macroGrams.fats}g. Basierend auf Kalorienziel: ${targetCalories}`);
    }

    console.log('✅ Alle berechneten Werte sind gültig, speichere Profil...');

    const profileData = {
      user_id: user.id,
      preferred_name: preferredName,
      weight: weight ? parseFloat(weight) : null,
      start_weight: startWeight ? parseFloat(startWeight) : null,
      height: height ? parseInt(height) : null,
      age: age ? parseInt(age) : null,
      gender: gender || null,
      activity_level: activityLevel,
      goal: computedGoal,
      target_weight: computedTargetWeight,
      target_date: targetDateStr,
      goal_type: 'weight',
      target_body_fat_percentage: null,
      preferred_language: language,
      coach_personality: coachPersonality,
      muscle_maintenance_priority: muscleGoal === 'maintain',
      macro_strategy: macroStrategy,
      profile_avatar_url: profileAvatarUrl || null,
      avatar_type: avatarType,
      avatar_preset_id: avatarPresetId || null,
      // Save calculated target values to profiles table
      daily_calorie_target: targetCalories,
      protein_target_g: macroGrams.protein,
      carbs_target_g: macroGrams.carbs,
      fats_target_g: macroGrams.fats,
      // Add BMR, TDEE and other calculated values
      bmr: bmr ? Math.round(bmr) : null,
      tdee: tdee ? Math.round(tdee) : null,
      calorie_deficit: calculateRequiredCalorieDeficit()?.daily || null,
      protein_percentage: dailyGoals.protein,
      carbs_percentage: dailyGoals.carbs,
      fats_percentage: dailyGoals.fats,
      // Protocol tempo is derived from target_date, no extra column needed
    };

    if (profileExists) {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert(profileData);

      if (error) throw error;
      setProfileExists(true);
    }

    // Calculate additional values for daily goals
    const deficitData = calculateRequiredCalorieDeficit();
    const isGainingWeight = weightDelta > 0;
    const currentGoalType = weightDelta === 0 ? 'maintain' : (isGainingWeight ? 'gain' : 'lose');
    
    // Calculate additional metrics
    const daysToGoal = deficitData ? 
      Math.max(0, Math.ceil((computedTargetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null;
    const weeksToGoal = daysToGoal ? Math.ceil(daysToGoal / 7) : null;
    const weeklyFatLossGrams = deficitData?.weekly ? Math.round(deficitData.weekly / 7700 * 1000) : null;
    
    const { error: goalsError } = await supabase
      .from('daily_goals')
      .upsert({
        user_id: user.id,
        goal_date: new Date().toISOString().slice(0, 10),
        calories: targetCalories,
        protein: macroGrams.protein,
        carbs: macroGrams.carbs,
        fluid_goal_ml: fluidGoalMl,
        fats: macroGrams.fats,
        calorie_deficit: deficitData?.daily || dailyGoals.calorieDeficit,
        protein_percentage: dailyGoals.protein,
        carbs_percentage: dailyGoals.carbs,
        fats_percentage: dailyGoals.fats,
        bmr: bmr ? Math.round(bmr) : null,
        tdee: tdee,
        // Add all calculated tracking values
        weight_difference_kg: weightDelta,
        weeks_to_goal: weeksToGoal,
        days_to_goal: daysToGoal,
        weekly_calorie_deficit: deficitData?.weekly || null,
        total_calories_needed: deficitData?.total || null,
        weekly_fat_loss_g: weeklyFatLossGrams,
        target_date: targetDateStr,
        is_gaining_weight: isGainingWeight,
        goal_type: currentGoalType,
        is_realistic_goal: realismScore >= 60,
        warning_message: realismScore < 60 ? getRealismLabel(realismScore, protocolTempo) : null,
      }, {
        onConflict: 'user_id,goal_date'
      });

    if (goalsError) {
      throw goalsError;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await performSave();
      
      // Refresh current weight after saving
      await loadCurrentWeight();
      
      // Trigger dashboard refresh by calling ensure_daily_goals with updated profile values
      try {
        await supabase.rpc('ensure_daily_goals', { user_id_param: user.id });
        console.log('✅ Dashboard goals refreshed with new profile values');
      } catch (refreshError) {
        console.warn('⚠️ Dashboard refresh failed:', refreshError);
      }
      
      // AKTIVER Refetch statt nur Invalidation - Cache wird sofort aktualisiert
      // auch wenn kein Observer aktiv ist (User ist noch auf Profil-Seite)
      await Promise.all([
        queryClient.refetchQueries({ queryKey: QUERY_KEYS.DAILY_METRICS }),
        queryClient.refetchQueries({ queryKey: QUERY_KEYS.USER_PROFILE })
      ]);
      // Strategy-Query für NutritionWidget Badge invalidieren
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE_STRATEGY });
      
      // Trigger legacy event system for usePlusData to ensure homescreen updates
      const { triggerDataRefresh } = await import('@/hooks/useDataRefresh');
      triggerDataRefresh();
      
      toast.success('Profil erfolgreich gespeichert');
      setLastSaved(new Date());
      setSaveSuccess(true);
      
      // Notify ActionCardStack that profile was completed
      window.dispatchEvent(new CustomEvent('ares-card-completed', { 
        detail: { cardType: 'profile' }
      }));
      
      // Check if profile is complete and show success dialog for first-time users
      if (isProfileComplete && !profileExists) {
        setShowSuccessDialog(true);
      }
      
      // Hide success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Fehler beim Speichern des Profils');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate values for display
  const bmr = calculateBMR();
  const tdee = calculateMaintenanceCalories();
  const targetCalories = calculateTargetCalories();
  const calorieDeficit = calculateRequiredCalorieDeficit()?.daily || dailyGoals.calorieDeficit;
  // Use Protein Anchor System for gram calculations
  const proteinGrams = currentMacros.proteinGrams;
  const carbsGrams = currentMacros.carbGrams;
  const fatsGrams = currentMacros.fatGrams;

  const handleSuccessDialogContinue = () => {
    setShowSuccessDialog(false);
    navigate('/');
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lädt Profildaten...</p>
        </div>
      </div>
    );
  }

  // Debug info - show current state
  const debugInfo = {
    user: !!user,
    profileExists,
    hasBasicData: !!(weight && height && age && gender),
    weight,
    height,
    age,
    gender
  };
  console.log('🔍 Profile Debug Info:', debugInfo);

  return (
    <>

      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-6 pb-20">
        
        {/* 1. Personal Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Persönliche Daten bearbeiten</h2>
          </div>


          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Startgewicht</Label>
                  <NumericInput
                    value={startWeight}
                    onChange={(value) => {
                      const newStartWeight = value;
                      setStartWeight(newStartWeight);
                      // Auto-set current weight after delay if it's empty (first time setup)
                      if (!weight && newStartWeight) {
                        setTimeout(() => {
                          setWeight(newStartWeight);
                        }, 300);
                      }
                    }}
                    placeholder="75"
                    className={cn("mt-1", validationErrors.startWeight && "border-red-500")}
                  />
                </div>
                <div>
                  <Label className="text-sm">Aktuelles Gewicht</Label>
                  <div className="relative">
                    <Input
                      value={weight}
                      disabled={true}
                      placeholder="75"
                      className={cn("mt-1 bg-muted", validationErrors.weight && "border-red-500")}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Wird automatisch aus der Gewichtsmessung geladen
                  </div>
                  {weight && startWeight && parseFloat(weight) !== parseFloat(startWeight) && (
                    <div className="text-xs mt-1">
                      {parseFloat(weight) < parseFloat(startWeight) && (
                        <span className="text-green-500">↓ -{(parseFloat(startWeight) - parseFloat(weight)).toFixed(1)} kg</span>
                      )}
                      {parseFloat(weight) > parseFloat(startWeight) && (
                        <span className="text-red-500">↑ +{(parseFloat(weight) - parseFloat(startWeight)).toFixed(1)} kg</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label className="text-sm">Größe (cm)</Label>
                  <NumericInput
                    value={height}
                    onChange={setHeight}
                    placeholder="175"
                    className={cn("mt-1", validationErrors.height && "border-red-500")}
                  />
                  <ProfileFieldIndicator isComplete={completionStatus.height} />
                </div>
                <div className="relative">
                  <Label className="text-sm">Alter</Label>
                  <NumericInput
                    value={age}
                    onChange={setAge}
                    placeholder="30"
                    className={cn("mt-1", validationErrors.age && "border-red-500")}
                  />
                  <ProfileFieldIndicator isComplete={completionStatus.age} />
                </div>
                <div className="relative">
                  <Label className="text-sm">Geschlecht</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className={cn("mt-1", validationErrors.gender && "border-red-500")}>
                      <SelectValue placeholder="Wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Männlich</SelectItem>
                      <SelectItem value="female">Weiblich</SelectItem>
                    </SelectContent>
                  </Select>
                  <ProfileFieldIndicator isComplete={completionStatus.gender} />
                </div>
              </div>

              <div className="profile-activity-level">
                <Label className="text-sm">Aktivitätslevel</Label>
                <Select value={activityLevel} onValueChange={setActivityLevel}>
                  <SelectTrigger className={cn("mt-1", validationErrors.activityLevel && "border-red-500")}>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sitzend (wenig/keine Bewegung)</SelectItem>
                      <SelectItem value="light">Leicht aktiv (1-2 Tage/Woche Sport, wenig Schritte)</SelectItem>
                      <SelectItem value="moderate">Moderat aktiv (2-3 Tage/Woche Sport, 5-6k Schritte)</SelectItem>
                      <SelectItem value="active">Sehr aktiv (3-5 Tage/Woche Sport, 6-8k Schritte)</SelectItem>
                      <SelectItem value="very_active">Extrem aktiv (5+ Tage/Woche Sport, 8k+ Schritte)</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Goals - Protocol-Driven Configurator */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Ziele</h2>
          </div>

          <GoalConfigurator
            currentWeight={parseFloat(weight) || 80}
            weightDelta={weightDelta}
            setWeightDelta={setWeightDelta}
            muscleGoal={muscleGoal}
            setMuscleGoal={setMuscleGoal}
            protocolTempo={protocolTempo}
            setProtocolTempo={setProtocolTempo}
            tdee={tdee || 2000}
          />

        </div>

        {/* 3. Intelligent Calorie Analysis + Goal Progress */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Kalorien & Makros</h2>
          </div>

          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* BMR / TDEE / Target Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold">{bmr ? Math.round(bmr) : '-'}</div>
                  <div className="text-xs text-muted-foreground">BMR</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Grundumsatz</div>
                </div>
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold">{tdee || '-'}</div>
                  <div className="text-xs text-muted-foreground">TDEE</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Tagesbedarf</div>
                </div>
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold">{targetCalories}</div>
                  <div className="text-xs text-muted-foreground">Ziel</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Kalorien</div>
                </div>
              </div>

              {/* Goal Deficit/Surplus Section - Only if target set */}
              {weightDelta !== 0 && calculateRequiredCalorieDeficit() && (
                <div className="pt-3 border-t border-border">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-primary">
                        {Math.abs(weightDelta).toFixed(1)} kg
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {weightDelta > 0 ? '↑' : '↓'} Differenz
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-orange-500">
                        {calculateRequiredCalorieDeficit()?.daily}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        kcal/Tag
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-teal-500">
                        {calculateRequiredCalorieDeficit()?.weekly}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        kcal/Woche
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <div className="text-sm font-bold text-indigo-500">
                        {Math.max(1, Math.round((computedTargetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))}w
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        verbleibend
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning if too aggressive */}
                  {!calculateRequiredCalorieDeficit()?.isGaining && (calculateRequiredCalorieDeficit()?.daily || 0) > 1000 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Aggressives Defizit – Muskelabbau-Risiko</span>
                    </div>
                  )}
                  {calculateRequiredCalorieDeficit()?.isGaining && (calculateRequiredCalorieDeficit()?.daily || 0) > 800 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-orange-500">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Hoher Überschuss – mehr Fetteinlagerung möglich</span>
                    </div>
                  )}
                </div>
              )}

              {/* Makros */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-emerald-500">{currentMacros.proteinGrams}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-blue-500">{currentMacros.carbGrams}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-lg font-bold text-amber-500">{currentMacros.fatGrams}g</div>
                  <div className="text-xs text-muted-foreground">Fett</div>
                </div>
              </div>
              {currentMacros.warnings.length > 0 && (
                <div className="text-xs text-orange-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {currentMacros.warnings[0]}
                </div>
              )}

              {/* Accuracy Indicator */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium">Genauigkeit</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isProfileComplete ? 'bg-green-500' : 
                    (weight && height && age && gender) ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-muted-foreground">
                    {isProfileComplete ? '95%' : (weight && height && age && gender) ? '75%' : '25%'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Macro Strategy */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <PieChart className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Protokoll-Intensität</h2>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 gap-3">
                {/* ROOKIE */}
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentIntensity === 'rookie' 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-border hover:border-emerald-500/50'
                  }`}
                  onClick={() => handleIntensityChange('rookie')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌱</span>
                    <div className="flex-1">
                      <div className="font-bold text-base">ROOKIE</div>
                      <div className="text-sm text-muted-foreground">1.2g/kg Protein</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Startphase. Magen an Protein gewöhnen.
                      </div>
                    </div>
                    {currentIntensity === 'rookie' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                  </div>
                </div>

                {/* WARRIOR (Recommended) */}
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    currentIntensity === 'warrior' 
                      ? 'border-amber-500 bg-amber-500/10' 
                      : 'border-border hover:border-amber-500/50'
                  }`}
                  onClick={() => handleIntensityChange('warrior')}
                >
                  <Badge className="absolute -top-2 right-3 bg-amber-500 text-white border-0">Empfohlen bei Reta</Badge>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚔️</span>
                    <div className="flex-1">
                      <div className="font-bold text-base">WARRIOR</div>
                      <div className="text-sm text-muted-foreground">2.0g/kg Protein</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Rekomposition. Maximaler Muskelschutz + stabiler Blutzucker.
                      </div>
                    </div>
                    {currentIntensity === 'warrior' && <CheckCircle className="h-5 w-5 text-amber-500" />}
                  </div>
                </div>

                {/* ELITE */}
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    currentIntensity === 'elite' 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-border hover:border-purple-500/50'
                  }`}
                  onClick={() => handleIntensityChange('elite')}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div className="flex-1">
                      <div className="font-bold text-base">ELITE</div>
                      <div className="text-sm text-muted-foreground">2.5g/kg Protein</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Profi-Defizit. Aggressive Trockenlegung.
                      </div>
                    </div>
                    {currentIntensity === 'elite' && <CheckCircle className="h-5 w-5 text-purple-500" />}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* 4. Medical Screening */}
        <MedicalScreening onScreeningComplete={refreshCompletion} />

        {/* 9. Coach Persona Selection */}
        <PersonaSelector />

        {/* 10. Avatar Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Profilbild & Coach-Ansprache</h2>
          </div>

          <AvatarSelector
            currentAvatarUrl={profileAvatarUrl}
            currentPresetId={avatarPresetId}
            avatarType={avatarType}
            onAvatarChange={(avatarUrl, type, presetId) => {
              setProfileAvatarUrl(avatarUrl);
              setAvatarType(type);
              setAvatarPresetId(presetId || '');
            }}
          />

          {/* Preferred Name Section */}
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-2">
                <Label htmlFor="preferred-name">Wie sollen die Coaches dich ansprechen?</Label>
                <Input
                  id="preferred-name"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Dein Vorname oder Spitzname"
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Anzeigename für&apos;s Coaching
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Save Status */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 bg-background/90 backdrop-blur-sm border rounded-xl p-3 shadow-lg w-[385px] max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
              {autoSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                  <span className="truncate">Speichere automatisch...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-muted-foreground truncate">
                    Gespeichert um {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Nicht gespeichert</span>
              )}
            </div>
            <Button 
              onClick={handleSave} 
              disabled={loading || autoSaving}
              size="sm"
              className="ml-2 profile-save-button flex-shrink-0"
            >
              <Save className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Speichern</span>
              <span className="sm:hidden">Save</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;