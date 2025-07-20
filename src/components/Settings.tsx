
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutoDarkMode } from "@/hooks/useAutoDarkMode";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Target, Save, Moon, Sun, Clock } from "lucide-react";

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
  const { autoSettings, saveSettings, toggleTheme, getThemeStatus, isWithinDarkModeHours } = useAutoDarkMode();

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
        description: t('settings.saveError'),
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

        {/* Dark Mode Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-lg">
                <Moon className="h-5 w-5 text-white" />
              </div>
              <div>
                <Label className="text-base font-medium">{t('settings.darkMode')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.darkModeDesc')}</p>
              </div>
            </div>
            <Switch
              checked={autoSettings.enabled}
              onCheckedChange={(enabled) => saveSettings({ ...autoSettings, enabled })}
            />
          </div>
          
          {autoSettings.enabled && (
            <div className="ml-12 space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span>{t('settings.activeTime')}: {autoSettings.startTime} - {autoSettings.endTime}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleTheme}
                  className="flex items-center gap-2"
                >
                  {getThemeStatus().current === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {t('settings.toggleTheme')}
                </Button>
                
                {isWithinDarkModeHours && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {t('settings.autoActive')}
                  </span>
                )}
              </div>
            </div>
          )}
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
