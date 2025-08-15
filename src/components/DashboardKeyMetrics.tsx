import React, { useEffect, useState } from "react";
import { Flame, Droplet, Footprints } from "lucide-react";
import KeyMetricsBoard from "./KeyMetricsBoard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays } from "date-fns";

interface Props {
  currentDate: Date;
  calorieSummary: { consumed: number; burned: number };
  dailyGoals: any;
  todaysFluids: any[];
  todaysWorkout: any;
}

export const DashboardKeyMetrics: React.FC<Props> = ({
  currentDate,
  calorieSummary,
  dailyGoals,
  todaysFluids,
  todaysWorkout
}) => {
  const { user } = useAuth();
  const [weeklyCalories, setWeeklyCalories] = useState<{ day: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWeeklyData();
    }
  }, [user, currentDate]);

  const loadWeeklyData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get data for the last 7 days ending with currentDate
      const promises = [];
      const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(currentDate, i);
        const dateString = format(date, 'yyyy-MM-dd');
        
        promises.push(
          supabase
            .from('meals')
            .select('calories')
            .eq('user_id', user.id)
            .eq('date', dateString)
        );
      }

      const results = await Promise.all(promises);
      
      const weeklyData = results.map((result, index) => {
        const date = subDays(currentDate, 6 - index);
        const dayName = days[date.getDay()];
        const totalCalories = result.data?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0;
        
        return {
          day: dayName,
          value: totalCalories
        };
      });

      setWeeklyCalories(weeklyData);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-border/20 animate-pulse">
        <div className="h-32 bg-muted/20 rounded mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-muted/20 rounded"></div>
          <div className="h-24 bg-muted/20 rounded"></div>
        </div>
      </div>
    );
  }

  // Show meaningful data even if today's consumption is 0
  const displayTitle = calorieSummary.consumed > 0 
    ? "Kalorien heute" 
    : "Letzte Aktivität";

  // Calculate fluid intake in liters
  const totalFluidMl = todaysFluids.reduce((sum, fluid) => sum + (fluid.amount_ml || 0), 0);
  const fluidGoalMl = dailyGoals?.fluid_goal_ml || 2500;
  const fluidProgress = Math.min(totalFluidMl / fluidGoalMl, 1);

  // Calculate steps progress  
  const todaysSteps = todaysWorkout?.steps || 0;
  const stepsGoal = dailyGoals?.steps_goal || 10000;
  const stepsProgress = Math.min(todaysSteps / stepsGoal, 1);

  // Get calorie goal
  const calorieGoal = dailyGoals?.calories || 2000;

  // Enhanced formatting functions
  const formatCalories = (calories: number) => {
    if (calories >= 1000) {
      return `${(calories / 1000).toFixed(1)}k`;
    }
    return calories.toString();
  };

  const formatFluid = (ml: number) => {
    return (ml / 1000).toFixed(1);
  };

  const formatSteps = (steps: number) => {
    if (steps >= 1000) {
      return `${(steps / 1000).toFixed(1)}k`;
    }
    return steps.toString();
  };

  const formatGoalFluid = (ml: number) => {
    return (ml / 1000).toFixed(1);
  };

  return (
    <KeyMetricsBoard
      sparkTitle={displayTitle}
      sparkValue={formatCalories(calorieSummary.consumed)}
      sparkUnit="kcal"
      sparkData={weeklyCalories}
      sparkGoal={calorieGoal}
      halos={[
        {
          icon: <Droplet size={18} />,
          value: formatFluid(totalFluidMl),
          label: "Wasser",
          progress: fluidProgress,
          gradient: ["hsl(221, 83%, 53%)", "hsl(187, 85%, 53%)"], // blue to cyan
          goalValue: formatGoalFluid(fluidGoalMl),
          unit: "L"
        },
        {
          icon: <Footprints size={18} />,
          value: formatSteps(todaysSteps),
          label: "Schritte",
          progress: stepsProgress,
          gradient: ["hsl(25, 95%, 53%)", "hsl(0, 84%, 60%)"], // orange to red
          goalValue: formatSteps(stepsGoal),
          unit: ""
        }
      ]}
    />
  );
};