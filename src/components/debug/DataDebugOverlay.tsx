import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, RotateCcw, Download, Eye, EyeOff, Shield, ShieldOff, Trash2, RefreshCw, LogOut } from 'lucide-react';
import { DebugConsole } from './DebugConsole';
import { RequestInspector } from './RequestInspector';
import { useDebug } from '@/contexts/DebugContext';
import { useAuth } from '@/hooks/useAuth';
import { dataLogger } from '@/utils/dataLogger';
import { authLogger } from '@/lib/authLogger';
import { supabase } from '@/integrations/supabase/client';

interface DataDebugOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export function DataDebugOverlay({ isVisible, onClose }: DataDebugOverlayProps) {
  const {
    debugEvents,
    lastRequest,
    lastResponse,
    clearDebugEvents,
    refreshLogs,
    debugMode
  } = useDebug();
  
  const { session, isSessionReady, authDebugInfo } = useAuth();

  if (!isVisible) return null;

  const exportLogs = () => {
    const logsData = {
      timestamp: new Date().toISOString(),
      trace_id: dataLogger.getTraceId(),
      auth_trace_id: authLogger.getTraceId(),
      events: debugEvents,
      last_request: lastRequest,
      last_response: lastResponse
    };

    const blob = new Blob([JSON.stringify(logsData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-debug-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDataDebug = () => {
    const isEnabled = dataLogger.isDebugEnabled();
    if (isEnabled) {
      localStorage.removeItem('data_debug');
    } else {
      localStorage.setItem('data_debug', 'true');
    }
    window.location.reload(); // Reload to apply debug mode changes
  };

  const toggleAuthDebug = () => {
    const isEnabled = authLogger.isDebugEnabled();
    if (isEnabled) {
      localStorage.removeItem('auth_debug');
    } else {
      localStorage.setItem('auth_debug', 'true');
    }
    window.location.reload(); // Reload to apply debug mode changes
  };

  const handleTokenRefresh = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  const handleAuthReset = () => {
    localStorage.removeItem('sb-gzczjscctgyxjyodhnhk-auth-token');
    localStorage.removeItem('auth_debug_logs');
    localStorage.removeItem('data_debug_logs');
    window.location.reload();
  };

  const getSessionTimeRemaining = () => {
    if (!session?.expires_at) return null;
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    return remaining;
  };

  const sessionTimeRemaining = getSessionTimeRemaining();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="p-4 border-b space-y-3">
          {/* Title and Mode Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Debug Console</h2>
              <Badge variant={debugMode === 'auth-only' ? 'destructive' : 'default'}>
                {debugMode === 'auth-only' ? 'Auth Only' : 'Full Mode'}
              </Badge>
              {debugMode === 'auth-only' && !isSessionReady && (
                <span className="text-sm text-muted-foreground">
                  Waiting for authentication...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Data: {dataLogger.getTraceId().slice(-8)}</span>
              <span>•</span>
              <span>Auth: {authLogger.getTraceId().slice(-8)}</span>
            </div>
          </div>

          {/* Auth Status Row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={authDebugInfo.hasAccessToken ? 'default' : 'secondary'}>
                Token: {authDebugInfo.hasAccessToken ? '✓' : '✗'}
              </Badge>
              <Badge variant={authDebugInfo.hasSession ? 'default' : 'secondary'}>
                Session: {authDebugInfo.hasSession ? '✓' : '✗'}
              </Badge>
              <Badge variant={authDebugInfo.hasUser ? 'default' : 'secondary'}>
                User: {authDebugInfo.hasUser ? '✓' : '✗'}
              </Badge>
              {sessionTimeRemaining !== null && (
                <Badge variant={sessionTimeRemaining < 300 ? 'destructive' : 'outline'}>
                  Expires: {Math.floor(sessionTimeRemaining / 60)}m {sessionTimeRemaining % 60}s
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={dataLogger.isDebugEnabled() ? "default" : "outline"}
              onClick={toggleDataDebug}
              title={`Data Debug ${dataLogger.isDebugEnabled() ? 'ON' : 'OFF'}`}
              className="h-8 w-8 p-0"
              disabled={debugMode === 'auth-only'}
            >
              {dataLogger.isDebugEnabled() ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            
            <Button
              size="sm"
              variant={authLogger.isDebugEnabled() ? "default" : "outline"}
              onClick={toggleAuthDebug}
              title={`Auth Debug ${authLogger.isDebugEnabled() ? 'ON' : 'OFF'}`}
              className="h-8 w-8 p-0"
            >
              {authLogger.isDebugEnabled() ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </Button>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleTokenRefresh} 
              title="Refresh Auth Token"
              className="h-8 w-8 p-0"
              disabled={!authDebugInfo.hasSession}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleAuthReset} 
              title="Reset Auth State & Reload"
              className="h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={refreshLogs} 
              title="Refresh Logs"
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearDebugEvents} 
              title="Clear Events"
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={exportLogs} 
              title="Export Logs"
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onClose} 
              title="Close"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
          <div className="space-y-4">
            <DebugConsole 
              events={debugEvents} 
              onClear={clearDebugEvents}
            />
          </div>
          <div className="space-y-4">
            {debugMode === 'auth-only' ? (
              <div className="rounded-2xl border bg-muted/30 p-4 space-y-4">
                <header>
                  <h2 className="text-base font-semibold">Auth-Only Mode</h2>
                  <p className="text-sm text-muted-foreground">
                    Request Inspector disabled until authentication is complete.
                  </p>
                </header>
                <div className="space-y-2 text-sm">
                  <div>Status: {isSessionReady ? 'Session ready' : 'Waiting for session'}</div>
                  <div>Actions available:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>View auth events in console</li>
                    <li>Refresh auth token</li>
                    <li>Reset auth state</li>
                  </ul>
                </div>
              </div>
            ) : (
              <RequestInspector 
                request={lastRequest} 
                response={lastResponse}
              />
            )}
          </div>
        </div>

        <footer className="p-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              Hotkey: <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+D</kbd> to toggle
            </span>
            <span>
              URL params: <code>?dataDebug=1</code>, <code>?authDebug=1</code>, <code>?authDebugOnly=1</code>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}