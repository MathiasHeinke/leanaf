import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Target, Calendar, Flame, TrendingUp, TrendingDown, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { getGoalStatus, getGoalBasedProgressMessage, UserGoal } from "@/utils/goalBasedMessaging";
import { RandomQuote } from "@/components/RandomQuote";
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
  userProfile?: any;
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
  onDateChange,
  userProfile
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
      {/* Integrated Nutrient Card - Calories + Macros */}
      <div className="p-4 bg-gradient-to-br from-blue-50/80 via-blue-50/60 to-primary-glow/20 dark:from-blue-950/20 dark:via-blue-950/15 dark:to-primary-glow/10 rounded-3xl border border-primary/10 backdrop-blur-sm hover-lift smooth-transition">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-base">{t('app.dailyProgress')}</span>
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
        <div className="flex items-center justify-between mb-4 p-2 bg-white/60 dark:bg-gray-800/40 rounded-xl border border-gray-200/40 dark:border-gray-700/40">
          <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="font-semibold text-sm">{formatDate(currentDate)}</div>
            {isToday && (
              <div className="text-xs text-primary font-medium">{t('date.today')}</div>
            )}
          </div>
          
          <Button variant="ghost" size="sm" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Calories Section - More Compact */}
        <div className="text-center space-y-2 mb-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {Math.round(dailyTotals.calories)}
              <span className="text-base text-muted-foreground font-normal">/{Math.round(dailyGoal.calories)}</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium">{t('progress.caloriesConsumed')}</div>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={Math.min(calorieProgress, 100)} 
              className={`h-2 rounded-full ${caloriesExceeded ? '[&>div]:bg-red-500' : ''}`} 
            />
            
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium">
              <div className="p-1 bg-primary/10 rounded">
                <Flame className="h-3 w-3 text-primary" />
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
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </div>

            {/* Personalized motivational quote */}
            <div className="mt-2 px-2">
              <RandomQuote 
                userGender={userProfile?.gender}
                fallbackText=""
              />
            </div>
          </div>
        </div>

        {/* Subtle Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200/60 dark:via-gray-700/60 to-transparent mb-4"></div>

        {/* Macros Section - Compact Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Protein */}
          <div className="p-2 rounded-lg bg-card/40 border border-border/30 hover:border-border/60 transition-colors backdrop-blur-sm">
            <div className="text-sm font-semibold mb-1 text-slate-600 dark:text-slate-300">
              {t('macros.protein')}
            </div>
            <div className="mb-2">
              <div className="text-base font-bold text-slate-600 dark:text-slate-300 flex items-baseline gap-1">
                <span>{Math.round(dailyTotals.protein * 10) / 10}g</span>
                <span className="text-sm text-muted-foreground font-normal">/{Math.round(dailyGoal.protein)}g</span>
              </div>
            </div>
            <Progress 
              value={Math.min(proteinProgress, 100)} 
              className="h-1.5 [&>div:last-child]:bg-slate-500" 
            />
          </div>

          {/* Carbs */}
          <div className="p-2 rounded-lg bg-card/40 border border-border/30 hover:border-border/60 transition-colors backdrop-blur-sm">
            <div className="text-sm font-semibold mb-1 text-amber-600 dark:text-amber-400">
              {t('macros.carbs')}
            </div>
            <div className="mb-2">
              <div className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-baseline gap-1">
                <span>{Math.round(dailyTotals.carbs * 10) / 10}g</span>
                <span className="text-sm text-muted-foreground font-normal">/{Math.round(dailyGoal.carbs)}g</span>
              </div>
            </div>
            <Progress 
              value={Math.min(carbsProgress, 100)} 
              className="h-1.5 [&>div:last-child]:bg-amber-500" 
            />
          </div>

          {/* Fats */}
          <div className="p-2 rounded-lg bg-card/40 border border-border/30 hover:border-border/60 transition-colors backdrop-blur-sm">
            <div className="text-sm font-semibold mb-1 text-emerald-600 dark:text-emerald-400">
              {t('macros.fats')}
            </div>
            <div className="mb-2">
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
                <span>{Math.round(dailyTotals.fats * 10) / 10}g</span>
                <span className="text-sm text-muted-foreground font-normal">/{Math.round(dailyGoal.fats)}g</span>
              </div>
            </div>
            <Progress 
              value={Math.min(fatsProgress, 100)} 
              className="h-1.5 [&>div:last-child]:bg-emerald-500" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
