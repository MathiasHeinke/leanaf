import { useState } from 'react';

interface TrainingPlanMetrics {
  totalPlansCreated: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  userFeedbackScore: number;
  cacheHitRate: number;
}

// Simplified analytics hook for now until types are regenerated
export const useTrainingPlanAnalytics = () => {
  const [metrics] = useState<TrainingPlanMetrics>({
    totalPlansCreated: 0,
    successRate: 95.2,
    averageResponseTime: 1250,
    errorRate: 4.8,
    userFeedbackScore: 87.3,
    cacheHitRate: 72.1
  });
  
  const [isLoading] = useState(false);

  // Mock functions until database types are available
  const logTrainingPlanEvent = async (event: any) => {
    console.log('Training plan event:', event);
  };

  const fetchMetrics = async (timeRange: 'day' | 'week' | 'month' = 'week') => {
    console.log('Fetching metrics for:', timeRange);
  };

  const trackPlanRequest = (userId: string, coachId: string) => {
    const startTime = Date.now();
    
    return {
      recordSuccess: (metadata?: Record<string, any>) => {
        console.log('Plan success recorded:', { userId, coachId, duration: Date.now() - startTime, metadata });
      },
      recordError: (error: string, metadata?: Record<string, any>) => {
        console.log('Plan error recorded:', { userId, coachId, error, metadata });
      },
      recordRequest: () => {
        console.log('Plan request recorded:', { userId, coachId });
      }
    };
  };

  const trackUserFeedback = (userId: string, planId: string, action: 'confirmed' | 'rejected') => {
    console.log('User feedback tracked:', { userId, planId, action });
  };

  return {
    metrics,
    isLoading,
    logTrainingPlanEvent,
    fetchMetrics,
    trackPlanRequest,
    trackUserFeedback
  };
};