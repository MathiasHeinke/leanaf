import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Target, Calendar, Flame, TrendingUp, TrendingDown, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { getGoalStatus, getGoalBasedProgressMessage, UserGoal } from "@/utils/goalBasedMessaging";
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { InfoButton } from "@/components/InfoButton";

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DailyProgressProps {
  dailyTotals: DailyTotals;
  dailyGoal: DailyGoal;
  userGoal?: UserGoal;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

interface OverallStatus {
  status: 'success' | 'warning' | 'danger';
  message: string;
  color: string;
  bgColor: string;
  icon: string;
  hasMacroWarnings: boolean;
  macroWarnings: string[];
}

const getOverallStatus = (
  dailyTotals: DailyTotals,
  dailyGoal: DailyGoal,
  userGoal: UserGoal,
  t: (key: string) => string
): OverallStatus => {
  const proteinPercentage = (dailyTotals.protein / dailyGoal.protein) * 100;
  const carbsPercentage = (dailyTotals.carbs / dailyGoal.carbs) * 100;
  const fatsPercentage = (dailyTotals.fats / dailyGoal.fats) * 100;
  
  const macroWarnings: string[] = [];
  
  // Check for significant macro excesses (>120%)
  if (proteinPercentage > 120) {
    macroWarnings.push(t('macros.protein'));
  }
  if (carbsPercentage > 120) {
    macroWarnings.push(t('macros.carbs'));
  }
  if (fatsPercentage > 120) {
    macroWarnings.push(t('macros.fats'));
  }
  
  const hasMacroWarnings = macroWarnings.length > 0;
  
  // Priority 1: Critical macro warnings
  if (hasMacroWarnings) {
    const warningText = macroWarnings.length === 1 
      ? `${macroWarnings[0]} ${t('progress.exceeded')}`
      : `${macroWarnings.join(' und ')} ${t('progress.exceeded')}`;
    
    return {
      status: 'danger',
      message: `⚠️ ${t('coach.warning')}: ${warningText}`,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50/30 dark:bg-red-950/30',
      icon: '⚠️',
      hasMacroWarnings: true,
      macroWarnings
    };
  }
  
  // Priority 2: Normal calorie-based status
  const calorieStatus = getGoalStatus(dailyTotals.calories, dailyGoal.calories, userGoal);
  
  return {
    status: calorieStatus.status,
    message: calorieStatus.motivationalMessage,
    color: calorieStatus.color.includes('yellow') ? 'text-amber-600 dark:text-amber-400' : calorieStatus.color,
    bgColor: calorieStatus.bgColor.includes('yellow') ? 'bg-amber-50/20 dark:bg-amber-950/30' : calorieStatus.bgColor.replace('bg-', 'bg-').replace('/5', '/10'),
    icon: calorieStatus.icon,
    hasMacroWarnings: false,
    macroWarnings: []
  };
};

export const DailyProgress = ({ 
  dailyTotals, 
  dailyGoal, 
  userGoal = 'maintain',
  currentDate,
  onDateChange
}: DailyProgressProps) => {
  const { t, language } = useTranslation();

  const formatDate = (date: Date): string => {
    const locale = language === 'de' ? de : enUS;
    return format(date, 'EEEE, d. MMMM', { locale });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  const calorieProgress = (dailyTotals.calories / dailyGoal.calories) * 100;
  const proteinProgress = (dailyTotals.protein / dailyGoal.protein) * 100;
  const carbsProgress = (dailyTotals.carbs / dailyGoal.carbs) * 100;
  const fatsProgress = (dailyTotals.fats / dailyGoal.fats) * 100;

  const remainingCalories = dailyGoal.calories - dailyTotals.calories;
  const remainingProtein = dailyGoal.protein - dailyTotals.protein;
  const remainingCarbs = dailyGoal.carbs - dailyTotals.carbs;
  const remainingFats = dailyGoal.fats - dailyTotals.fats;

  const caloriesExceeded = dailyTotals.calories > dailyGoal.calories;
  const proteinExceeded = dailyTotals.protein > dailyGoal.protein;
  const carbsExceeded = dailyTotals.carbs > dailyGoal.carbs;
  const fatsExceeded = dailyTotals.fats > dailyGoal.fats;

  const goalStatus = getGoalStatus(dailyTotals.calories, dailyGoal.calories, userGoal);
  const overallStatus = getOverallStatus(dailyTotals, dailyGoal, userGoal, t);

  return (
    <div className="space-y-6">
      {/* Hero Calorie Section with Integrated Date Navigation */}
      <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-primary-glow/5 rounded-3xl border border-primary/10 backdrop-blur-sm hover-lift smooth-transition">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">{t('app.dailyProgress')}</span>
          </div>
          <div className="flex items-center gap-2">
            <InfoButton
              title="Kalorien & Makro Tracking"
              description="Präzises Tracking deiner Kalorien und Makronährstoffe ist der Schlüssel für nachhaltigen Erfolg. Jeder Makronährstoff hat eine spezielle Funktion für deinen Körper."
              scientificBasis="Studien zeigen: Ein moderates Kaloriendefizit von 300-500 kcal führt zu 0,3-0,5kg Gewichtsverlust pro Woche bei optimaler Muskelerhaltung."
              tips={[
                "Protein: 1,6-2,2g pro kg Körpergewicht für Muskelerhalt",
                "Kohlenhydrate: Energie für Training und Gehirn",
                "Fette: 0,8-1,2g pro kg für Hormonproduktion"
              ]}
            />
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToToday}>
                {t('date.today')}
              </Button>
            )}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4 p-3 bg-white/50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/30 dark:border-gray-700/30">
          <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="font-semibold text-base">{formatDate(currentDate)}</div>
            {isToday && (
              <div className="text-sm text-primary font-medium">{t('date.today')}</div>
            )}
          </div>
          
          <Button variant="ghost" size="sm" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">
              {dailyTotals.calories}
              <span className="text-xl text-muted-foreground font-normal">/{dailyGoal.calories}</span>
            </div>
            <div className="text-sm text-muted-foreground font-medium">{t('progress.caloriesConsumed')}</div>
          </div>
          
          <div className="space-y-3">
            <Progress 
              value={Math.min(calorieProgress, 100)} 
              className={`h-3 rounded-full ${caloriesExceeded ? '[&>div]:bg-red-500' : ''}`} 
            />
            
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Flame className="h-4 w-4 text-primary" />
              </div>
              <span className={goalStatus.color}>
                {userGoal === 'lose' && remainingCalories > 0 ? 
                  `${remainingCalories} ${t('ui.kcal')} ${t('progress.remaining')}` :
                  userGoal === 'lose' && remainingCalories < 0 ?
                  `${Math.abs(remainingCalories)} ${t('ui.kcal')} ${t('progress.overGoal')}` :
                  userGoal === 'gain' && remainingCalories > 0 ?
                  `${remainingCalories} ${t('ui.kcal')} ${t('progress.stillNeed')}` :
                  userGoal === 'gain' && remainingCalories < 0 ?
                  `${t('progress.goalReached')} ${Math.abs(remainingCalories)} ${t('ui.kcal')} ${t('progress.over')} ${t('ui.goal')}` :
                  remainingCalories > 0 ? `${remainingCalories} ${t('ui.kcal')} ${t('progress.remaining')}` : `${Math.abs(remainingCalories)} ${t('ui.kcal')} ${t('progress.exceeded')}`
                }
              </span>
              {goalStatus.status === 'success' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {/* Enhanced motivational message with macro warnings */}
            <div className={`flex items-center justify-center gap-2 text-sm font-medium mt-4 p-3 rounded-xl ${overallStatus.bgColor} ${overallStatus.color}`}>
              <span className="text-base">{overallStatus.icon}</span>
              <div className="text-center leading-relaxed">
                <div>{overallStatus.message}</div>
                {overallStatus.hasMacroWarnings && language === 'de' && (
                  <div className="text-xs mt-1 opacity-80">
                    Morgen auf ausgewogene Balance achten!
                  </div>
                )}
                {overallStatus.hasMacroWarnings && language === 'en' && (
                  <div className="text-xs mt-1 opacity-80">
                    Focus on balanced nutrition tomorrow!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros Grid - Modern Clean Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Protein */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
          proteinExceeded 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50' 
            : 'bg-protein-light dark:bg-protein-light border-protein/20 dark:border-protein/30'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${proteinExceeded ? 'text-red-600 dark:text-red-400' : 'text-protein'}`}>
            {t('macros.protein')}
          </div>
          <div className={`text-2xl font-bold mb-2 ${proteinExceeded ? 'text-red-600 dark:text-red-400' : 'text-protein'}`}>
            {dailyTotals.protein}<span className="text-sm font-normal opacity-70">{t('ui.gram')}</span>
          </div>
          <Progress 
            value={Math.min(proteinProgress, 100)} 
            className={`h-1.5 mb-2 ${proteinExceeded ? '[&>div]:bg-red-500' : '[&>div]:bg-protein'}`} 
          />
          <div className={`text-xs font-medium ${proteinExceeded ? 'text-red-600 dark:text-red-400' : 'text-protein/80'}`}>
            {remainingProtein > 0 ? `+${Math.round(remainingProtein)}${t('ui.gram')}` : `${Math.round(Math.abs(remainingProtein))}${t('ui.gram')} ${t('ui.over')}`}
          </div>
        </div>

        {/* Carbs */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
          carbsExceeded 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50' 
            : 'bg-carbs-light dark:bg-carbs-light border-carbs/20 dark:border-carbs/30'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${carbsExceeded ? 'text-red-600 dark:text-red-400' : 'text-carbs'}`}>
            {t('macros.carbs')}
          </div>
          <div className={`text-2xl font-bold mb-2 ${carbsExceeded ? 'text-red-600 dark:text-red-400' : 'text-carbs'}`}>
            {dailyTotals.carbs}<span className="text-sm font-normal opacity-70">{t('ui.gram')}</span>
          </div>
          <Progress 
            value={Math.min(carbsProgress, 100)} 
            className={`h-1.5 mb-2 ${carbsExceeded ? '[&>div]:bg-red-500' : '[&>div]:bg-carbs'}`} 
          />
          <div className={`text-xs font-medium ${carbsExceeded ? 'text-red-600 dark:text-red-400' : 'text-carbs/80'}`}>
            {remainingCarbs > 0 ? `+${Math.round(remainingCarbs)}${t('ui.gram')}` : `${Math.round(Math.abs(remainingCarbs))}${t('ui.gram')} ${t('ui.over')}`}
          </div>
        </div>

        {/* Fats */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
          fatsExceeded 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50' 
            : 'bg-fats-light dark:bg-fats-light border-fats/20 dark:border-fats/30'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${fatsExceeded ? 'text-red-600 dark:text-red-400' : 'text-fats'}`}>
            {t('macros.fats')}
          </div>
          <div className={`text-2xl font-bold mb-2 ${fatsExceeded ? 'text-red-600 dark:text-red-400' : 'text-fats'}`}>
            {dailyTotals.fats}<span className="text-sm font-normal opacity-70">{t('ui.gram')}</span>
          </div>
          <Progress 
            value={Math.min(fatsProgress, 100)} 
            className={`h-1.5 mb-2 ${fatsExceeded ? '[&>div]:bg-red-500' : '[&>div]:bg-fats'}`} 
          />
          <div className={`text-xs font-medium ${fatsExceeded ? 'text-red-600 dark:text-red-400' : 'text-fats/80'}`}>
            {remainingFats > 0 ? `+${Math.round(remainingFats)}${t('ui.gram')}` : `${Math.round(Math.abs(remainingFats))}${t('ui.gram')} ${t('ui.over')}`}
          </div>
        </div>
      </div>

    </div>
  );
};
