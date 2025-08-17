import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AresMetaCoachCardProps {
  analysis: {
    nutrition_score: number;
    training_score: number;
    recovery_score: number;
    mindset_score: number;
    hormone_score: number;
    overall_performance: number;
    synergy_factors: string[];
    ares_recommendations: string[];
    limiting_factors: string[];
  };
  query: string;
  timestamp: number;
  ares_signature: string;
}

export function AresMetaCoachCard({ analysis, query, ares_signature }: AresMetaCoachCardProps) {
  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="border-amber-800/30 bg-gradient-to-br from-amber-950/60 to-orange-950/40 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-100 font-bold text-lg">
            ⚡ ARES META-COACH ANALYSE
          </CardTitle>
          <Badge variant="outline" className="border-amber-600 text-amber-300">
            Overall: {analysis.overall_performance}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Domain Scores */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Nutrition', score: analysis.nutrition_score },
            { name: 'Training', score: analysis.training_score },
            { name: 'Recovery', score: analysis.recovery_score },
            { name: 'Mindset', score: analysis.mindset_score },
            { name: 'Hormone', score: analysis.hormone_score }
          ].map(({ name, score }) => (
            <div key={name} className="bg-black/20 rounded-lg p-3 border border-amber-800/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-amber-200 text-sm font-medium">{name}</span>
                <span className={`font-bold ${scoreColor(score)}`}>{score}</span>
              </div>
              <Progress value={score} className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Synergy Factors */}
        <div className="bg-black/20 rounded-lg p-3 border border-amber-800/20">
          <h4 className="text-amber-200 font-semibold mb-2">🎯 Cross-Domain Synergien</h4>
          <div className="space-y-1">
            {analysis.synergy_factors.map((factor, idx) => (
              <div key={idx} className="text-amber-100 text-sm">• {factor}</div>
            ))}
          </div>
        </div>

        {/* ARES Recommendations */}
        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3 border border-amber-600/30">
          <h4 className="text-amber-200 font-semibold mb-2">💪 ARES ULTIMATE EMPFEHLUNGEN</h4>
          <div className="space-y-2">
            {analysis.ares_recommendations.map((rec, idx) => (
              <div key={idx} className="text-amber-100 text-sm font-medium">
                {rec}
              </div>
            ))}
          </div>
        </div>

        {/* Limiting Factors */}
        {analysis.limiting_factors.length > 0 && (
          <div className="bg-red-950/30 rounded-lg p-3 border border-red-800/30">
            <h4 className="text-red-200 font-semibold mb-2">⚠️ Limitierende Faktoren</h4>
            <div className="space-y-1">
              {analysis.limiting_factors.map((factor, idx) => (
                <div key={idx} className="text-red-100 text-sm">• {factor}</div>
              ))}
            </div>
          </div>
        )}

        {/* ARES Signature */}
        <div className="text-center pt-2 border-t border-amber-800/30">
          <span className="text-amber-300 text-xs font-mono">{ares_signature}</span>
        </div>
      </CardContent>
    </Card>
  );
}