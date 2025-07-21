import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Target, Save, Check, Bot, Settings, Zap, Activity, Dumbbell, Heart, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { intelligentCalorieCalculator, type CalorieCalculationResult } from '@/utils/intelligentCalorieCalculator';

interface ProfilePageProps {
  onClose?: () => void;
}

const Profile = ({ onClose }: ProfilePageProps) => {
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
  
  // Coach Settings State
  const [coachPersonality, setCoachPersonality] = useState('motivierend');
  const [muscleMaintenancePriority, setMuscleMaintenancePriority] = useState(false);
  const [macroStrategy, setMacroStrategy] = useState('standard');
  
  const { user } = useAuth();
  const { language, setLanguage } = useTranslation();
  const navigate = useNavigate();

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
    weight, startWeight, height, age, gender, 
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
        setMacroStrategy(data.macro_strategy || 'standard');
        if (data.preferred_language) {
          setLanguage(data.preferred_language);
        }
      } else {
        setProfileExists(false);
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
        calorieDeficit: dailyGoals.calorieDeficit
      });
      
      setIntelligentCalories(result);
      
      // Update daily goals with intelligent calculation
      setDailyGoals({
        ...dailyGoals,
        calories: result.targetCalories
      });
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
    return maintenance + (multiplier * dailyGoals.calorieDeficit);
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
    const strategies = {
      standard: { protein: 30, carbs: 40, fats: 30 },
      high_protein: { protein: 40, carbs: 30, fats: 30 },
      balanced: { protein: 25, carbs: 45, fats: 30 },
      low_carb: { protein: 35, carbs: 20, fats: 45 },
      athletic: { protein: 30, carbs: 50, fats: 20 }
    };
    
    const macros = strategies[strategy as keyof typeof strategies];
    if (macros) {
      setDailyGoals({
        ...dailyGoals,
        protein: macros.protein,
        carbs: macros.carbs,  
        fats: macros.fats
      });
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
        calorie_deficit: dailyGoals.calorieDeficit,
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

    setLoading(true);
    try {
      await performSave();
      toast.success(t('toast.success.profileSaved'));
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(t('toast.error.savingProfile'));
    } finally {
      setLoading(false);
    }
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

          <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4 profile-basic-data">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">{t('profile.startWeight')}</Label>
                <Input
                  type="number"
                  value={startWeight}
                  onChange={(e) => {
                    const newStartWeight = e.target.value;
                    setStartWeight(newStartWeight);
                    // Auto-set current weight if it's empty
                    if (!weight && newStartWeight) {
                      setWeight(newStartWeight);
                    }
                  }}
                  placeholder="75"
                  className="mt-1"
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
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.age')}</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="30"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.gender')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.gender.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.gender.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="profile-activity-level">
              <Label className="text-sm">{t('profile.activityLevel')}</Label>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">{t('profile.activityLevels.sedentary')}</SelectItem>
                  <SelectItem value="light">{t('profile.activityLevels.light')}</SelectItem>
                  <SelectItem value="moderate">{t('profile.activityLevels.moderate')}</SelectItem>
                  <SelectItem value="active">{t('profile.activityLevels.active')}</SelectItem>
                  <SelectItem value="very_active">{t('profile.activityLevels.very_active')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 2. Define Goals */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">{t('profile.defineGoals')}</h2>
          </div>

          <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4 profile-goals">
            <div>
              <Label className="text-sm">{t('profile.goal')}</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">{t('profile.goals.lose')}</SelectItem>
                  <SelectItem value="maintain">{t('profile.goals.maintain')}</SelectItem>
                  <SelectItem value="gain">{t('profile.goals.gain')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">{t('profile.targetWeight')}</Label>
                <Input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="65"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{t('profile.targetDate')}</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">{t('profile.calorieDeficit')}</Label>
              <Input
                type="number"
                value={dailyGoals.calorieDeficit}
                onChange={(e) => setDailyGoals({...dailyGoals, calorieDeficit: parseInt(e.target.value) || 0})}
                className="mt-1"
                placeholder="300"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {t('profile.calorieAdjustment')}
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  {t('profile.muscleMaintenancePriority')}
                </Label>
                <div className="text-xs text-muted-foreground">
                  {t('profile.muscleMaintenancePriority')}
                </div>
              </div>
              <Switch 
                checked={muscleMaintenancePriority} 
                onCheckedChange={setMuscleMaintenancePriority}
              />
            </div>
          </div>
        </div>

        {/* 3. Preferences */}
        <div className="space-y-6">
          {/* Coach Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-purple-500 rounded-xl flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">{t('profile.coachSettings')}</h2>
            </div>

            <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('profile.coachPersonality')}</Label>
                <Select value={coachPersonality} onValueChange={setCoachPersonality}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hart">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-red-500" />
                        <span>{t('profile.coachPersonalities.hart')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="soft">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        <span>{t('profile.coachPersonalities.soft')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="motivierend">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span>{t('profile.coachPersonalities.motivierend')}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-accent/10 rounded-xl p-3">
                <div className="text-sm font-medium mb-1">{t('coach.preview')}:</div>
                <div className="text-muted-foreground italic text-sm">
                  {coachPersonality === 'hart' && t('coach.preview.tough')}
                  {coachPersonality === 'soft' && t('coach.preview.soft')}
                  {coachPersonality === 'motivierend' && t('coach.preview.motivating')}
                </div>
              </div>
            </div>
          </div>

          {/* Macro Strategies */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">{t('profile.macroStrategies')}</h2>
            </div>

            <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
              <div className="space-y-3">
                {[
                  { key: 'standard', label: t('profile.macroStrategy.standard'), desc: t('profile.macroStrategyDesc.standard'), macros: '30/40/30' },
                  { key: 'high_protein', label: t('profile.macroStrategy.high_protein'), desc: t('profile.macroStrategyDesc.high_protein'), macros: '40/30/30' },
                  { key: 'balanced', label: t('profile.macroStrategy.balanced'), desc: t('profile.macroStrategyDesc.balanced'), macros: '25/45/30' },
                  { key: 'low_carb', label: t('profile.macroStrategy.low_carb'), desc: t('profile.macroStrategyDesc.low_carb'), macros: '35/20/45' },
                  { key: 'athletic', label: t('profile.macroStrategy.athletic'), desc: t('profile.macroStrategyDesc.athletic'), macros: '30/50/20' }
                ].map((strategy) => (
                  <div 
                    key={strategy.key}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      macroStrategy === strategy.key 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setMacroStrategy(strategy.key);
                      applyMacroStrategy(strategy.key);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{strategy.label}</div>
                        <div className="text-xs text-muted-foreground">{strategy.desc}</div>
                      </div>
                      <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {strategy.macros}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">{t('macros.protein')} %</Label>
                  <Input
                    type="number"
                    value={dailyGoals.protein}
                    onChange={(e) => setDailyGoals({...dailyGoals, protein: parseInt(e.target.value) || 0})}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('macros.carbs')} %</Label>
                  <Input
                    type="number"
                    value={dailyGoals.carbs}
                    onChange={(e) => setDailyGoals({...dailyGoals, carbs: parseInt(e.target.value) || 0})}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">{t('macros.fats')} %</Label>
                  <Input
                    type="number"
                    value={dailyGoals.fats}
                    onChange={(e) => setDailyGoals({...dailyGoals, fats: parseInt(e.target.value) || 0})}
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {t('profile.totalPercentage', { total: dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Calculated Results */}
        <div className="space-y-6">
          {/* Your Macros */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-green-500 rounded-xl flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">{t('profile.yourMacros')}</h2>
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

        {/* Intelligent Calorie Calculation */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">Intelligente Kalorienberechnung</h2>
          </div>

          {intelligentCalories && (
            <>
              {/* Main Calculation Results */}
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

              {/* Confidence & Data Quality */}
              <div className="bg-background rounded-xl p-4 shadow-sm border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {intelligentCalories.confidence === 'high' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {intelligentCalories.confidence === 'medium' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                    {intelligentCalories.confidence === 'low' && <AlertCircle className="h-5 w-5 text-red-500" />}
                    <span className="font-medium">
                      Berechnungsgenauigkeit: {
                        intelligentCalories.confidence === 'high' ? 'Hoch' :
                        intelligentCalories.confidence === 'medium' ? 'Mittel' : 'Niedrig'
                      }
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {intelligentCalories.dataQuality.daysOfData} Tage Daten
                  </span>
                </div>

                {/* Data Quality Indicators */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {intelligentCalories.dataQuality.hasWeightHistory ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span>Gewichtsverlauf</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {intelligentCalories.dataQuality.hasMealData ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span>Mahlzeiten-Daten</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {intelligentCalories.dataQuality.hasWorkoutData ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span>Workout-Daten</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {intelligentCalories.dataQuality.hasSleepData ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-gray-400" />}
                    <span>Schlaf-Daten</span>
                  </div>
                </div>

                {/* Metabolic Adaptation Warning */}
                {intelligentCalories.metabolicAdaptation && intelligentCalories.metabolicAdaptation > 0.1 && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="text-orange-700 dark:text-orange-400 text-sm">
                        <div className="font-medium">Metabolische Anpassung erkannt</div>
                        <div className="text-xs mt-1">
                          Ihr Stoffwechsel hat sich um {Math.round(intelligentCalories.metabolicAdaptation * 100)}% verlangsamt.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {intelligentCalories.recommendations && intelligentCalories.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Empfehlungen:</div>
                    {intelligentCalories.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

          {/* Weight Goal Analysis */}
          {weight && targetWeight && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold">{t('profile.weightGoalAnalysisTitle')}</h2>
              </div>

              <div className="bg-background rounded-xl p-4 shadow-sm border">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('profile.weightDifference')}</span>
                    <span className="font-bold">{Math.abs(parseFloat(weight) - parseFloat(targetWeight || "0")).toFixed(1)} kg</span>
                  </div>
                  {targetDate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('profile.timeToGoal')}</span>
                        <span className="font-bold">
                          {Math.max(0, Math.floor((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))} {t('profile.weeks')}
                        </span>
                      </div>
                      {calculateRequiredCalorieDeficit() && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('profile.requiredProgress')}</span>
                          <span className="font-bold">
                            {(Math.abs(parseFloat(weight) - parseFloat(targetWeight || "0")) / Math.max(1, Math.floor((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)))).toFixed(1)} {t('profile.kgPerWeek')}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {calculateRequiredCalorieDeficit() && (
                <div className="bg-background rounded-xl p-4 shadow-sm border">
                  <div className="text-sm font-medium mb-3">{t('profile.requiredCalorieDeficit')}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('profile.daily')}</span>
                      <span className="font-bold">{calculateRequiredCalorieDeficit()?.daily} kcal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('profile.weekly')}</span>
                      <span className="font-bold">{calculateRequiredCalorieDeficit()?.weekly} kcal</span>
                    </div>
                  </div>
                </div>
              )}

              {calculateRequiredCalorieDeficit() && calculateRequiredCalorieDeficit()!.daily > 1000 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-500 mt-0.5">⚠️</div>
                    <div>
                      <div className="text-red-700 dark:text-red-400 font-medium text-sm">
                        {t('profile.ambitiousGoalWarning')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-500 mt-0.5">💡</div>
                  <div className="text-blue-700 dark:text-blue-400 text-sm">
                    {t('profile.calculationNote')}
                  </div>
                </div>
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
  );
};

export default Profile;
