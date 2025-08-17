import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface AresUltimateWorkoutCardProps {
  plan: {
    plan_name: string;
    phase: string;
    duration_weeks: number;
    intensity_level: string;
    training_philosophy: string;
    weekly_structure: Record<string, any>;
    training_split: string[];
    nutrition_integration: string[];
    recovery_protocols: string[];
    progression_matrix: Record<string, any>;
    expected_outcomes: string[];
  };
  user_input: string;
  created_at: string;
  ares_seal: string;
}

export default function AresUltimateWorkoutCard({ plan, ares_seal }: AresUltimateWorkoutCardProps) {
  const getIntensityColor = (intensity: string) => {
    switch (intensity.toLowerCase()) {
      case 'extreme': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className="border-orange-800/30 bg-gradient-to-br from-orange-950/60 to-red-950/40 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-orange-100 font-bold text-xl">
            🔥 {plan.plan_name}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-orange-600 text-orange-300">
              {plan.phase}
            </Badge>
            <Badge className={`${getIntensityColor(plan.intensity_level)} text-white`}>
              {plan.intensity_level}
            </Badge>
          </div>
        </div>
        <p className="text-orange-200 text-sm mt-2">
          {plan.duration_weeks} Wochen • {plan.training_philosophy}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Weekly Structure */}
        <div className="bg-black/20 rounded-xl p-4 border border-orange-800/20">
          <h4 className="text-orange-200 font-bold mb-3">📅 WÖCHENTLICHE STRUKTUR</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(plan.weekly_structure).map(([key, value]) => (
              <div key={key} className="bg-orange-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <span className="text-orange-200 text-sm font-medium capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <span className="text-orange-100 text-sm">{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training Split */}
        <div className="bg-black/20 rounded-xl p-4 border border-red-800/20">
          <h4 className="text-red-200 font-bold mb-3">💪 TRAINING SPLIT</h4>
          <div className="grid grid-cols-1 gap-2">
            {plan.training_split.map((split, idx) => (
              <div key={idx} className="bg-red-900/20 rounded-lg p-2">
                <span className="text-red-100 text-sm">• {split}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Integration */}
        <div className="bg-black/20 rounded-xl p-4 border border-green-800/20">
          <h4 className="text-green-200 font-bold mb-3">🥗 NUTRITION INTEGRATION</h4>
          <div className="space-y-2">
            {plan.nutrition_integration.map((item, idx) => (
              <div key={idx} className="text-green-100 text-sm">
                • {item}
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Protocols */}
        <div className="bg-black/20 rounded-xl p-4 border border-blue-800/20">
          <h4 className="text-blue-200 font-bold mb-3">😴 RECOVERY PROTOCOLS</h4>
          <div className="space-y-2">
            {plan.recovery_protocols.map((protocol, idx) => (
              <div key={idx} className="text-blue-100 text-sm">
                • {protocol}
              </div>
            ))}
          </div>
        </div>

        {/* Progression Matrix */}
        <div className="bg-black/20 rounded-xl p-4 border border-purple-800/20">
          <h4 className="text-purple-200 font-bold mb-3">📈 PROGRESSION MATRIX</h4>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(plan.progression_matrix).map(([metric, progression]) => (
              <div key={metric} className="bg-purple-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <span className="text-purple-200 text-sm font-medium capitalize">
                    {metric.replace('_', ' ')}
                  </span>
                  <span className="text-purple-100 text-sm">{progression}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="border-orange-800/30" />

        {/* Expected Outcomes */}
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl p-4 border border-amber-600/30">
          <h4 className="text-amber-200 font-bold mb-3">🎯 ERWARTETE ERGEBNISSE</h4>
          <div className="space-y-2">
            {plan.expected_outcomes.map((outcome, idx) => (
              <div key={idx} className="text-amber-100 text-sm font-medium">
                ✓ {outcome}
              </div>
            ))}
          </div>
        </div>

        {/* ARES Seal */}
        <div className="text-center pt-2 border-t border-orange-800/30">
          <span className="text-orange-300 text-xs font-mono">{ares_seal}</span>
        </div>
      </CardContent>
    </Card>
  );
}