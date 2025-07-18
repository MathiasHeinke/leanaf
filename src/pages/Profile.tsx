import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Save, Check, Bot, Settings, Zap, Users, Brain, Activity, Dumbbell, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

interface ProfilePageProps {
  onClose?: () => void;
}


const Profile = ({ onClose }: ProfilePageProps) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
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
    protein: 30, // Percentage
    carbs: 40,   // Percentage  
    fats: 30,    // Percentage
    calorieDeficit: 300 // Calories below maintenance
  });
  const [autoCalculated, setAutoCalculated] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  
  // New Coach Settings State
  const [coachPersonality, setCoachPersonality] = useState('motivierend');
  const [muscleMaintenancePriority, setMuscleMaintenancePriority] = useState(false);
  const [macroStrategy, setMacroStrategy] = useState('standard');
  
  const { user } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/');
    }
  };

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
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [
    displayName, email, weight, startWeight, height, age, gender, 
    activityLevel, goal, targetWeight, targetDate, language,
    dailyGoals.calories, dailyGoals.protein, dailyGoals.carbs, 
    dailyGoals.fats, dailyGoals.calorieDeficit,
    coachPersonality, muscleMaintenancePriority, macroStrategy
  ]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadDailyGoals();
    }
  }, [user]);

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
        setEmail(data.email || '');
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
      toast.error(t('profile.error'));
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
      protein: Math.round((targetCalories * dailyGoals.protein / 100) / 4), // 4 cal/g
      carbs: Math.round((targetCalories * dailyGoals.carbs / 100) / 4), // 4 cal/g
      fats: Math.round((targetCalories * dailyGoals.fats / 100) / 9), // 9 cal/g
    };
  };

  const calculateBMI = (weightValue?: string, heightValue?: string) => {
    const w = weightValue || weight;
    const h = heightValue || height;
    if (!w || !h) return null;
    const heightInMeters = parseInt(h) / 100;
    const bmi = parseFloat(w) / (heightInMeters * heightInMeters);
    return parseFloat(bmi.toFixed(1));
  };

  const performSave = async () => {
    if (!user) return;

    // Calculate all values
    const bmr = calculateBMR();
    const tdee = calculateMaintenanceCalories();
    const targetCalories = calculateTargetCalories();
    const macroGrams = calculateMacroGrams();
    
    // Calculate BMI values
    const currentBMI = calculateBMI();
    const startBMI = calculateBMI(startWeight, height);
    const targetBMI = calculateBMI(targetWeight, height);

    // Prepare profile data
    const profileData = {
      user_id: user.id,
      display_name: displayName,
      email: email,
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
      start_bmi: startBMI,
      current_bmi: currentBMI,
      target_bmi: targetBMI,
      coach_personality: coachPersonality,
      muscle_maintenance_priority: muscleMaintenancePriority,
      macro_strategy: macroStrategy,
    };

    // Handle profile creation/update separately
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

    // Update daily goals with all calculated values
    const { error: goalsError } = await supabase
      .from('daily_goals')
      .upsert({
        user_id: user.id,
        calories: targetCalories,
        protein: macroGrams.protein,  // Keep existing columns for grams
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
      console.error('Goals error:', goalsError);
      throw goalsError;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await performSave();
      toast.success(t('profile.saved'));
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(t('profile.error'));
    } finally {
      setLoading(false);
    }
  };

  // Add Enter key handler for saving
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
  };


  const calculateRequiredCalorieDeficit = () => {
    if (!weight || !targetWeight || !targetDate) return null;
    
    const currentWeight = parseFloat(weight);
    const goalWeight = parseFloat(targetWeight);
    const weightDiff = Math.abs(currentWeight - goalWeight);
    const targetDateObj = new Date(targetDate);
    const today = new Date();
    const timeDiff = Math.max(0, (targetDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weeksLeft = Math.floor(timeDiff / 7);
    
    if (timeDiff <= 0 || weeksLeft === 0) return null;
    
    // 1kg fat = ~7700 calories
    const totalCalorieDeficit = weightDiff * 7700;
    const dailyCalorieDeficit = Math.round(totalCalorieDeficit / timeDiff);
    
    return {
      daily: dailyCalorieDeficit,
      weekly: Math.round(dailyCalorieDeficit * 7),
      total: Math.round(totalCalorieDeficit)
    };
  };

  const getDefaultMacrosByGoal = () => {
    switch (goal) {
      case 'lose':
        return { protein: 35, carbs: 30, fats: 35 }; // Higher protein for muscle preservation
      case 'gain':
        return { protein: 25, carbs: 50, fats: 25 }; // Higher carbs for muscle building
      default:
        return { protein: 30, carbs: 40, fats: 30 }; // Balanced for maintenance
    }
  };

  const autoCalculateGoals = () => {
    if (!weight || !targetWeight || !targetDate) return;
    
    const requiredDeficit = calculateRequiredCalorieDeficit();
    if (!requiredDeficit) return;
    
    const defaultMacros = getDefaultMacrosByGoal();
    
    setDailyGoals({
      ...dailyGoals,
      calorieDeficit: requiredDeficit.daily,
      protein: defaultMacros.protein,
      carbs: defaultMacros.carbs,
      fats: defaultMacros.fats
    });
    
    setAutoCalculated(true);
  };

  // Apply macro strategy templates
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

  // Auto-calculate when target weight, date, or goal changes
  useEffect(() => {
    if (weight && targetWeight && targetDate && goal) {
      autoCalculateGoals();
    }
  }, [weight, targetWeight, targetDate, goal]);

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Underweight', color: 'text-blue-500' };
    if (bmi < 25) return { text: 'Normal', color: 'text-green-500' };
    if (bmi < 30) return { text: 'Overweight', color: 'text-yellow-500' };
    return { text: 'Obese', color: 'text-red-500' };
  };


  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="max-w-2xl mx-auto pb-20">
        <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full" />
              </div>
              {t('profile.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('profile.displayName')}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('profile.displayName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('profile.email')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('profile.language')}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">{t('settings.german')}</SelectItem>
                  <SelectItem value="en">{t('settings.english')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Body Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full" />
              </div>
              {t('profile.bodyMetrics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startWeight">{t('profile.startWeight')}</Label>
                <Input
                  id="startWeight"
                  type="number"
                  value={startWeight}
                  onChange={(e) => setStartWeight(e.target.value)}
                  placeholder="75"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">{t('profile.weight')}</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="75"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">{t('profile.height')}</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Alter</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                />
              </div>
            </div>

            {/* BMI Display */}
            {bmi && (
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">BMI</span>
                  <div className="text-right">
                    <span className="text-lg font-bold">{bmi}</span>
                    <span className={`text-xs ml-2 ${bmiCategory?.color}`}>
                      {bmiCategory?.text}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach-Einstellungen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              {t('profile.coachSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Coach Persönlichkeit */}
            <div className="space-y-3">
              <Label htmlFor="coachPersonality">{t('profile.coachPersonality')}</Label>
              <Select value={coachPersonality} onValueChange={setCoachPersonality}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hart">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-red-500" />
                      <div>
                        <div className="font-medium">Hart & Direkt</div>
                        <div className="text-xs text-muted-foreground">Keine Kompromisse, klare Ansagen</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="soft">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      <div>
                        <div className="font-medium">Sanft & Verständnisvoll</div>
                        <div className="text-xs text-muted-foreground">Einfühlsam und unterstützend</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="lustig">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="font-medium">Lustig & Locker</div>
                        <div className="text-xs text-muted-foreground">Mit Humor und guter Laune</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="ironisch">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="font-medium">Ironisch & Sarkastisch</div>
                        <div className="text-xs text-muted-foreground">Mit einem Augenzwinkern</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="motivierend">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Motivierend & Positiv</div>
                        <div className="text-xs text-muted-foreground">Immer aufbauend und ermutigend</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="p-3 bg-accent/10 rounded-lg text-sm">
                <div className="font-medium mb-1">Vorschau:</div>
                <div className="text-muted-foreground italic">
                  {coachPersonality === 'hart' && "\"Du hast dein Ziel heute nicht erreicht? Dann streng dich morgen mehr an!\""}
                  {coachPersonality === 'soft' && "\"Hab Geduld mit dir. Jeder Schritt zählt und du machst das großartig.\""}
                  {coachPersonality === 'lustig' && "\"Deine Makros waren heute wie ein schlechter Witz - aber hey, morgen wird besser! 😄\""}
                  {coachPersonality === 'ironisch' && "\"Interessante Makro-Verteilung heute... als ob Schokolade ein Gemüse wäre.\""}
                  {coachPersonality === 'motivierend' && "\"Du rockst das! Jeder Tag bringt dich näher zu deinem Ziel! 💪\""}
                </div>
              </div>
            </div>

            {/* Muskelerhalt Priorität */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label htmlFor="muscleMaintenancePriority" className="text-base font-medium">
                    Muskelerhalt priorisieren
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Höhere Protein-Empfehlungen und kraftsport-optimierte Tipps
                  </p>
                </div>
              </div>
              <Switch
                id="muscleMaintenancePriority"
                checked={muscleMaintenancePriority}
                onCheckedChange={setMuscleMaintenancePriority}
              />
            </div>
          </CardContent>
        </Card>

        {/* Erweiterte Makro-Strategien */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-500" />
              {t('profile.macroStrategies')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="macroStrategy">Makronährstoff-Strategie wählen</Label>
              <Select value={macroStrategy} onValueChange={(value) => {
                setMacroStrategy(value);
                if (value !== 'custom') {
                  applyMacroStrategy(value);
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">
                    <div>
                      <div className="font-medium">Standard (30/40/30)</div>
                      <div className="text-xs text-muted-foreground">Ausgewogene Verteilung für allgemeine Fitness</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="high_protein">
                    <div>
                      <div className="font-medium">High Protein (40/30/30)</div>
                      <div className="text-xs text-muted-foreground">Für Muskelaufbau und -erhalt</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div>
                      <div className="font-medium">Balanced (25/45/30)</div>
                      <div className="text-xs text-muted-foreground">Mehr Kohlenhydrate für Ausdauersport</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="low_carb">
                    <div>
                      <div className="font-medium">Low Carb (35/20/45)</div>
                      <div className="text-xs text-muted-foreground">Weniger Kohlenhydrate, mehr Fette</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="athletic">
                    <div>
                      <div className="font-medium">Athletic (30/50/20)</div>
                      <div className="text-xs text-muted-foreground">Für intensive Trainingseinheiten</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div>
                      <div className="font-medium">Custom</div>
                      <div className="text-xs text-muted-foreground">Individuelle Anpassung</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Makro-Vorschau */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg border">
              <div className="text-center">
                <div className="text-2xl font-bold text-protein">{dailyGoals.protein}%</div>
                <div className="text-sm text-muted-foreground">Protein</div>
                <div className="text-xs text-protein font-medium">{calculateMacroGrams().protein}g</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-carbs">{dailyGoals.carbs}%</div>
                <div className="text-sm text-muted-foreground">Carbs</div>
                <div className="text-xs text-carbs font-medium">{calculateMacroGrams().carbs}g</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-fats">{dailyGoals.fats}%</div>
                <div className="text-sm text-muted-foreground">Fette</div>
                <div className="text-xs text-fats font-medium">{calculateMacroGrams().fats}g</div>
              </div>
            </div>

            {macroStrategy === 'custom' && (
              <div className="space-y-4 p-4 border border-dashed border-muted-foreground/30 rounded-lg">
                <div className="text-sm font-medium text-center text-muted-foreground">
                  Individuelle Anpassung
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proteinPercent" className="text-xs">Protein (%)</Label>
                    <Input
                      id="proteinPercent"
                      type="number"
                      value={dailyGoals.protein}
                      onChange={(e) => setDailyGoals({...dailyGoals, protein: Number(e.target.value)})}
                      min="10"
                      max="50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbsPercent" className="text-xs">Kohlenhydrate (%)</Label>
                    <Input
                      id="carbsPercent"
                      type="number"
                      value={dailyGoals.carbs}
                      onChange={(e) => setDailyGoals({...dailyGoals, carbs: Number(e.target.value)})}
                      min="20"
                      max="70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatsPercent" className="text-xs">Fette (%)</Label>
                    <Input
                      id="fatsPercent"
                      type="number"
                      value={dailyGoals.fats}
                      onChange={(e) => setDailyGoals({...dailyGoals, fats: Number(e.target.value)})}
                      min="15"
                      max="50"
                    />
                  </div>
                </div>
                <div className="text-xs text-center">
                  Gesamt: {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats}% 
                  {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats !== 100 && (
                    <span className="text-red-500 ml-1">(sollte 100% sein)</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity & Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Aktivität & Ziele
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">{t('profile.gender')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="male">{t('profile.gender.male')}</SelectItem>
                  <SelectItem value="female">{t('profile.gender.female')}</SelectItem>
                    <SelectItem value="other">Andere</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityLevel">Aktivitätslevel</Label>
                <Select value={activityLevel} onValueChange={setActivityLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Wenig aktiv</SelectItem>
                    <SelectItem value="light">Leicht aktiv</SelectItem>
                    <SelectItem value="moderate">Mäßig aktiv</SelectItem>
                    <SelectItem value="active">Sehr aktiv</SelectItem>
                    <SelectItem value="very_active">Extrem aktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Ziel</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose">Abnehmen</SelectItem>
                    <SelectItem value="maintain">Halten</SelectItem>
                    <SelectItem value="gain">Zunehmen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetWeight">Zielgewicht (kg)</Label>
                <Input
                  id="targetWeight"
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="65"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Zieldatum</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calorie Calculation */}
        {calculateMaintenanceCalories() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-5 w-5 bg-orange-500 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
                {t('profile.calorieCalculation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-sm font-medium text-blue-700">{t('profile.bmr')}</div>
                  <div className="text-xl font-bold text-blue-800">{calculateBMR()?.toFixed(0)} kcal</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-sm font-medium text-green-700">{t('profile.tdee')}</div>
                  <div className="text-xl font-bold text-green-800">{calculateMaintenanceCalories()} kcal</div>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <div className="text-sm font-medium text-primary">{t('profile.targetCalories')}</div>
                  <div className="text-xl font-bold text-primary">{calculateTargetCalories()} kcal</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="calorieDeficit">
                    {goal === 'lose' ? 'Kaloriendefizit' : goal === 'gain' ? 'Kalorienüberschuss' : 'Kalorienanpassung'}
                  </Label>
                  <Input
                    id="calorieDeficit"
                    type="number"
                    value={dailyGoals.calorieDeficit}
                    onChange={(e) => setDailyGoals({...dailyGoals, calorieDeficit: Number(e.target.value)})}
                    placeholder="300"
                  />
                  <p className="text-xs text-muted-foreground">
                    {goal === 'lose' ? t('profile.calorieDeficit') : goal === 'gain' ? t('profile.calorieOverage') : t('profile.calorieAdjustment')}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">{t('profile.macroDistribution')}</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="proteinPercent" className="text-xs">Protein</Label>
                      <Input
                        id="proteinPercent"
                        type="number"
                        value={dailyGoals.protein}
                        onChange={(e) => setDailyGoals({...dailyGoals, protein: Number(e.target.value)})}
                        min="10"
                        max="50"
                      />
                      <p className="text-xs text-muted-foreground">{calculateMacroGrams().protein}g</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carbsPercent" className="text-xs">Kohlenhydrate</Label>
                      <Input
                        id="carbsPercent"
                        type="number"
                        value={dailyGoals.carbs}
                        onChange={(e) => setDailyGoals({...dailyGoals, carbs: Number(e.target.value)})}
                        min="20"
                        max="70"
                      />
                      <p className="text-xs text-muted-foreground">{calculateMacroGrams().carbs}g</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fatsPercent" className="text-xs">Fette</Label>
                      <Input
                        id="fatsPercent"
                        type="number"
                        value={dailyGoals.fats}
                        onChange={(e) => setDailyGoals({...dailyGoals, fats: Number(e.target.value)})}
                        min="15"
                        max="50"
                      />
                      <p className="text-xs text-muted-foreground">{calculateMacroGrams().fats}g</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-center">
                    Gesamt: {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats}% 
                    {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats !== 100 && (
                      <span className="text-red-500 ml-1">(sollte 100% sein)</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weight Goal Estimation */}
        {weight && targetWeight && targetDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-5 w-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
                Gewichtsziel-Analyse
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentWeight = parseFloat(weight);
                const goalWeight = parseFloat(targetWeight);
                const weightDiff = Math.abs(currentWeight - goalWeight);
                const targetDateObj = new Date(targetDate);
                const today = new Date();
                const timeDiff = Math.max(0, (targetDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const weeksLeft = Math.floor(timeDiff / 7);
                const requiredDeficit = calculateRequiredCalorieDeficit();
                
                if (timeDiff <= 0) {
                  return (
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <span className="text-amber-600 font-medium">Zieldatum ist bereits erreicht oder überschritten</span>
                    </div>
                  );
                }
                
                const weeklyTarget = weightDiff / weeksLeft;
                const isHealthy = weeklyTarget <= 1;
                
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-accent/10 rounded-lg">
                        <p><span className="font-medium">Gewichtsdifferenz:</span> {weightDiff.toFixed(1)} kg</p>
                        <p><span className="font-medium">Zeit bis zum Ziel:</span> {weeksLeft} Wochen</p>
                        <p><span className="font-medium">Benötigter Fortschritt:</span> {weeklyTarget.toFixed(1)} kg/Woche</p>
                      </div>
                      
                      {requiredDeficit && (
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <p className="font-medium mb-2">Benötigtes Kaloriendefizit:</p>
                          <p className="text-sm"><span className="font-medium">Täglich:</span> {requiredDeficit.daily} kcal</p>
                          <p className="text-sm"><span className="font-medium">Wöchentlich:</span> {requiredDeficit.weekly} kcal</p>
                        </div>
                      )}
                    </div>
                    
                    <div className={`p-3 rounded-lg text-center ${isHealthy ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {isHealthy 
                        ? '✓ Realistisches und gesundes Ziel' 
                        : '⚠ Sehr ambitioniertes Ziel - empfohlen: max. 1kg/Woche'
                      }
                    </div>
                    
                    {autoCalculated && (
                      <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg text-center">
                        💡 Die Werte wurden automatisch basierend auf deinem Ziel berechnet
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Auto-save Status */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {autoSaving ? (
              <>
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                Speichere...
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Zuletzt gespeichert: {lastSaved.toLocaleTimeString()}
              </>
            ) : (
              <>
                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                Änderungen werden automatisch gespeichert
              </>
            )}
          </div>
          <Button onClick={handleSave} disabled={loading} variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Speichere...' : 'Manuell speichern'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;