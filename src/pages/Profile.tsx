import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfilePageProps {
  onClose: () => void;
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
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const { user } = useAuth();
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadWeightHistory();
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
        setDisplayName(data.display_name || '');
        setEmail(data.email || '');
        setWeight(data.weight ? data.weight.toString() : '');
        setHeight(data.height ? data.height.toString() : '');
        setAge(data.age ? data.age.toString() : '');
        setGender(data.gender || '');
        setActivityLevel(data.activity_level || 'moderate');
        setGoal(data.goal || 'maintain');
        if (data.preferred_language) {
          setLanguage(data.preferred_language);
        }
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

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
          email: email,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseInt(height) : null,
          age: age ? parseInt(age) : null,
          gender: gender || null,
          activity_level: activityLevel,
          goal: goal,
          preferred_language: language,
        });

      if (error) throw error;

      toast.success(t('profile.saved'));
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(t('profile.error'));
    } finally {
      setLoading(false);
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

  const calculateBMI = () => {
    if (!weight || !height) return null;
    const heightInMeters = parseInt(height) / 100;
    const bmi = parseFloat(weight) / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

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
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;
  const weightTrend = getWeightTrend();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        </div>

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
                  <Label htmlFor="weight">{t('profile.weight')}</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
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

              {/* BMI Display */}
              {bmi && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">BMI:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{bmi}</span>
                      {bmiCategory && (
                        <Badge variant="secondary" className={bmiCategory.color}>
                          {bmiCategory.text}
                        </Badge>
                      )}
                    </div>
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
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{new Date(entry.date).toLocaleDateString()}</span>
                    <span className="font-medium">{entry.weight} kg</span>
                  </div>
                ))}
                {weightHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No weight history yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? t('common.loading') : t('profile.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;