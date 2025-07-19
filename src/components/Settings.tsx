
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Target, Save } from "lucide-react";

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface SettingsProps {
  dailyGoal: DailyGoal;
  onGoalChange: (goal: DailyGoal) => void;
  onClose: () => void;
}

const Settings = ({ dailyGoal, onGoalChange, onClose }: SettingsProps) => {
  const [goal, setGoal] = useState(dailyGoal.calories.toString());
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleSave = async () => {
    if (!user) return;

    const newGoal = parseInt(goal);
    if (newGoal < 800 || newGoal > 5000) {
      toast({
        title: t('settings.invalidGoal'),
        description: t('settings.goalRange'),
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Save to database
      const { error } = await supabase
        .from('daily_goals')
        .upsert({
          user_id: user.id,
          calories: newGoal,
          protein: dailyGoal.protein,
          carbs: dailyGoal.carbs,
          fats: dailyGoal.fats,
        });

      if (error) throw error;

      // Update local state
      onGoalChange({
        ...dailyGoal,
        calories: newGoal
      });
      
      toast({
        title: t('settings.goalSaved'),
        description: t('settings.newDailyGoal').replace('{calories}', newGoal.toString())
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      toast({
        title: t('common.error'),
        description: t('profile.error'),
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-primary to-primary-glow p-2 rounded-lg">
            <SettingsIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold">{t('settings.title')}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('settings.close')}
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="daily-goal" className="text-base font-medium">
            {t('settings.dailyCalorieGoal')}
          </Label>
          <div className="flex items-center gap-3 mt-2">
            <Target className="h-5 w-5 text-primary" />
            <Input
              id="daily-goal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              min="800"
              max="5000"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">{t('ui.kcal')}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('settings.recommended')}
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button variant="hero" onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {t('settings.saveGoal')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Settings;
