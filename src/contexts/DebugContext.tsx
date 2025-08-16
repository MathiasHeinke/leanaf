import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { dataLogger } from '@/utils/dataLogger';
import { authLogger } from '@/lib/authLogger';
import { useAuth } from '@/hooks/useAuth';
import type { DebugEvent } from '@/components/debug/DebugConsole';

type DebugMode = 'auth-only' | 'full';

interface DebugContextType {
  isDebugMode: boolean;
  debugMode: DebugMode;
  debugEvents: DebugEvent[];
  lastRequest: any;
  lastResponse: any;
  isOverlayVisible: boolean;
  setIsOverlayVisible: (visible: boolean) => void;
  addDebugEvent: (level: DebugEvent['level'], message: string, data?: any) => void;
  clearDebugEvents: () => void;
  refreshLogs: () => Promise<void>;
  setLastRequest: (request: any) => void;
  setLastResponse: (response: any) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  
  const { isSessionReady, session } = useAuth();
  const isDebugMode = dataLogger.isDebugEnabled() || authLogger.isDebugEnabled();
  
  // Determine debug mode: auth-only until session is ready, then full
  const debugMode: DebugMode = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('authDebugOnly') === '1') return 'auth-only';
    if (!isSessionReady || !session?.access_token) return 'auth-only';
    return 'full';
  })();

  const addDebugEvent = useCallback((level: DebugEvent['level'], message: string, data?: any) => {
    const event: DebugEvent = {
      ts: Date.now(),
      level,
      message,
      data
    };
    setDebugEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events
  }, []);

  const clearDebugEvents = useCallback(() => {
    setDebugEvents([]);
    dataLogger.clearLogs();
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      if (debugMode === 'auth-only') {
        // Only fetch auth logs when in auth-only mode
        const authLogs = await authLogger.getRecentLogs(50);
        const authEvents = authLogs.map(log => ({
          ts: new Date(log.client_ts || log.event_time).getTime(),
          level: 'info' as const,
          message: `Auth: ${log.event}`,
          data: log
        }));
        setDebugEvents(authEvents.slice(0, 100));
      } else {
        // Full mode: merge auth and data logs
        const [authLogs, dataLogs] = await Promise.all([
          authLogger.getRecentLogs(50),
          dataLogger.getRecentLogs(50)
        ]);

        const combinedLogs = [
          ...authLogs.map(log => ({
            ts: new Date(log.client_ts || log.event_time).getTime(),
            level: 'info' as const,
            message: `Auth: ${log.event}`,
            data: log
          })),
          ...dataLogs.map(log => ({
            ts: new Date(log.client_ts).getTime(),
            level: log.stage === 'error' ? 'error' as const : 'info' as const,
            message: `Data: ${log.operation} (${log.stage})`,
            data: log
          }))
        ].sort((a, b) => b.ts - a.ts);

        setDebugEvents(combinedLogs.slice(0, 100));
      }
    } catch (error) {
      console.error('Failed to refresh debug logs:', error);
    }
  }, [debugMode]);

  // Auto-refresh logs when debug mode is enabled
  useEffect(() => {
    if (isDebugMode) {
      refreshLogs();
      const interval = setInterval(refreshLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isDebugMode, refreshLogs]);

  // Listen for debug hotkey (Ctrl/Cmd + Shift + D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsOverlayVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <DebugContext.Provider value={{
      isDebugMode,
      debugMode,
      debugEvents,
      lastRequest,
      lastResponse,
      isOverlayVisible,
      setIsOverlayVisible,
      addDebugEvent,
      clearDebugEvents,
      refreshLogs,
      setLastRequest,
      setLastResponse
    }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}