import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { calculateRealismScore as calculateRealismScoreFromUtils, getRealismLabel, getRealismVariant } from '@/utils/realismCalculator';
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
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [goalType, setGoalType] = useState<'weight' | 'body_fat' | 'both'>('weight');
  const [targetBodyFat, setTargetBodyFat] = useState('');
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
    activityLevel, goal, targetWeight, targetDate, goalType, targetBodyFat, language,
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
        setTargetWeight(data.target_weight ? data.target_weight.toString() : '');
        setTargetDate(data.target_date || '');
        setGoalType((data.goal_type as 'weight' | 'body_fat' | 'both') || 'weight');
        setTargetBodyFat(data.target_body_fat_percentage ? data.target_body_fat_percentage.toString() : '');
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
    if (!weight || !targetWeight || !targetDate) return null;
    
    const currentWeight = parseFloat(weight);
    const goalWeight = parseFloat(targetWeight);
    const weightDiff = Math.abs(currentWeight - goalWeight);
    const targetDateObj = new Date(targetDate);
    const today = new Date();
    const timeDiff = Math.max(0, (targetDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (timeDiff <= 0) return null;
    
    const totalCalorieDeficit = weightDiff * 7700;
    const dailyCalorieDeficit = Math.round(totalCalorieDeficit / timeDiff);
    
    // Check if user wants to gain weight (goal === 'gain' or goalWeight > currentWeight)
    const isGaining = goal === 'gain' || goalWeight > currentWeight;
    
    return {
      daily: dailyCalorieDeficit,
      weekly: Math.round(dailyCalorieDeficit * 7),
      total: Math.round(totalCalorieDeficit),
      isGaining: isGaining
    };
  };

  // Calculate realism score using unified calculator
  const calculateRealismScore = () => {
    if (!weight || !targetWeight || !targetDate) return 0;
    
    return calculateRealismScoreFromUtils({
      currentWeight: parseFloat(weight),
      targetWeight: parseFloat(targetWeight),
      currentBodyFat: undefined, // Let util use default
      targetBodyFat: targetBodyFat ? parseFloat(targetBodyFat) : undefined,
      targetDate: new Date(targetDate)
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
      goal: goal,
      target_weight: targetWeight ? parseFloat(targetWeight) : null,
      target_date: targetDate || null,
      goal_type: goalType,
      target_body_fat_percentage: targetBodyFat ? parseFloat(targetBodyFat) : null,
      preferred_language: language,
      coach_personality: coachPersonality,
      muscle_maintenance_priority: muscleMaintenancePriority,
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
    const weightDifference = targetWeight && weight 
      ? Number(targetWeight) - Number(weight) 
      : null;
    const isGainingWeight = weightDifference ? weightDifference > 0 : false;
    const currentGoalType = !weightDifference ? 'maintain' : (isGainingWeight ? 'gain' : 'lose');
    
    // Calculate additional metrics
    const daysToGoal = targetDate && deficitData ? 
      Math.max(0, Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null;
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
        weight_difference_kg: weightDifference,
        weeks_to_goal: weeksToGoal,
        days_to_goal: daysToGoal,
        weekly_calorie_deficit: deficitData?.weekly || null,
        total_calories_needed: deficitData?.total || null,
        weekly_fat_loss_g: weeklyFatLossGrams,
        target_date: targetDate || null,
        is_gaining_weight: isGainingWeight,
        goal_type: currentGoalType,
        is_realistic_goal: realismScore >= 6,
        warning_message: realismScore < 6 ? getRealismLabel(realismScore) : null,
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

        {/* 2. Goals */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Ziele</h2>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="relative">
                <Label className="text-sm">Ziel</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className={cn("mt-1", validationErrors.goal && "border-red-500")}>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose">Gewicht reduzieren</SelectItem>
                    <SelectItem value="maintain">Gewicht halten</SelectItem>
                    <SelectItem value="gain">Gewicht aufbauen</SelectItem>
                  </SelectContent>
                </Select>
                <ProfileFieldIndicator isComplete={completionStatus.goal} />
              </div>

              <div className="relative">
                <Label className="text-sm">Ziel-Typ</Label>
                <Select value={goalType} onValueChange={(value: 'weight' | 'body_fat' | 'both') => setGoalType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Gewichtsziel</SelectItem>
                    <SelectItem value="body_fat">Körperfett-Ziel (%)</SelectItem>
                    <SelectItem value="both">Beides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(goalType === 'weight' || goalType === 'both') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Label className="text-sm">Zielgewicht</Label>
                    <NumericInput
                      value={targetWeight}
                      onChange={setTargetWeight}
                      placeholder="70"
                      className="mt-1"
                    />
                    <ProfileFieldIndicator isComplete={completionStatus.targetWeight} />
                  </div>
                  <div>
                    <Label className="text-sm">Zieldatum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !targetDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {targetDate ? format(new Date(targetDate), "dd.MM.yyyy") : <span>Datum wählen</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={targetDate ? new Date(targetDate) : undefined}
                          onSelect={(date) => setTargetDate(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {(goalType === 'body_fat' || goalType === 'both') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Label className="text-sm">Ziel Körperfett (%)</Label>
                    <Select 
                      value={targetBodyFat?.toString() || ''} 
                      onValueChange={(value) => setTargetBodyFat(value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue 
                          placeholder={`${gender === 'male' ? '5-35%' : '10-40%'} wählen`}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {(() => {
                          const isMale = gender === 'male';
                          const minValue = isMale ? 5 : 10;
                          const maxValue = isMale ? 35 : 40;
                          const options = [];
                          
                          for (let i = minValue; i <= maxValue; i += 0.5) {
                            let category = '';
                            if (isMale) {
                              if (i <= 13) category = ' (Athletic)';
                              else if (i <= 17) category = ' (Fit)';
                              else if (i <= 24) category = ' (Average)';
                              else category = ' (Above Average)';
                            } else {
                              if (i <= 20) category = ' (Athletic)';
                              else if (i <= 24) category = ' (Fit)';
                              else if (i <= 31) category = ' (Average)';
                              else category = ' (Above Average)';
                            }
                            options.push(
                              <SelectItem key={i} value={i.toString()}>
                                {i.toFixed(1)}%{category}
                              </SelectItem>
                            );
                          }
                          return options;
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Zieldatum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !targetDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {targetDate ? format(new Date(targetDate), "dd.MM.yyyy") : <span>Datum wählen</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={targetDate ? new Date(targetDate) : undefined}
                          onSelect={(date) => setTargetDate(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Realism Assessment */}
              {targetWeight && targetDate && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Realismus-Bewertung</span>
                    <Badge variant={getRealismVariant(realismScore)} className="text-xs">
                      {realismScore.toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress value={realismScore} className="w-full h-2 mb-2" />
                  <div className="text-xs text-muted-foreground">
                    {getRealismLabel(realismScore)}
                  </div>
                </div>
              )}

              {/* Water Goal Slider */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <FluidGoalSlider
                  value={fluidGoalMl}
                  onChange={setFluidGoalMl}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Empfohlen: 2.0 - 3.0 Liter pro Tag basierend auf Aktivitätslevel
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Intelligent Calorie Analysis */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Intelligente Kalorien-Analyse</h2>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold">{bmr ? Math.round(bmr) : '-'}</div>
                  <div className="text-xs text-muted-foreground">BMR</div>
                  <div className="text-xs text-muted-foreground mt-1">Grundumsatz</div>
                </div>
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold">{tdee || '-'}</div>
                  <div className="text-xs text-muted-foreground">TDEE</div>
                  <div className="text-xs text-muted-foreground mt-1">Tagesbedarf</div>
                </div>
                <div className="text-center">
                  <div className="text-base md:text-lg font-bold">{targetCalories}</div>
                  <div className="text-xs text-muted-foreground">Ziel</div>
                  <div className="text-xs text-muted-foreground mt-1">Kalorien</div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Berechnungsgenauigkeit</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isProfileComplete ? 'bg-green-500' : 
                    (weight && height && age && gender) ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-muted-foreground">
                    {isProfileComplete ? '95%' : 
                     (weight && height && age && gender) ? '75%' : '25%'}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isProfileComplete ? 
                  'Alle Daten vorhanden - sehr genaue Berechnung' :
                  (weight && height && age && gender) ? 
                    'Grunddaten vorhanden - gute Berechnung' :
                    'Weitere Daten für genauere Berechnung erforderlich'
                }
              </div>
              {intelligentCalories && intelligentCalories.recommendations && intelligentCalories.recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-xs font-medium mb-1">Empfehlungen:</div>
                  {intelligentCalories.recommendations.slice(0, 2).map((rec, index) => (
                    <div key={index} className="text-xs text-muted-foreground">• {rec}</div>
                  ))}
                </div>
              )}
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

              {/* Live Macro Calculation Display */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium mb-2">
                  Deine Makros ({weight || '80'}kg bei {targetCalories} kcal):
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-emerald-500">{currentMacros.proteinGrams}g</div>
                    <div className="text-xs text-muted-foreground">Protein</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-500">{currentMacros.carbGrams}g</div>
                    <div className="text-xs text-muted-foreground">Carbs</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-500">{currentMacros.fatGrams}g</div>
                    <div className="text-xs text-muted-foreground">Fett</div>
                  </div>
                </div>
                {currentMacros.warnings.length > 0 && (
                  <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {currentMacros.warnings[0]}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. Medical Screening */}
        <MedicalScreening onScreeningComplete={refreshCompletion} />


        {/* 5. Target Analysis */}
          {targetWeight && targetDate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold">Ziel-Analyse</h2>
              </div>

              <Card>
                <CardContent className="space-y-6 pt-5">
                  {calculateRequiredCalorieDeficit() && (
                    <>
                      <div className="space-y-4">
                      
                      {/* Hauptmetriken - Größer und prominenter */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 text-center border border-purple-200/20 dark:border-purple-500/30 shadow-sm">
                          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-300 bg-clip-text text-transparent">
                            {Math.abs(parseFloat(targetWeight || '0') - parseFloat(weight || '0')).toFixed(1)} kg
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">Gewichtsunterschied</div>
                          <div className="text-xs text-purple-600/70 dark:text-purple-400 mt-1">
                            {parseFloat(targetWeight || '0') > parseFloat(weight || '0') ? 'Zunehmen' : 'Abnehmen'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200/20 dark:border-blue-500/30 shadow-sm">
                          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
                            {Math.max(1, Math.round((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))} Wochen
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">bis zum Ziel</div>
                          <div className="text-xs text-blue-600/70 dark:text-blue-400 mt-1">
                            ca. {Math.max(1, Math.round((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Tage
                          </div>
                        </div>
                      </div>

                      {/* Detailmetriken - Schönere Gestaltung */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 text-center border border-green-200/20 dark:border-green-500/30 shadow-sm">
                          <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent">
                            {((Math.abs(parseFloat(targetWeight || '0') - parseFloat(weight || '0')) * 1000) / 
                              Math.max(1, Math.round((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))).toFixed(0)}g
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">pro Woche</div>
                          <div className="text-xs text-green-600/70 dark:text-green-400 mt-1">
                            {((Math.abs(parseFloat(targetWeight || '0') - parseFloat(weight || '0')) * 1000) / 
                              Math.max(1, Math.round((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))).toFixed(0)}g täglich
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 text-center border border-orange-200/20 dark:border-orange-500/30 shadow-sm">
                          <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 dark:from-orange-400 dark:to-orange-300 bg-clip-text text-transparent">
                            {calculateRequiredCalorieDeficit()?.daily}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">kcal täglich</div>
                          <div className="text-xs text-orange-600/70 dark:text-orange-400 mt-1">
                            {goal === 'lose' ? 'Defizit' : goal === 'gain' ? 'Überschuss' : 'Erhaltung'}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 text-center border border-teal-200/20 dark:border-teal-500/30 shadow-sm">
                          <div className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 dark:from-teal-400 dark:to-teal-300 bg-clip-text text-transparent">
                            {calculateRequiredCalorieDeficit()?.weekly}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">kcal wöchentlich</div>
                          <div className="text-xs text-teal-600/70 dark:text-teal-400 mt-1">
                            {Math.round((calculateRequiredCalorieDeficit()?.weekly || 0) / 7700 * 1000)}g Fett/Woche
                          </div>
                        </div>
                      </div>

                      {/* Zusätzliche Metriken */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-500/20 dark:to-indigo-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-3 text-center border border-indigo-200/20 dark:border-indigo-500/30 shadow-sm">
                          <div className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-300 bg-clip-text text-transparent">
                            {Math.round((Math.abs(parseFloat(targetWeight || '0') - parseFloat(weight || '0')) * 7700))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Gesamt-kcal</div>
                          <div className="text-xs text-indigo-600/70 dark:text-indigo-400 mt-1">benötigt für Ziel</div>
                        </div>
                        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/10 dark:from-pink-500/20 dark:to-pink-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-3 text-center border border-pink-200/20 dark:border-pink-500/30 shadow-sm">
                          <div className="text-lg font-bold bg-gradient-to-r from-pink-600 to-pink-800 dark:from-pink-400 dark:to-pink-300 bg-clip-text text-transparent">
                            {new Date(targetDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Zieldatum</div>
                          <div className="text-xs text-pink-600/70 dark:text-pink-400 mt-1">
                            {new Date(targetDate).toLocaleDateString('de-DE', { weekday: 'long' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warnungen und Empfehlungen */}
                    {!calculateRequiredCalorieDeficit()?.isGaining && (calculateRequiredCalorieDeficit()?.daily || 0) > 1000 && (
                      <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 border border-red-200/30 dark:border-red-500/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-red-500/20 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-red-700 dark:text-red-300 mb-1">Zu aggressives Ziel ⚠️</div>
                            <div className="text-sm text-red-600 dark:text-red-400">
                              Ein Defizit von über 1000 Kalorien täglich ist schwer nachhaltig und kann zu Muskelabbau führen. 
                              Empfehlung: Verlängere den Zeitraum oder reduziere das Gewichtsziel.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {calculateRequiredCalorieDeficit()?.isGaining && (calculateRequiredCalorieDeficit()?.daily || 0) > 800 && (
                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 border border-orange-200/30 dark:border-orange-500/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-orange-700 dark:text-orange-300 mb-1">Sehr schnelle Gewichtszunahme ⚡</div>
                            <div className="text-sm text-orange-600 dark:text-orange-400">
                              Ein Überschuss von über 800 Kalorien täglich kann zu verstärkter Fetteinlagerung führen. 
                              Empfehlung: Verlängere den Zeitraum für kontrollierte Gewichtszunahme.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {!calculateRequiredCalorieDeficit()?.isGaining && (calculateRequiredCalorieDeficit()?.daily || 0) < 500 && (calculateRequiredCalorieDeficit()?.daily || 0) > 0 && (
                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 border border-green-200/30 dark:border-green-500/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-green-700 dark:text-green-300 mb-1">Moderates, nachhaltiges Ziel ✨</div>
                            <div className="text-sm text-green-600 dark:text-green-400">
                              Perfekt für langfristigen Erfolg! Dieses Tempo erhält deine Muskelmasse und ist gut durchhaltbar.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {calculateRequiredCalorieDeficit()?.isGaining && (calculateRequiredCalorieDeficit()?.daily || 0) >= 200 && (calculateRequiredCalorieDeficit()?.daily || 0) <= 500 && (
                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 border border-green-200/30 dark:border-green-500/30 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-green-700 dark:text-green-300 mb-1">Optimaler Muskelaufbau-Überschuss 💪</div>
                            <div className="text-sm text-green-600 dark:text-green-400">
                              Perfekt für kontrollierten Muskelaufbau! Dieser Kalorienüberschuss minimiert Fettaufbau und maximiert Muskelzuwächse.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 dark:bg-card backdrop-blur-sm rounded-xl p-4 border border-blue-200/30 dark:border-blue-500/30 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Calculator className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-700 dark:text-blue-300 mb-2">Wissenschaftliche Grundlage 🧮</div>
                           <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                             <div>• 1 kg Körperfett = ca. 7.700 kcal Energieinhalt</div>
                             {goal === 'lose' && <div>• Empfohlenes Defizit: 300-500 kcal/Tag für nachhaltigen Fettabbau</div>}
                             {goal === 'gain' && <div>• Bei Muskelaufbau: 200-500 kcal/Tag Überschuss optimal</div>}
                             {goal === 'maintain' && <div>• Für Gewichtserhaltung: Kalorienbilanz ausgleichen</div>}
                             <div>• Deine Kalorienziele werden automatisch an dein Ziel angepasst</div>
                           </div>
                        </div>
                      </div>
                    </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
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