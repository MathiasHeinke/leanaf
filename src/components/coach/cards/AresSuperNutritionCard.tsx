import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AresSuperNutritionCardProps {
  plan: {
    macro_strategy: {
      protein_grams: number;
      carb_grams: number;
      fat_grams: number;
      total_calories: number;
      meal_frequency: number;
    };
    timing_windows: {
      pre_workout: string;
      post_workout: string;
      sleep_window: string;
      fasting_window: string;
    };
    supplement_stack: Array<{
      name: string;
      dosage: string;
      timing: string;
      purpose: string;
    }>;
    hydration_protocol: {
      daily_liters: number;
      electrolyte_timing: string;
      pre_workout_ml: number;
    };
    hormone_support: {
      testosterone_foods: string[];
      cortisol_management: string[];
      insulin_optimization: string[];
    };
    periodization_phases: Array<{
      phase: string;
      duration: string;
      calorie_adjustment: string;
      macro_shift: string;
    }>;
  };
  user_context: string;
  created_at: string;
  ares_nutrition_seal: string;
}

export function AresSuperNutritionCard({ plan, ares_nutrition_seal }: AresSuperNutritionCardProps) {
  const macroPercentages = {
    protein: Math.round((plan.macro_strategy.protein_grams * 4 / plan.macro_strategy.total_calories) * 100),
    carbs: Math.round((plan.macro_strategy.carb_grams * 4 / plan.macro_strategy.total_calories) * 100),
    fats: Math.round((plan.macro_strategy.fat_grams * 9 / plan.macro_strategy.total_calories) * 100)
  };

  return (
    <Card className="border-green-800/30 bg-gradient-to-br from-green-950/60 to-emerald-950/40 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-100 font-bold text-xl">
            🥗 ARES SUPER NUTRITION
          </CardTitle>
          <Badge variant="outline" className="border-green-600 text-green-300 text-lg">
            {plan.macro_strategy.total_calories} kcal
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Macro Strategy */}
        <div className="bg-black/20 rounded-xl p-4 border border-green-800/20">
          <h4 className="text-green-200 font-bold mb-3">🎯 MACRO STRATEGY</h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-green-200 text-sm font-medium">PROTEIN</div>
              <div className="text-green-100 text-xl font-bold">{plan.macro_strategy.protein_grams}g</div>
              <div className="text-green-300 text-xs">{macroPercentages.protein}%</div>
            </div>
            <div className="bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-blue-200 text-sm font-medium">CARBS</div>
              <div className="text-blue-100 text-xl font-bold">{plan.macro_strategy.carb_grams}g</div>
              <div className="text-blue-300 text-xs">{macroPercentages.carbs}%</div>
            </div>
            <div className="bg-yellow-900/20 rounded-lg p-3 text-center">
              <div className="text-yellow-200 text-sm font-medium">FATS</div>
              <div className="text-yellow-100 text-xl font-bold">{plan.macro_strategy.fat_grams}g</div>
              <div className="text-yellow-300 text-xs">{macroPercentages.fats}%</div>
            </div>
          </div>
          <div className="text-center">
            <span className="text-green-200 text-sm">
              {plan.macro_strategy.meal_frequency} Mahlzeiten pro Tag
            </span>
          </div>
        </div>

        {/* Timing Windows */}
        <div className="bg-black/20 rounded-xl p-4 border border-blue-800/20">
          <h4 className="text-blue-200 font-bold mb-3">⏰ TIMING WINDOWS</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(plan.timing_windows).map(([window, timing]) => (
              <div key={window} className="bg-blue-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200 text-sm font-medium capitalize">
                    {window.replace('_', ' ')}
                  </span>
                  <span className="text-blue-100 text-sm">{timing}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supplement Stack */}
        <div className="bg-black/20 rounded-xl p-4 border border-purple-800/20">
          <h4 className="text-purple-200 font-bold mb-3">💊 SUPPLEMENT STACK</h4>
          <div className="space-y-2">
            {plan.supplement_stack.map((supplement, idx) => (
              <div key={idx} className="bg-purple-900/20 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-purple-100 font-medium">{supplement.name}</div>
                    <div className="text-purple-300 text-sm">{supplement.purpose}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-purple-100 text-sm font-medium">{supplement.dosage}</div>
                    <div className="text-purple-300 text-xs">{supplement.timing}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hydration Protocol */}
        <div className="bg-black/20 rounded-xl p-4 border border-cyan-800/20">
          <h4 className="text-cyan-200 font-bold mb-3">💧 HYDRATION PROTOCOL</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-cyan-900/20 rounded-lg p-2">
              <div className="flex justify-between items-center">
                <span className="text-cyan-200 text-sm">Daily Target</span>
                <span className="text-cyan-100 font-bold">{plan.hydration_protocol.daily_liters}L</span>
              </div>
            </div>
            <div className="bg-cyan-900/20 rounded-lg p-2">
              <div className="flex justify-between items-center">
                <span className="text-cyan-200 text-sm">Pre-Workout</span>
                <span className="text-cyan-100">{plan.hydration_protocol.pre_workout_ml}ml</span>
              </div>
            </div>
            <div className="bg-cyan-900/20 rounded-lg p-2">
              <span className="text-cyan-200 text-sm">Electrolytes: {plan.hydration_protocol.electrolyte_timing}</span>
            </div>
          </div>
        </div>

        {/* Hormone Support */}
        <div className="bg-black/20 rounded-xl p-4 border border-red-800/20">
          <h4 className="text-red-200 font-bold mb-3">🔥 HORMONE SUPPORT</h4>
          <div className="space-y-3">
            <div>
              <h5 className="text-red-300 text-sm font-medium mb-1">Testosterone Boost</h5>
              <div className="text-red-100 text-sm">
                {plan.hormone_support.testosterone_foods.join(', ')}
              </div>
            </div>
            <div>
              <h5 className="text-yellow-300 text-sm font-medium mb-1">Cortisol Management</h5>
              <div className="text-yellow-100 text-sm">
                {plan.hormone_support.cortisol_management.join(', ')}
              </div>
            </div>
            <div>
              <h5 className="text-green-300 text-sm font-medium mb-1">Insulin Optimization</h5>
              <div className="text-green-100 text-sm">
                {plan.hormone_support.insulin_optimization.join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Periodization Phases */}
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-600/30">
          <h4 className="text-amber-200 font-bold mb-3">📈 PERIODIZATION PHASES</h4>
          <div className="space-y-2">
            {plan.periodization_phases.map((phase, idx) => (
              <div key={idx} className="bg-black/20 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-amber-100 font-medium">{phase.phase}</div>
                    <div className="text-amber-300 text-sm">{phase.duration}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-100 text-sm">{phase.calorie_adjustment}</div>
                    <div className="text-amber-300 text-xs">{phase.macro_shift}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ARES Nutrition Seal */}
        <div className="text-center pt-2 border-t border-green-800/30">
          <span className="text-green-300 text-xs font-mono">{ares_nutrition_seal}</span>
        </div>
      </CardContent>
    </Card>
  );
}