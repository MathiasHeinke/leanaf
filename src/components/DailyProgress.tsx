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
    <div>
      {/* Goal-based status message */}
      {goalStatus.status !== 'success' && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${goalStatus.bgColor} ${goalStatus.borderColor}`}>
          <span className="text-lg">{goalStatus.icon}</span>
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
      
      {/* Hero Calorie Section */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-xl border border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t('app.dailyProgress')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString()}
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold text-primary">
            {dailyTotals.calories}
            <span className="text-lg text-muted-foreground">/{dailyGoal.calories}</span>
          </div>
          <div className="text-sm text-muted-foreground">kcal heute verbraucht</div>
          <Progress 
            value={Math.min(calorieProgress, 100)} 
            className={`h-2 ${caloriesExceeded ? '[&>div]:bg-red-500' : ''}`} 
          />
          <div className="flex items-center justify-center gap-1 text-sm">
            <Flame className="h-4 w-4" />
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

      {/* 3er-Reihe Makros (ohne Verbleibend) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Protein */}
        <div className={`p-3 rounded-xl border ${proteinExceeded ? 'bg-red-50 border-red-200' : 'bg-transparent border-protein/20'}`}>
          <div className={`text-xs font-medium mb-1 ${proteinExceeded ? 'text-red-600' : 'text-protein'}`}>Protein</div>
          <div className={`text-xl font-bold mb-1 ${proteinExceeded ? 'text-red-600' : 'text-protein'}`}>
            {dailyTotals.protein}<span className="text-sm">g</span>
          </div>
          <Progress 
            value={Math.min(proteinProgress, 100)} 
            className={`h-1 mb-1 ${proteinExceeded ? '[&>div]:bg-red-500' : ''}`} 
          />
          <div className={`text-xs ${proteinExceeded ? 'text-red-600' : 'text-protein/70'}`}>
            {remainingProtein > 0 ? `+${Math.round(remainingProtein)}g` : `${Math.round(Math.abs(remainingProtein))}g über`}
          </div>
        </div>

        {/* Carbs */}
        <div className={`p-3 rounded-xl border ${carbsExceeded ? 'bg-red-50 border-red-200' : 'bg-transparent border-carbs/20'}`}>
          <div className={`text-xs font-medium mb-1 ${carbsExceeded ? 'text-red-600' : 'text-carbs'}`}>Kohlenhydrate</div>
          <div className={`text-xl font-bold mb-1 ${carbsExceeded ? 'text-red-600' : 'text-carbs'}`}>
            {dailyTotals.carbs}<span className="text-sm">g</span>
          </div>
          <Progress 
            value={Math.min(carbsProgress, 100)} 
            className={`h-1 mb-1 ${carbsExceeded ? '[&>div]:bg-red-500' : ''}`} 
          />
          <div className={`text-xs ${carbsExceeded ? 'text-red-600' : 'text-carbs/70'}`}>
            {remainingCarbs > 0 ? `+${Math.round(remainingCarbs)}g` : `${Math.round(Math.abs(remainingCarbs))}g über`}
          </div>
        </div>

        {/* Fats */}
        <div className={`p-3 rounded-xl border ${fatsExceeded ? 'bg-red-50 border-red-200' : 'bg-transparent border-fats/20'}`}>
          <div className={`text-xs font-medium mb-1 ${fatsExceeded ? 'text-red-600' : 'text-fats'}`}>Fette</div>
          <div className={`text-xl font-bold mb-1 ${fatsExceeded ? 'text-red-600' : 'text-fats'}`}>
            {dailyTotals.fats}<span className="text-sm">g</span>
          </div>
          <Progress 
            value={Math.min(fatsProgress, 100)} 
            className={`h-1 mb-1 ${fatsExceeded ? '[&>div]:bg-red-500' : ''}`} 
          />
          <div className={`text-xs ${fatsExceeded ? 'text-red-600' : 'text-fats/70'}`}>
            {remainingFats > 0 ? `+${Math.round(remainingFats)}g` : `${Math.round(Math.abs(remainingFats))}g über`}
          </div>
        </div>
      </div>

      {/* Goal-based motivational message */}
      <div className={`p-3 rounded-lg border ${goalStatus.bgColor} ${goalStatus.borderColor}`}>
        <div className={`flex items-center gap-2 text-sm font-medium ${goalStatus.color}`}>
          <span className="text-lg">{goalStatus.icon}</span>
          {goalStatus.motivationalMessage}
        </div>
      </div>
    </div>
  );
};