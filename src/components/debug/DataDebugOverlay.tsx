import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';
import { DebugConsole } from './DebugConsole';
import { RequestInspector } from './RequestInspector';
import { useDebug } from '@/contexts/DebugContext';
import { dataLogger } from '@/utils/dataLogger';
import { authLogger } from '@/lib/authLogger';

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
    refreshLogs
  } = useDebug();

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Data Debug Console</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Data Trace: {dataLogger.getTraceId().slice(-8)}</span>
              <span>•</span>
              <span>Auth Trace: {authLogger.getTraceId().slice(-8)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleDataDebug}
              className="gap-2"
            >
              {dataLogger.isDebugEnabled() ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Data Debug {dataLogger.isDebugEnabled() ? 'ON' : 'OFF'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleAuthDebug}
              className="gap-2"
            >
              {authLogger.isDebugEnabled() ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Auth Debug {authLogger.isDebugEnabled() ? 'ON' : 'OFF'}
            </Button>
            <Button size="sm" variant="outline" onClick={refreshLogs} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportLogs} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
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
            <RequestInspector 
              request={lastRequest} 
              response={lastResponse}
            />
          </div>
        </div>

        <footer className="p-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              Hotkey: <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+Shift+D</kbd> to toggle
            </span>
            <span>
              URL params: <code>?dataDebug=1</code> or <code>?authDebug=1</code> to enable
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}