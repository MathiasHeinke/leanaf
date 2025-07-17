import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Minus, Target, Trash2, Save, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BMIProgress from '@/components/BMIProgress';
import { useNavigate } from 'react-router-dom';

interface ProfilePageProps {
  onClose?: () => void;
}

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
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
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');
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
    dailyGoals.fats, dailyGoals.calorieDeficit
  ]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadWeightHistory();
      loadDailyGoals();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

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

  const loadWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('weight_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        setWeightHistory(data.map(entry => ({
          id: entry.id,
          weight: Number(entry.weight),
          date: entry.date
        })));
      }
    } catch (error: any) {
      console.error('Error loading weight history:', error);
    }
  };

  const loadDailyGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user?.id)
        .single();

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

  const handleAddWeight = async () => {
    if (!user || !newWeight) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(newWeight),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update current weight in profile
      await supabase
        .from('profiles')
        .update({ weight: parseFloat(newWeight) })
        .eq('user_id', user.id);

      setWeight(newWeight);
      setNewWeight('');
      toast.success('Weight added successfully!');
      loadWeightHistory();
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Error adding weight');
    }
  };

  const handleDeleteWeight = async (entryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Gewichtseintrag gelöscht!');
      loadWeightHistory();
    } catch (error: any) {
      console.error('Error deleting weight entry:', error);
      toast.error('Fehler beim Löschen des Gewichtseintrags');
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

  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Minus, color: 'text-gray-500', text: 'Stable' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg` };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg` };
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
  const weightTrend = getWeightTrend();

  return (
    <div className="max-w-2xl mx-auto">

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.title')}</CardTitle>
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

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.personalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startWeight">Startgewicht (kg)</Label>
                  <Input
                    id="startWeight"
                    type="number"
                    value={startWeight}
                    onChange={(e) => setStartWeight(e.target.value)}
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
                  <Label htmlFor="age">{t('profile.age')}</Label>
                  <Input
                    id="age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">{t('profile.gender')}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('profile.gender.male')}</SelectItem>
                      <SelectItem value="female">{t('profile.gender.female')}</SelectItem>
                      <SelectItem value="other">{t('profile.gender.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityLevel">{t('profile.activityLevel')}</Label>
                  <Select value={activityLevel} onValueChange={setActivityLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">{t('profile.activity.sedentary')}</SelectItem>
                      <SelectItem value="light">{t('profile.activity.light')}</SelectItem>
                      <SelectItem value="moderate">{t('profile.activity.moderate')}</SelectItem>
                      <SelectItem value="active">{t('profile.activity.active')}</SelectItem>
                      <SelectItem value="very_active">{t('profile.activity.very_active')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">{t('profile.goal')}</Label>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lose">{t('profile.goal.lose')}</SelectItem>
                      <SelectItem value="maintain">{t('profile.goal.maintain')}</SelectItem>
                      <SelectItem value="gain">{t('profile.goal.gain')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Weight Goal Section */}
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

              {/* BMI Progress Section */}
              {startWeight && weight && targetWeight && height && (
                <>
                  <Separator />
                  <BMIProgress 
                    startWeight={parseFloat(startWeight)}
                    currentWeight={parseFloat(weight)}
                    targetWeight={parseFloat(targetWeight)}
                    height={parseInt(height)}
                  />
                </>
              )}

              {/* Calorie Goals Section */}
              <Separator />
              <div>
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Kalorienberechnung
                </h4>
                
                {/* Maintenance Calories Display */}
                {calculateMaintenanceCalories() && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-sm font-medium text-blue-700">Grundumsatz (BMR)</div>
                      <div className="text-lg font-bold text-blue-800">{calculateBMR()?.toFixed(0)} kcal</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-sm font-medium text-green-700">Gesamtumsatz</div>
                      <div className="text-lg font-bold text-green-800">{calculateMaintenanceCalories()} kcal</div>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                      <div className="text-sm font-medium text-primary">Zielkalorien</div>
                      <div className="text-lg font-bold text-primary">{calculateTargetCalories()} kcal</div>
                    </div>
                  </div>
                )}

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
                      {goal === 'lose' ? 'Kalorien unter Gesamtumsatz' : goal === 'gain' ? 'Kalorien über Gesamtumsatz' : 'Kalorienanpassung'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Makronährstoff-Verteilung (%)</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proteinPercent" className="text-xs">Protein</Label>
                        <Input
                          id="proteinPercent"
                          type="number"
                          value={dailyGoals.protein}
                          onChange={(e) => setDailyGoals({...dailyGoals, protein: Number(e.target.value)})}
                          placeholder="30"
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
                          placeholder="40"
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
                          placeholder="30"
                          min="15"
                          max="50"
                        />
                        <p className="text-xs text-muted-foreground">{calculateMacroGrams().fats}g</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Gesamt: {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats}% 
                      {dailyGoals.protein + dailyGoals.carbs + dailyGoals.fats !== 100 && (
                        <span className="text-red-500 ml-1">(sollte 100% sein)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Weight Goal Estimation */}
              {weight && targetWeight && targetDate && (
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Gewichtsziel-Schätzung</h4>
                    {autoCalculated && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => autoCalculateGoals()}
                        className="text-xs"
                      >
                        Neu berechnen
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-sm space-y-2">
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
                        return <span className="text-amber-600">Zieldatum ist bereits erreicht oder überschritten</span>;
                      }
                      
                      // Safe weekly weight loss/gain: 0.5-1kg per week
                      const weeklyTarget = weightDiff / weeksLeft;
                      const isHealthy = weeklyTarget <= 1;
                      
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p><span className="font-medium">Gewichtsdifferenz:</span> {weightDiff.toFixed(1)} kg</p>
                              <p><span className="font-medium">Zeit bis zum Ziel:</span> {weeksLeft} Wochen</p>
                              <p><span className="font-medium">Benötigter Fortschritt:</span> {weeklyTarget.toFixed(1)} kg/Woche</p>
                            </div>
                            
                            {requiredDeficit && (
                              <div className="bg-white/50 p-3 rounded-lg">
                                <p className="font-medium mb-1">Benötigtes Kaloriendefizit:</p>
                                <p className="text-xs"><span className="font-medium">Täglich:</span> {requiredDeficit.daily} kcal</p>
                                <p className="text-xs"><span className="font-medium">Wöchentlich:</span> {requiredDeficit.weekly} kcal</p>
                                <p className="text-xs text-muted-foreground">Gesamt: {requiredDeficit.total.toLocaleString()} kcal</p>
                              </div>
                            )}
                          </div>
                          
                          <div className={`p-2 rounded ${isHealthy ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {isHealthy 
                              ? '✓ Realistisches und gesundes Ziel' 
                              : '⚠ Sehr ambitioniertes Ziel - empfohlen: max. 1kg/Woche'
                            }
                          </div>
                          
                          {autoCalculated && (
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                              💡 Die Kaloriendefizit- und Makrowerte wurden automatisch basierend auf deinem Ziel berechnet
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weight History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t('profile.weightHistory')}
                {weightTrend && (
                  <div className={`flex items-center gap-1 ${weightTrend.color}`}>
                    <weightTrend.icon className="h-4 w-4" />
                    <span className="text-sm">{weightTrend.text}</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWeight();
                    }
                  }}
                  placeholder={t('profile.currentWeight')}
                  className="flex-1"
                />
                <Button onClick={handleAddWeight} disabled={!newWeight}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('profile.addWeight')}
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                {weightHistory.map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('de-DE')}
                      </span>
                      <span className="font-medium">{entry.weight} kg</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWeight(entry.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {weightHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Noch keine Gewichtseinträge vorhanden
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manual Save Button - now optional */}
           <Button onClick={handleSave} disabled={loading} className="w-full" variant="outline">
             <Save className="h-4 w-4 mr-2" />
             {loading ? t('common.loading') : 'Manuell speichern'}
           </Button>
         </div>
       </div>
     );
   };

   export default Profile;
