import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Target, Calendar, Flame, TrendingUp, TrendingDown, Star } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { getGoalStatus, getGoalBasedProgressMessage, UserGoal } from "@/utils/goalBasedMessaging";

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
}

export const DailyProgress = ({ dailyTotals, dailyGoal, userGoal = 'maintain' }: DailyProgressProps) => {
  const { t, language } = useTranslation();

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
  const motivationalMessage = getGoalBasedProgressMessage(dailyTotals.calories, dailyGoal.calories, userGoal);

  return (
    <div className="space-y-6">
      {/* Goal-based status message */}
      {goalStatus.status !== 'success' && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${goalStatus.bgColor} ${goalStatus.borderColor} backdrop-blur-sm`}>
          <span className="text-xl">{goalStatus.icon}</span>
          <span className={`text-sm font-medium ${goalStatus.color}`}>
            {goalStatus.message}
            {goalStatus.status === 'danger' && userGoal === 'lose' && remainingCalories < 0 &&
              ` (${Math.abs(remainingCalories)} kcal über dem Ziel)`
            }
            {goalStatus.status === 'danger' && userGoal === 'gain' && remainingCalories > 0 &&
              ` (${remainingCalories} kcal fehlen noch)`
            }
          </span>
        </div>
      )}
      
      {/* Hero Calorie Section - Modern Clean Design */}
      <div className="p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-primary-glow/5 rounded-3xl border border-primary/10 backdrop-blur-sm hover-lift smooth-transition">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">{t('app.dailyProgress')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/50 dark:bg-black/20 px-3 py-1.5 rounded-full">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString()}
          </div>
        </div>
        
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">
              {dailyTotals.calories}
              <span className="text-xl text-muted-foreground font-normal">/{dailyGoal.calories}</span>
            </div>
            <div className="text-sm text-muted-foreground font-medium">kcal heute verbraucht</div>
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
                  `${remainingCalories} kcal verbleibend` :
                  userGoal === 'lose' && remainingCalories < 0 ?
                  `${Math.abs(remainingCalories)} kcal über Ziel` :
                  userGoal === 'gain' && remainingCalories > 0 ?
                  `${remainingCalories} kcal fehlen noch` :
                  userGoal === 'gain' && remainingCalories < 0 ?
                  `Ziel erreicht! ${Math.abs(remainingCalories)} kcal über Ziel` :
                  remainingCalories > 0 ? `${remainingCalories} kcal verbleibend` : `${Math.abs(remainingCalories)} kcal überschritten`
                }
              </span>
              {goalStatus.status === 'success' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
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
            Protein
          </div>
          <div className={`text-2xl font-bold mb-2 ${proteinExceeded ? 'text-red-600 dark:text-red-400' : 'text-protein'}`}>
            {dailyTotals.protein}<span className="text-sm font-normal opacity-70">g</span>
          </div>
          <Progress 
            value={Math.min(proteinProgress, 100)} 
            className={`h-1.5 mb-2 ${proteinExceeded ? '[&>div]:bg-red-500' : '[&>div]:bg-protein'}`} 
          />
          <div className={`text-xs font-medium ${proteinExceeded ? 'text-red-600 dark:text-red-400' : 'text-protein/80'}`}>
            {remainingProtein > 0 ? `+${Math.round(remainingProtein)}g` : `${Math.round(Math.abs(remainingProtein))}g über`}
          </div>
        </div>

        {/* Carbs */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
          carbsExceeded 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50' 
            : 'bg-carbs-light dark:bg-carbs-light border-carbs/20 dark:border-carbs/30'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${carbsExceeded ? 'text-red-600 dark:text-red-400' : 'text-carbs'}`}>
            Kohlenhydrate
          </div>
          <div className={`text-2xl font-bold mb-2 ${carbsExceeded ? 'text-red-600 dark:text-red-400' : 'text-carbs'}`}>
            {dailyTotals.carbs}<span className="text-sm font-normal opacity-70">g</span>
          </div>
          <Progress 
            value={Math.min(carbsProgress, 100)} 
            className={`h-1.5 mb-2 ${carbsExceeded ? '[&>div]:bg-red-500' : '[&>div]:bg-carbs'}`} 
          />
          <div className={`text-xs font-medium ${carbsExceeded ? 'text-red-600 dark:text-red-400' : 'text-carbs/80'}`}>
            {remainingCarbs > 0 ? `+${Math.round(remainingCarbs)}g` : `${Math.round(Math.abs(remainingCarbs))}g über`}
          </div>
        </div>

        {/* Fats */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] ${
          fatsExceeded 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50' 
            : 'bg-fats-light dark:bg-fats-light border-fats/20 dark:border-fats/30'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${fatsExceeded ? 'text-red-600 dark:text-red-400' : 'text-fats'}`}>
            Fette
          </div>
          <div className={`text-2xl font-bold mb-2 ${fatsExceeded ? 'text-red-600 dark:text-red-400' : 'text-fats'}`}>
            {dailyTotals.fats}<span className="text-sm font-normal opacity-70">g</span>
          </div>
          <Progress 
            value={Math.min(fatsProgress, 100)} 
            className={`h-1.5 mb-2 ${fatsExceeded ? '[&>div]:bg-red-500' : '[&>div]:bg-fats'}`} 
          />
          <div className={`text-xs font-medium ${fatsExceeded ? 'text-red-600 dark:text-red-400' : 'text-fats/80'}`}>
            {remainingFats > 0 ? `+${Math.round(remainingFats)}g` : `${Math.round(Math.abs(remainingFats))}g über`}
          </div>
        </div>
      </div>

      {/* Goal-based motivational message */}
      <div className={`p-4 rounded-2xl border ${goalStatus.bgColor} ${goalStatus.borderColor} backdrop-blur-sm`}>
        <div className={`flex items-center gap-3 text-sm font-medium ${goalStatus.color}`}>
          <span className="text-xl">{goalStatus.icon}</span>
          <span>{goalStatus.motivationalMessage}</span>
        </div>
      </div>
    </div>
  );
};