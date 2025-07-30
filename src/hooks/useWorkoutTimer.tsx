import { useState, useEffect, useCallback, useRef } from 'react';

interface WorkoutTimerState {
  isRunning: boolean;
  startTime: Date | null;
  pausedDuration: number; // Total paused time in milliseconds
  currentDuration: number; // Current elapsed time in milliseconds
  sessionId: string | null;
  pauseStartTime: number | null; // When was the timer paused
}

interface UseWorkoutTimerReturn {
  isRunning: boolean;
  currentDuration: number;
  formattedTime: string;
  pauseDurationFormatted: string;
  currentPauseDuration: number;
  startTimer: (sessionId?: string) => string; // Returns session ID
  stopTimer: () => { totalDurationMs: number; actualStartTime: Date | null; sessionId: string | null };
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  hasActiveTimer: boolean;
  isPaused: boolean;
  currentSessionId: string | null;
}

const STORAGE_KEY = 'workout_timer_state';

export const useWorkoutTimer = (): UseWorkoutTimerReturn => {
  const [timerState, setTimerState] = useState<WorkoutTimerState>({
    isRunning: false,
    startTime: null,
    pausedDuration: 0,
    currentDuration: 0,
    sessionId: null,
    pauseStartTime: null
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
          const elapsed = now.getTime() - parsed.startTime.getTime() - parsed.pausedDuration;
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

  // Update timer every 100ms when running for smooth millisecond display
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - timerState.startTime!.getTime() - timerState.pausedDuration;
        setTimerState(prev => ({ ...prev, currentDuration: Math.max(0, elapsed) }));
      }, 100);
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

  // Calculate current pause duration if paused
  const getCurrentPauseDuration = useCallback(() => {
    if (!timerState.isRunning && timerState.pauseStartTime) {
      return Math.floor((Date.now() - timerState.pauseStartTime) / 1000);
    }
    return 0;
  }, [timerState.isRunning, timerState.pauseStartTime]);

  const [currentPauseDuration, setCurrentPauseDuration] = useState(0);

  // Update pause duration every second when paused
  useEffect(() => {
    if (!timerState.isRunning && timerState.pauseStartTime) {
      const pauseInterval = setInterval(() => {
        setCurrentPauseDuration(getCurrentPauseDuration());
      }, 1000);
      return () => clearInterval(pauseInterval);
    } else {
      setCurrentPauseDuration(0);
    }
  }, [timerState.isRunning, timerState.pauseStartTime, getCurrentPauseDuration]);

  const startTimer = useCallback((sessionId?: string): string => {
    const now = new Date();
    const generatedSessionId = sessionId || crypto.randomUUID();
    
    setTimerState({
      isRunning: true,
      startTime: now,
      pausedDuration: 0,
      currentDuration: 0,
      sessionId: generatedSessionId,
      pauseStartTime: null
    });
    
    return generatedSessionId;
  }, []);

  const stopTimer = useCallback(() => {
    const result = {
      totalDurationMs: timerState.startTime 
        ? (new Date().getTime() - timerState.startTime.getTime() - timerState.pausedDuration)
        : 0,
      actualStartTime: timerState.startTime,
      sessionId: timerState.sessionId
    };

    setTimerState({
      isRunning: false,
      startTime: null,
      pausedDuration: 0,
      currentDuration: 0,
      sessionId: null,
      pauseStartTime: null
    });

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

    return result;
  }, [timerState.startTime, timerState.pausedDuration]);

  const pauseTimer = useCallback(() => {
    console.log('pauseTimer called - isRunning:', timerState.isRunning, 'startTime:', timerState.startTime);
    if (timerState.isRunning && timerState.startTime) {
      const now = new Date();
      const currentElapsed = now.getTime() - timerState.startTime.getTime() - timerState.pausedDuration;
      
      console.log('Pausing timer - currentElapsed:', Math.floor(currentElapsed / 1000), 'seconds');
      
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        currentDuration: currentElapsed, // Keep in milliseconds
        pauseStartTime: now.getTime()
      }));
    }
  }, [timerState.isRunning, timerState.startTime, timerState.pausedDuration]);

  const resumeTimer = useCallback(() => {
    console.log('resumeTimer called - isRunning:', timerState.isRunning, 'pauseStartTime:', timerState.pauseStartTime);
    if (!timerState.isRunning && timerState.startTime && timerState.pauseStartTime) {
      const now = new Date();
      const pauseDuration = now.getTime() - timerState.pauseStartTime;
      
      console.log('Resuming timer - pauseDuration:', pauseDuration, 'ms');
      
      setTimerState(prev => ({
        ...prev,
        isRunning: true,
        pausedDuration: prev.pausedDuration + pauseDuration,
        pauseStartTime: null
      }));
    }
  }, [timerState.isRunning, timerState.startTime, timerState.pauseStartTime]);

  const resetTimer = useCallback(() => {
    setTimerState({
      isRunning: false,
      startTime: null,
      pausedDuration: 0,
      currentDuration: 0,
      sessionId: null,
      pauseStartTime: null
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    isRunning: timerState.isRunning,
    currentDuration: timerState.currentDuration,
    formattedTime: formatTime(timerState.currentDuration),
    pauseDurationFormatted: formatTime(currentPauseDuration * 1000), // Convert seconds to ms for formatTime
    currentPauseDuration,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    hasActiveTimer: timerState.startTime !== null,
    isPaused: !timerState.isRunning && timerState.startTime !== null,
    currentSessionId: timerState.sessionId
  };
};