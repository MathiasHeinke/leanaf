import { useState, useEffect, useCallback, useRef } from 'react';

interface WorkoutTimerState {
  isRunning: boolean;
  startTime: Date | null;
  pausedDuration: number; // Total paused time in milliseconds
  currentDuration: number; // Current elapsed time in seconds
  sessionId: string | null;
}

interface UseWorkoutTimerReturn {
  isRunning: boolean;
  currentDuration: number;
  formattedTime: string;
  startTimer: (sessionId?: string) => void;
  stopTimer: () => { totalDurationMs: number; actualStartTime: Date | null };
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  hasActiveTimer: boolean;
}

const STORAGE_KEY = 'workout_timer_state';

export const useWorkoutTimer = (): UseWorkoutTimerReturn => {
  const [timerState, setTimerState] = useState<WorkoutTimerState>({
    isRunning: false,
    startTime: null,
    pausedDuration: 0,
    currentDuration: 0,
    sessionId: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Convert string dates back to Date objects
        if (parsed.startTime) {
          parsed.startTime = new Date(parsed.startTime);
        }
        setTimerState(parsed);
        
        // If timer was running, resume it
        if (parsed.isRunning && parsed.startTime) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - parsed.startTime.getTime() - parsed.pausedDuration) / 1000);
          setTimerState(prev => ({ ...prev, currentDuration: Math.max(0, elapsed) }));
        }
      } catch (error) {
        console.error('Error loading timer state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  // Update timer every second when running
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timerState.startTime!.getTime() - timerState.pausedDuration) / 1000);
        setTimerState(prev => ({ ...prev, currentDuration: Math.max(0, elapsed) }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.startTime, timerState.pausedDuration]);

  const startTimer = useCallback((sessionId?: string) => {
    const now = new Date();
    setTimerState({
      isRunning: true,
      startTime: now,
      pausedDuration: 0,
      currentDuration: 0,
      sessionId: sessionId || null
    });
  }, []);

  const stopTimer = useCallback(() => {
    const result = {
      totalDurationMs: timerState.startTime 
        ? (new Date().getTime() - timerState.startTime.getTime() - timerState.pausedDuration)
        : 0,
      actualStartTime: timerState.startTime
    };

    setTimerState({
      isRunning: false,
      startTime: null,
      pausedDuration: 0,
      currentDuration: 0,
      sessionId: null
    });

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

    return result;
  }, [timerState.startTime, timerState.pausedDuration]);

  const pauseTimer = useCallback(() => {
    if (timerState.isRunning && timerState.startTime) {
      const now = new Date();
      const currentElapsed = now.getTime() - timerState.startTime.getTime() - timerState.pausedDuration;
      
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        currentDuration: Math.floor(currentElapsed / 1000)
      }));
    }
  }, [timerState.isRunning, timerState.startTime, timerState.pausedDuration]);

  const resumeTimer = useCallback(() => {
    if (!timerState.isRunning && timerState.startTime) {
      const now = new Date();
      const pauseStartTime = timerState.startTime.getTime() + timerState.pausedDuration + (timerState.currentDuration * 1000);
      const additionalPausedTime = now.getTime() - pauseStartTime;
      
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        pausedDuration: prev.pausedDuration + additionalPausedTime
      }));
    }
  }, [timerState.isRunning, timerState.startTime, timerState.pausedDuration, timerState.currentDuration]);

  const resetTimer = useCallback(() => {
    setTimerState({
      isRunning: false,
      startTime: null,
      pausedDuration: 0,
      currentDuration: 0,
      sessionId: null
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    isRunning: timerState.isRunning,
    currentDuration: timerState.currentDuration,
    formattedTime: formatTime(timerState.currentDuration),
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    hasActiveTimer: timerState.startTime !== null
  };
};