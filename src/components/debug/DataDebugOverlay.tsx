import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Download, Eye, EyeOff, Shield, ShieldOff, Trash2 } from 'lucide-react';
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
        <header className="p-4 border-b space-y-3">
          {/* Title and Trace Info */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Data Debug Console</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Data Trace: {dataLogger.getTraceId().slice(-8)}</span>
              <span>•</span>
              <span>Auth Trace: {authLogger.getTraceId().slice(-8)}</span>
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