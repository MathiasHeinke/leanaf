import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Save, Check, Bot, Settings, Zap, Activity, Dumbbell, Heart, TrendingUp, AlertCircle, CheckCircle, User, MessageSquare, PieChart, Calculator, Brain, TrendingDown, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { intelligentCalorieCalculator, type CalorieCalculationResult } from '@/utils/intelligentCalorieCalculator';
import { ProfileOnboardingOverlay } from '@/components/ProfileOnboardingOverlay';
import { CompletionSuccessCard } from '@/components/CompletionSuccessCard';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { cn } from '@/lib/utils';


interface ProfilePageProps {
  onClose?: () => void;
}

const Profile = ({ onClose }: ProfilePageProps) => {
  const [displayName, setDisplayName] = useState('');
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
  const [macroStrategy, setMacroStrategy] = useState('high_protein');
  
  const { user } = useAuth();
  const { language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const { showProfileOnboarding, completeProfileOnboarding, showIndexOnboarding } = useOnboardingState();

  // State for profile completion validation and success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Individual macro percentages for custom strategy
  const [proteinPercentage, setProteinPercentage] = useState(30);
  const [carbsPercentage, setCarbsPercentage] = useState(40);
  const [fatsPercentage, setFatsPercentage] = useState(30);

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

  // Update macro percentages when strategy changes
  useEffect(() => {
    if (macroStrategy === 'high_protein') {
      setProteinPercentage(40);
      setCarbsPercentage(30);
      setFatsPercentage(30);
    } else if (macroStrategy === 'balanced') {
      setProteinPercentage(30);
      setCarbsPercentage(40);
      setFatsPercentage(30);
    } else if (macroStrategy === 'low_carb') {
      setProteinPercentage(35);
      setCarbsPercentage(20);
      setFatsPercentage(45);
    }
  }, [macroStrategy]);

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
    displayName, weight, startWeight, height, age, gender, 
    activityLevel, goal, targetWeight, targetDate, language,
    dailyGoals.calories, dailyGoals.protein, dailyGoals.carbs, 
    dailyGoals.fats, dailyGoals.calorieDeficit,
    coachPersonality, muscleMaintenancePriority, macroStrategy
  ]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadDailyGoals();
      calculateIntelligentCalories();
    }
  }, [user]);

  // Recalculate when relevant data changes
  useEffect(() => {
    if (user && weight && height && age && gender) {
      calculateIntelligentCalories();
    }
  }, [weight, height, age, gender, activityLevel, goal, dailyGoals.calorieDeficit]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfileExists(true);
        setDisplayName(data.display_name || '');
        setWeight(data.weight ? data.weight.toString() : '');
        setStartWeight(data.start_weight ? data.start_weight.toString() : '');
        setHeight(data.height ? data.height.toString() : '');
        setAge(data.age ? data.age.toString() : '');
        setGender(data.gender || '');
        setActivityLevel(data.activity_level || 'moderate');
        setGoal(data.goal || 'maintain');
        setTargetWeight(data.target_weight ? data.target_weight.toString() : '');
        setTargetDate(data.target_date || '');
        setCoachPersonality(data.coach_personality || 'motivierend');
        setMuscleMaintenancePriority(data.muscle_maintenance_priority || false);
        setMacroStrategy(data.macro_strategy || 'high_protein');
        if (data.preferred_language) {
          setLanguage(data.preferred_language);
        }
      } else {
        setProfileExists(false);
        // Set default strategy to high_protein for new users
        setMacroStrategy('high_protein');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
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
      } else {
        // Set High Protein as fallback for new users
        setDailyGoals({
          calories: 2000,
          protein: 50,
          carbs: 20,
          fats: 30,
          calorieDeficit: 300
        });
      }
    } catch (error: any) {
      console.error('Error loading daily goals:', error);
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
    const targetCalories = calculateTargetCalories();
    return {
      protein: Math.round((targetCalories * dailyGoals.protein / 100) / 4),
      carbs: Math.round((targetCalories * dailyGoals.carbs / 100) / 4),
      fats: Math.round((targetCalories * dailyGoals.fats / 100) / 9),
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
    
    return {
      daily: dailyCalorieDeficit,
      weekly: Math.round(dailyCalorieDeficit * 7),
      total: Math.round(totalCalorieDeficit)
    };
  };

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

    const profileData = {
      user_id: user.id,
      display_name: displayName,
      weight: weight ? parseFloat(weight) : null,
      start_weight: startWeight ? parseFloat(startWeight) : null,
      height: height ? parseInt(height) : null,
      age: age ? parseInt(age) : null,
      gender: gender || null,
      activity_level: activityLevel,
      goal: goal,
      target_weight: targetWeight ? parseFloat(targetWeight) : null,
      target_date: targetDate || null,
      preferred_language: language,
      coach_personality: coachPersonality,
      muscle_maintenance_priority: muscleMaintenancePriority,
      macro_strategy: macroStrategy,
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

    const { error: goalsError } = await supabase
      .from('daily_goals')
      .upsert({
        user_id: user.id,
        calories: targetCalories,
        protein: macroGrams.protein,
        carbs: macroGrams.carbs,
        fats: macroGrams.fats,
        calorie_deficit: calculateRequiredCalorieDeficit()?.daily || dailyGoals.calorieDeficit,
        protein_percentage: dailyGoals.protein,
        carbs_percentage: dailyGoals.carbs,
        fats_percentage: dailyGoals.fats,
        bmr: bmr ? Math.round(bmr) : null,
        tdee: tdee,
      }, {
        onConflict: 'user_id'
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
      toast.success('Profil erfolgreich gespeichert');
      setLastSaved(new Date());
      setSaveSuccess(true);
      
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
  const proteinGrams = targetCalories ? (targetCalories * proteinPercentage / 100) / 4 : 0;
  const carbsGrams = targetCalories ? (targetCalories * carbsPercentage / 100) / 4 : 0;
  const fatsGrams = targetCalories ? (targetCalories * fatsPercentage / 100) / 9 : 0;

  const handleSuccessDialogContinue = () => {
    setShowSuccessDialog(false);
    completeProfileOnboarding();
    navigate('/');
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Onboarding Overlays - Only show if profile is not complete */}
      <ProfileOnboardingOverlay 
        isOpen={showProfileOnboarding && !isProfileComplete}
        onClose={completeProfileOnboarding}
        userName={displayName || user?.email?.split('@')[0] || 'Champion'}
      />
      
      <CompletionSuccessCard
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        onContinue={handleSuccessDialogContinue}
      />

      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-6 pb-20">
        
        {/* 1. Personal Data */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">{t('profile.personalData')}</h2>
          </div>

            <div>
              <Label className="text-sm">Anzeigename für Coaches</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z.B. Max, Sarah..."
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Wie sollen dich die Coaches ansprechen?
              </div>
            </div>

          <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4 profile-basic-data">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">{t('profile.startWeight')}</Label>
                <NumericInput
                  value={startWeight}
                  onChange={(value) => {
                    const newStartWeight = value;
                    setStartWeight(newStartWeight);
                    // Auto-set current weight if it's empty
                    if (!weight && newStartWeight) {
                      setWeight(newStartWeight);
                    }
                  }}
                  placeholder="75"
                  className={cn("mt-1", validationErrors.startWeight && "border-red-500")}
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.currentWeightLabel')}</Label>
                <div className="mt-1 flex items-center justify-between h-10 px-3 py-2">
                  <span className="text-lg font-bold">{weight || '-'} kg</span>
                  {weight && startWeight && parseFloat(weight) !== parseFloat(startWeight) && (
                    <span className="text-xs">
                      {parseFloat(weight) < parseFloat(startWeight) && (
                        <span className="text-green-500">↓ -{(parseFloat(startWeight) - parseFloat(weight)).toFixed(1)} kg</span>
                      )}
                      {parseFloat(weight) > parseFloat(startWeight) && (
                        <span className="text-red-500">↑ +{(parseFloat(weight) - parseFloat(startWeight)).toFixed(1)} kg</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">{t('profile.height')}</Label>
                <NumericInput
                  value={height}
                  onChange={setHeight}
                  placeholder="175"
                  className={cn("mt-1", validationErrors.height && "border-red-500")}
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.age')}</Label>
                <NumericInput
                  value={age}
                  onChange={setAge}
                  placeholder="30"
                  className={cn("mt-1", validationErrors.age && "border-red-500")}
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.gender')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className={cn("mt-1", validationErrors.gender && "border-red-500")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.genderMale')}</SelectItem>
                    <SelectItem value="female">{t('profile.genderFemale')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="profile-activity-level">
              <Label className="text-sm">{t('profile.activityLevel')}</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger className={cn("mt-1", validationErrors.activityLevel && "border-red-500")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">{t('activity.sedentary')}</SelectItem>
                  <SelectItem value="light">{t('activity.light')}</SelectItem>
                  <SelectItem value="moderate">{t('activity.moderate')}</SelectItem>
                  <SelectItem value="active">{t('activity.active')}</SelectItem>
                  <SelectItem value="very_active">{t('activity.veryActive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 2. Goals */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">{t('profile.goals')}</h2>
          </div>

          <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4 profile-goals">
            <div>
              <Label className="text-sm">{t('profile.goal')}</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className={cn("mt-1", validationErrors.goal && "border-red-500")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">{t('goals.lose')}</SelectItem>
                  <SelectItem value="maintain">{t('goals.maintain')}</SelectItem>
                  <SelectItem value="gain">{t('goals.gain')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">{t('profile.targetWeight')}</Label>
                <NumericInput
                  value={targetWeight}
                  onChange={setTargetWeight}
                  placeholder="70"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.targetDate')}</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">{t('profile.language')}</Label>
              <div className="relative">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  🌍
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Sprache für die Benutzeroberfläche
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">{t('profile.coachPersonality')}</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Wie soll dein Coach mit dir kommunizieren?
                </p>
              </div>
              
              <div className="space-y-2">
                {[
                  { 
                    id: 'motivierend',
                    label: '🔥 Motivierend',
                    desc: 'Pushend, energisch, feuernd dich an'
                  },
                  { 
                    id: 'soft',
                    label: '🤗 Sanft & Unterstützend',
                    desc: 'Einfühlsam, geduldig, verständnisvoll'
                  },
                  {
                    id: 'streng',
                    label: '💪 Streng & Direkt',
                    desc: 'Klare Ansagen, keine Ausreden, tough love'
                  },
                  {
                    id: 'wissenschaftlich',
                    label: '🧠 Wissenschaftlich',
                    desc: 'Faktenbasiert, sachlich, präzise Erklärungen'
                  }
                ].map((personality) => (
                  <div 
                    key={personality.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      coachPersonality === personality.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setCoachPersonality(personality.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{personality.label}</div>
                        <div className="text-xs text-muted-foreground">{personality.desc}</div>
                      </div>
                      <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {coachPersonality === personality.id ? '✓' : '○'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Calorie Deficit/Surplus Calculation */}
        {targetWeight && targetDate && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Kalorienbedarf Berechnung</h2>
            </div>

            <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
              {calculateRequiredCalorieDeficit() && (
                <>
                  <div className="space-y-3">
                    <div className="text-sm font-medium">
                      Gewichtsveränderung: {weight && targetWeight ? 
                        `${parseFloat(weight)} kg → ${parseFloat(targetWeight)} kg` : 
                        'Zielgewicht eingeben'
                      }
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">
                          {Math.abs(parseFloat(targetWeight || '0') - parseFloat(weight || '0')).toFixed(1)} kg
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {goal === 'lose' ? 'zu verlieren' : goal === 'gain' ? 'zuzunehmen' : 'zu halten'}
                        </div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">
                          {Math.max(0, Math.round((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Tage
                        </div>
                        <div className="text-xs text-muted-foreground">bis zum Ziel</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">{calculateRequiredCalorieDeficit()?.daily}</div>
                        <div className="text-xs text-muted-foreground">kcal täglich</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">{calculateRequiredCalorieDeficit()?.weekly}</div>
                        <div className="text-xs text-muted-foreground">kcal wöchentlich</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <div className="text-lg font-bold">
                          {((Math.abs(parseFloat(targetWeight || '0') - parseFloat(weight || '0')) * 1000) / 
                            Math.max(1, Math.round((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))).toFixed(0)}g
                        </div>
                        <div className="text-xs text-muted-foreground">pro Woche</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">Muskelmasse Priorität</div>
                        <div className="text-xs text-muted-foreground">
                          Langsamere, aber gesunde Gewichtsveränderung
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={muscleMaintenancePriority}
                      onCheckedChange={setMuscleMaintenancePriority}
                    />
                  </div>

                  {(calculateRequiredCalorieDeficit()?.daily || 0) > 800 && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-orange-700 dark:text-orange-300">Achtung: Sehr aggressives Ziel</div>
                          <div className="text-orange-600 dark:text-orange-400">
                            Das Kalorienziel ist sehr niedrig. Erwäge ein langsameres, nachhaltigeres Tempo.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. Macro Strategy */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <PieChart className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">Makronährstoff-Strategie</h2>
          </div>

          <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
            <div className="space-y-3">
              {[
                { 
                  id: 'high_protein',
                  label: 'High Protein (50/20/30)',
                  desc: 'Optimal für Muskelaufbau & Sättigung',
                  protein: 50, carbs: 20, fats: 30
                },
                { 
                  id: 'high_carb',
                  label: 'High Carb (20/50/30)',
                  desc: 'Ideal für intensive Workouts',
                  protein: 20, carbs: 50, fats: 30
                },
                {
                  id: 'low_carb',
                  label: 'Low Carb (30/20/50)',
                  desc: 'Ketogene Ernährung & Fettverbrennung',
                  protein: 30, carbs: 20, fats: 50
                },
                {
                  id: 'custom',
                  label: 'Individuell',
                  desc: 'Eigene Werte definieren',
                  protein: dailyGoals.protein, carbs: dailyGoals.carbs, fats: dailyGoals.fats
                }
              ].map((strategy) => (
                <div 
                  key={strategy.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    macroStrategy === strategy.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setMacroStrategy(strategy.id);
                    if (strategy.id !== 'custom') {
                      setDailyGoals(prev => ({
                        ...prev,
                        protein: strategy.protein,
                        carbs: strategy.carbs,
                        fats: strategy.fats
                      }));
                      setHasUserModifiedMacros(false);
                    }
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{strategy.label}</div>
                      <div className="text-xs text-muted-foreground">{strategy.desc}</div>
                    </div>
                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {macroStrategy === strategy.id ? '✓' : '○'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {macroStrategy === 'custom' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Protein %</Label>
                    <NumericInput
                      value={dailyGoals.protein.toString()}
                      onChange={(value) => {
                        setDailyGoals(prev => ({ ...prev, protein: parseInt(value) || 0 }));
                        setHasUserModifiedMacros(true);
                      }}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kohlenhydrate %</Label>
                    <NumericInput
                      value={dailyGoals.carbs.toString()}
                      onChange={(value) => {
                        setDailyGoals(prev => ({ ...prev, carbs: parseInt(value) || 0 }));
                        setHasUserModifiedMacros(true);
                      }}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fette %</Label>
                    <NumericInput
                      value={dailyGoals.fats.toString()}
                      onChange={(value) => {
                        setDailyGoals(prev => ({ ...prev, fats: parseInt(value) || 0 }));
                        setHasUserModifiedMacros(true);
                      }}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground">
                  Summe: {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats}%
                  {(dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats) !== 100 && (
                    <span className="text-orange-500 ml-2">⚠️ Sollte 100% sein</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 4. Calculated Values */}
        <div className="space-y-6">
          {/* Basic Calculations */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">{t('profile.dailyTargets')}</h2>
            </div>

            <div className="bg-background rounded-xl p-4 shadow-sm border">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{calculateMacroGrams().protein}g</div>
                  <div className="text-sm text-muted-foreground">{t('macros.protein')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{calculateMacroGrams().carbs}g</div>
                  <div className="text-sm text-muted-foreground">{t('macros.carbs')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{calculateMacroGrams().fats}g</div>
                  <div className="text-sm text-muted-foreground">{t('macros.fats')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Intelligent Analysis */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Intelligente Kalorien-Analyse</h2>
            </div>

            {intelligentCalories && (
              <div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-background rounded-xl p-3 shadow-sm border text-center">
                    <div className="text-lg font-bold">{intelligentCalories.bmr}</div>
                    <div className="text-xs text-muted-foreground">{t('profile.bmr')}</div>
                  </div>
                  <div className="bg-background rounded-xl p-3 shadow-sm border text-center">
                    <div className="text-lg font-bold">{intelligentCalories.tdee}</div>
                    <div className="text-xs text-muted-foreground">{t('profile.tdee')}</div>
                  </div>
                  <div className="bg-background rounded-xl p-3 shadow-sm border text-center">
                    <div className="text-lg font-bold">{intelligentCalories.targetCalories}</div>
                    <div className="text-xs text-muted-foreground">{t('ui.goal')}</div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Target Analysis */}
          {targetWeight && targetDate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold">{t('profile.targetAnalysis')}</h2>
              </div>

              <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
                {calculateRequiredCalorieDeficit() && (
                  <div>
                    <div className="text-sm font-medium mb-3">{t('profile.requiredCalorieDeficit')}</div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold">{calculateRequiredCalorieDeficit()?.daily}</div>
                        <div className="text-xs text-muted-foreground">täglich</div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-lg font-bold">{calculateRequiredCalorieDeficit()?.weekly}</div>
                        <div className="text-xs text-muted-foreground">wöchentlich</div>
                      </div>
                    </div>
                  </div>
                )}

                {calculateRequiredCalorieDeficit() && calculateRequiredCalorieDeficit()!.daily > 1000 && (
                  <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-red-500 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <div className="font-medium text-red-700 dark:text-red-300">Zu aggressives Ziel</div>
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Ein Defizit von über 1000 Kalorien täglich ist schwer nachhaltig
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {calculateRequiredCalorieDeficit() && calculateRequiredCalorieDeficit()!.daily < 500 && (
                  <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-500 mt-0.5">💡</div>
                      <div className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                        Moderates, nachhaltiges Defizit - sehr gut für langfristigen Erfolg!
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Save Status */}
        <div className="fixed bottom-4 left-4 right-4 bg-background/90 backdrop-blur-sm border rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-sm">
              {autoSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>{t('profile.autoSaving')}</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    {t('profile.saveStatus', { time: lastSaved.toLocaleTimeString() })}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t('profile.notSaved')}</span>
              )}
            </div>
            <Button 
              onClick={handleSave} 
              disabled={loading || autoSaving}
              size="sm"
              className="ml-2 profile-save-button"
            >
              <Save className="h-4 w-4 mr-1" />
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Profile;