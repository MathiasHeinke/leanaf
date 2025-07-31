import { useState, useCallback } from 'react';

interface WorkoutPlanAnalysis {
  isWorkoutPlan: boolean;
  exerciseCount: number;
  planType: string;
  confidence: number;
  suggestedName: string;
  suggestedCategory: string;
}

export const useWorkoutPlanDetection = () => {
  const [lastAnalysis, setLastAnalysis] = useState<WorkoutPlanAnalysis | null>(null);

  const analyzeWorkoutPlan = useCallback((text: string, coachName?: string): WorkoutPlanAnalysis => {
    const content = text.toLowerCase();
    
    // Exercise patterns detection
    const exercisePatterns = [
      /\d+\.\s*[a-z]/g,        // "1. Exercise"
      /[-•]\s*[a-z]/g,         // "- Exercise" or "• Exercise"
      /\*\*[^*]+\*\*/g,        // "**Exercise**"
      /^übung\s*\d+:/gm,       // "Übung 1:"
    ];
    
    let totalExercises = 0;
    exercisePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      totalExercises += matches.length;
    });
    
    // Training keywords and their weights
    const trainingKeywords = {
      high: ['sätze', 'wiederholungen', 'rpe', 'trainingsplan', 'workout'],
      medium: ['übung', 'training', 'pause', 'rest', 'gewicht'],
      low: ['fitness', 'sport', 'kraft', 'ausdauer']
    };
    
    let keywordScore = 0;
    Object.entries(trainingKeywords).forEach(([weight, keywords]) => {
      const multiplier = weight === 'high' ? 3 : weight === 'medium' ? 2 : 1;
      keywords.forEach(keyword => {
        if (content.includes(keyword)) keywordScore += multiplier;
      });
    });
    
    // Plan type detection
    let planType = 'general';
    let suggestedCategory = 'Full Body';
    let suggestedName = `${coachName || 'Coach'} Trainingsplan`;
    
    if (content.includes('oberkörper') || content.includes('upper')) {
      planType = 'upper_body';
      suggestedCategory = 'Push';
      suggestedName = 'Oberkörper Training';
    } else if (content.includes('unterkörper') || content.includes('lower') || content.includes('beine')) {
      planType = 'lower_body';
      suggestedCategory = 'Legs';
      suggestedName = 'Unterkörper Training';
    } else if (content.includes('push')) {
      planType = 'push';
      suggestedCategory = 'Push';
      suggestedName = 'Push Training';
    } else if (content.includes('pull')) {
      planType = 'pull';
      suggestedCategory = 'Pull';
      suggestedName = 'Pull Training';
    } else if (content.includes('ganzkörper') || content.includes('full body')) {
      planType = 'full_body';
      suggestedCategory = 'Full Body';
      suggestedName = 'Ganzkörper Training';
    } else if (content.includes('cardio') || content.includes('ausdauer')) {
      planType = 'cardio';
      suggestedCategory = 'Cardio';
      suggestedName = 'Cardio Training';
    }
    
    // Calculate confidence score
    const exerciseScore = Math.min(totalExercises * 10, 50); // max 50 points
    const keywordMaxScore = 50;
    const normalizedKeywordScore = Math.min(keywordScore * 5, keywordMaxScore);
    
    const confidence = (exerciseScore + normalizedKeywordScore) / 100;
    const isWorkoutPlan = totalExercises >= 2 && keywordScore >= 3 && confidence > 0.4;
    
    const analysis: WorkoutPlanAnalysis = {
      isWorkoutPlan,
      exerciseCount: totalExercises,
      planType,
      confidence: Math.min(confidence, 1),
      suggestedName,
      suggestedCategory
    };
    
    setLastAnalysis(analysis);
    return analysis;
  }, []);

  const shouldShowPlanSaver = useCallback((text: string, mode: string): boolean => {
    if (mode !== 'training' && mode !== 'specialized') return false;
    
    const analysis = analyzeWorkoutPlan(text);
    return analysis.isWorkoutPlan && analysis.confidence > 0.5;
  }, [analyzeWorkoutPlan]);

  return {
    analyzeWorkoutPlan,
    shouldShowPlanSaver,
    lastAnalysis
  };
};