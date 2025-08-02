import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrainingPlanMetrics {
  totalPlansCreated: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  userFeedbackScore: number;
  cacheHitRate: number;
}

interface TrainingPlanEvent {
  id?: string;
  user_id: string;
  event_type: 'plan_requested' | 'plan_created' | 'plan_error' | 'plan_confirmed' | 'plan_rejected';
  coach_id?: string;
  response_time_ms?: number;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export const useTrainingPlanAnalytics = () => {
  const [metrics, setMetrics] = useState<TrainingPlanMetrics>({
    totalPlansCreated: 0,
    successRate: 0,
    averageResponseTime: 0,
    errorRate: 0,
    userFeedbackScore: 0,
    cacheHitRate: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Log training plan events
  const logTrainingPlanEvent = async (event: TrainingPlanEvent) => {
    try {
      const { error } = await supabase
        .from('training_plan_analytics')
        .insert({
          user_id: event.user_id,
          event_type: event.event_type,
          coach_id: event.coach_id,
          response_time_ms: event.response_time_ms,
          success: event.success,
          error_message: event.error_message,
          metadata: event.metadata || {}
        });
      
      if (error) {
        console.error('Error logging training plan event:', error);
      }
    } catch (error) {
      console.error('Failed to log training plan event:', error);
    }
  };

  // Fetch analytics metrics
  const fetchMetrics = async (timeRange: 'day' | 'week' | 'month' = 'week') => {
    setIsLoading(true);
    
    try {
      const startDate = new Date();
      switch (timeRange) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Get all events in timerange
      const { data: events, error } = await supabase
        .from('training_plan_analytics')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      if (events && events.length > 0) {
        // Calculate metrics
        const totalRequests = events.filter(e => e.event_type === 'plan_requested').length;
        const successfulPlans = events.filter(e => e.event_type === 'plan_created' && e.success).length;
        const errors = events.filter(e => !e.success).length;
        const confirmations = events.filter(e => e.event_type === 'plan_confirmed').length;
        const rejections = events.filter(e => e.event_type === 'plan_rejected').length;
        
        // Response times
        const responseTimeEvents = events.filter(e => e.response_time_ms);
        const avgResponseTime = responseTimeEvents.length > 0
          ? responseTimeEvents.reduce((sum, e) => sum + (e.response_time_ms || 0), 0) / responseTimeEvents.length
          : 0;

        // Cache hit rate (from metadata)
        const cacheEvents = events.filter(e => e.metadata?.cached !== undefined);
        const cacheHits = cacheEvents.filter(e => e.metadata?.cached === true).length;
        const cacheHitRate = cacheEvents.length > 0 ? (cacheHits / cacheEvents.length) * 100 : 0;

        // User feedback score
        const feedbackEvents = confirmations + rejections;
        const feedbackScore = feedbackEvents > 0 ? (confirmations / feedbackEvents) * 100 : 0;

        setMetrics({
          totalPlansCreated: successfulPlans,
          successRate: totalRequests > 0 ? (successfulPlans / totalRequests) * 100 : 0,
          averageResponseTime: Math.round(avgResponseTime),
          errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
          userFeedbackScore: Math.round(feedbackScore),
          cacheHitRate: Math.round(cacheHitRate)
        });
      }
    } catch (error) {
      console.error('Error fetching training plan metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Performance tracking helpers
  const trackPlanRequest = (userId: string, coachId: string) => {
    const startTime = Date.now();
    
    return {
      recordSuccess: (metadata?: Record<string, any>) => {
        logTrainingPlanEvent({
          user_id: userId,
          event_type: 'plan_created',
          coach_id: coachId,
          response_time_ms: Date.now() - startTime,
          success: true,
          metadata
        });
      },
      recordError: (error: string, metadata?: Record<string, any>) => {
        logTrainingPlanEvent({
          user_id: userId,
          event_type: 'plan_error',
          coach_id: coachId,
          response_time_ms: Date.now() - startTime,
          success: false,
          error_message: error,
          metadata
        });
      },
      recordRequest: () => {
        logTrainingPlanEvent({
          user_id: userId,
          event_type: 'plan_requested',
          coach_id: coachId,
          success: true
        });
      }
    };
  };

  // User feedback tracking
  const trackUserFeedback = (userId: string, planId: string, action: 'confirmed' | 'rejected') => {
    logTrainingPlanEvent({
      user_id: userId,
      event_type: action === 'confirmed' ? 'plan_confirmed' : 'plan_rejected',
      success: true,
      metadata: { plan_id: planId }
    });
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