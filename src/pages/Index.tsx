
import { useState } from "react";
import { DailyProgress } from "@/components/DailyProgress";
import { MealInput } from "@/components/MealInput";
import { QuickWorkoutInput } from "@/components/QuickWorkoutInput";
import { QuickWeightInput } from "@/components/QuickWeightInput";
import { QuickSleepInput } from "@/components/QuickSleepInput";
import { OptimizedGreeting } from "@/components/OptimizedGreeting";
import { DailyCoachMessage } from "@/components/DailyCoachMessage";
import { TrialBanner } from "@/components/TrialBanner";
import { TransformationDashboard } from "@/components/TransformationDashboard";
import { SmartCoachInsights } from "@/components/SmartCoachInsights";
import { FloatingCoachChat } from "@/components/FloatingCoachChat";

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDataUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <TrialBanner />
        <OptimizedGreeting />
        <DailyCoachMessage />
        
        <div className="space-y-6">
          <DailyProgress key={refreshTrigger} />
          
          <div className="grid gap-4">
            <MealInput onMealAdded={handleDataUpdate} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickWorkoutInput onWorkoutAdded={handleDataUpdate} />
              <QuickWeightInput onWeightAdded={handleDataUpdate} />
              <QuickSleepInput onSleepAdded={handleDataUpdate} />
            </div>
          </div>

          <TransformationDashboard />
          <SmartCoachInsights />
        </div>
        
        <FloatingCoachChat />
      </div>
    </div>
  );
};

export default Index;
