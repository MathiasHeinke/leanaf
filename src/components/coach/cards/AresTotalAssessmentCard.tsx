import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AresTotalAssessmentCardProps {
  assessment: {
    physical_dominance: {
      strength_level: string;
      mass_potential: number;
      recovery_capacity: number;
      injury_resistance: number;
    };
    nutrition_mastery: {
      macro_precision: number;
      timing_optimization: number;
      supplement_efficiency: number;
      metabolic_flexibility: number;
    };
    psychological_fortress: {
      mental_toughness: number;
      focus_intensity: number;
      stress_resilience: number;
      motivation_sustainability: number;
    };
    hormonal_optimization: {
      testosterone_optimization: number;
      insulin_sensitivity: number;
      cortisol_management: number;
      growth_hormone_potential: number;
    };
    ares_total_score: number;
    synergy_matrix: Record<string, number>;
    verdict: string;
    next_level_protocol: string;
  };
  user_query: string;
  generated_at: string;
  ares_authority: string;
}

export function AresTotalAssessmentCard({ assessment, ares_authority }: AresTotalAssessmentCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-emerald-400';
    if (score >= 90) return 'text-green-400';
    if (score >= 85) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getDominanceColor = (level: string) => {
    if (level === 'ELITE') return 'text-emerald-400';
    if (level === 'ADVANCED') return 'text-green-400';
    return 'text-yellow-400';
  };

  return (
    <Card className="border-purple-800/30 bg-gradient-to-br from-purple-950/60 to-indigo-950/40 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-purple-100 font-bold text-xl">
            ⚡ ARES TOTAL ASSESSMENT 360°
          </CardTitle>
          <Badge variant="outline" className="border-purple-600 text-purple-300 text-lg font-bold">
            {assessment.ares_total_score}/100
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Physical Dominance */}
        <div className="bg-black/20 rounded-xl p-4 border border-purple-800/20">
          <h4 className="text-purple-200 font-bold mb-3 flex items-center">
            💪 PHYSICAL DOMINANCE
            <span className={`ml-2 ${getDominanceColor(assessment.physical_dominance.strength_level)}`}>
              {assessment.physical_dominance.strength_level}
            </span>
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Mass Potential', score: assessment.physical_dominance.mass_potential },
              { name: 'Recovery', score: assessment.physical_dominance.recovery_capacity },
              { name: 'Injury Resistance', score: assessment.physical_dominance.injury_resistance }
            ].map(({ name, score }) => (
              <div key={name} className="bg-purple-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-purple-200 text-sm">{name}</span>
                  <span className={`font-bold text-sm ${getScoreColor(score)}`}>{score}</span>
                </div>
                <Progress value={score} className="h-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Mastery */}
        <div className="bg-black/20 rounded-xl p-4 border border-green-800/20">
          <h4 className="text-green-200 font-bold mb-3">🥗 NUTRITION MASTERY</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Macro Precision', score: assessment.nutrition_mastery.macro_precision },
              { name: 'Timing Optimization', score: assessment.nutrition_mastery.timing_optimization },
              { name: 'Supplement Efficiency', score: assessment.nutrition_mastery.supplement_efficiency },
              { name: 'Metabolic Flexibility', score: assessment.nutrition_mastery.metabolic_flexibility }
            ].map(({ name, score }) => (
              <div key={name} className="bg-green-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-green-200 text-sm">{name}</span>
                  <span className={`font-bold text-sm ${getScoreColor(score)}`}>{score}</span>
                </div>
                <Progress value={score} className="h-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Psychological Fortress */}
        <div className="bg-black/20 rounded-xl p-4 border border-blue-800/20">
          <h4 className="text-blue-200 font-bold mb-3">🧠 PSYCHOLOGICAL FORTRESS</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Mental Toughness', score: assessment.psychological_fortress.mental_toughness },
              { name: 'Focus Intensity', score: assessment.psychological_fortress.focus_intensity },
              { name: 'Stress Resilience', score: assessment.psychological_fortress.stress_resilience },
              { name: 'Motivation Sustainability', score: assessment.psychological_fortress.motivation_sustainability }
            ].map(({ name, score }) => (
              <div key={name} className="bg-blue-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-200 text-sm">{name}</span>
                  <span className={`font-bold text-sm ${getScoreColor(score)}`}>{score}</span>
                </div>
                <Progress value={score} className="h-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Hormonal Optimization */}
        <div className="bg-black/20 rounded-xl p-4 border border-red-800/20">
          <h4 className="text-red-200 font-bold mb-3">🔥 HORMONAL OPTIMIZATION</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Testosterone', score: assessment.hormonal_optimization.testosterone_optimization },
              { name: 'Insulin Sensitivity', score: assessment.hormonal_optimization.insulin_sensitivity },
              { name: 'Cortisol Management', score: assessment.hormonal_optimization.cortisol_management },
              { name: 'Growth Hormone', score: assessment.hormonal_optimization.growth_hormone_potential }
            ].map(({ name, score }) => (
              <div key={name} className="bg-red-900/20 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-red-200 text-sm">{name}</span>
                  <span className={`font-bold text-sm ${getScoreColor(score)}`}>{score}</span>
                </div>
                <Progress value={score} className="h-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Synergy Matrix */}
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-4 border border-purple-600/30">
          <h4 className="text-purple-200 font-bold mb-3">🎯 SYNERGY MATRIX</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(assessment.synergy_matrix).map(([key, value]) => (
              <div key={key} className="bg-black/20 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <span className="text-purple-200 text-sm capitalize">
                    {key.replace('_', ' + ')}
                  </span>
                  <span className="text-purple-100 font-bold">{(value * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ARES Verdict */}
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 border border-amber-600/40">
          <h4 className="text-amber-200 font-bold mb-2">⚡ ARES ULTIMATE VERDICT</h4>
          <p className="text-amber-100 font-medium mb-2">{assessment.verdict}</p>
          <p className="text-orange-200 text-sm">{assessment.next_level_protocol}</p>
        </div>

        {/* ARES Authority */}
        <div className="text-center pt-2 border-t border-purple-800/30">
          <span className="text-purple-300 text-xs font-mono">{ares_authority}</span>
        </div>
      </CardContent>
    </Card>
  );
}