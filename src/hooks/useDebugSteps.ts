import { useState, useCallback } from 'react';
import type { DebugStep } from '@/components/debug/UserChatDebugger';

export function useDebugSteps() {
  const [steps, setSteps] = useState<DebugStep[]>([]);

  const addStep = useCallback((title: string, details?: string) => {
    const step: DebugStep = {
      id: Date.now().toString(),
      title,
      status: 'running',
      timestamp: Date.now(),
      details,
    };
    setSteps(prev => [...prev, step]);
    return step.id;
  }, []);

  const updateStep = useCallback((id: string, status: DebugStep['status'], details?: string, duration?: number) => {
    setSteps(prev => prev.map(step => 
      step.id === id 
        ? { ...step, status, details: details || step.details, duration }
        : step
    ));
  }, []);

  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  const completeStep = useCallback((id: string, details?: string) => {
    const endTime = Date.now();
    setSteps(prev => prev.map(step => {
      if (step.id === id) {
        const duration = endTime - step.timestamp;
        return { ...step, status: 'success' as const, details: details || step.details, duration };
      }
      return step;
    }));
  }, []);

  const errorStep = useCallback((id: string, error: string) => {
    const endTime = Date.now();
    setSteps(prev => prev.map(step => {
      if (step.id === id) {
        const duration = endTime - step.timestamp;
        return { ...step, status: 'error' as const, details: error, duration };
      }
      return step;
    }));
  }, []);

  return {
    steps,
    addStep,
    updateStep,
    completeStep,
    errorStep,
    clearSteps,
  };
}