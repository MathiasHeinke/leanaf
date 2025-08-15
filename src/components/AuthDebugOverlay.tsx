import { useState, useEffect } from 'react';
import { X, RefreshCw, Download, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { authLogger } from '@/lib/authLogger';

interface AuthDebugOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export function AuthDebugOverlay({ isVisible, onClose }: AuthDebugOverlayProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const recentLogs = await authLogger.getRecentLogs(100);
      setLogs(recentLogs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      // Fallback to localStorage only
      const localLogs = JSON.parse(localStorage.getItem('auth_debug_logs') || '[]');
      setLogs(localLogs.slice(0, 50));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isVisible) {
      fetchLogs();
    }
  }, [isVisible]);

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auth_debug_logs_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'INIT': return 'bg-blue-100 text-blue-800';
      case 'SIGNED_IN': return 'bg-green-100 text-green-800';
      case 'SIGNED_OUT': return 'bg-red-100 text-red-800';
      case 'TOKEN_REFRESHED': return 'bg-yellow-100 text-yellow-800';
      case 'REDIRECT_DECISION': return 'bg-purple-100 text-purple-800';
      case 'ERROR': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Auth Debug Timeline</h2>
            <Badge variant="outline" className="text-xs">
              Trace: {authLogger.getTraceId().slice(-8)}
            </Badge>
            <Badge className="text-xs bg-green-100 text-green-800">
              ACTIVE
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="mb-4">No auth events logged yet.</div>
              <div className="text-sm space-y-2">
                <div>Try:</div>
                <div>• Logging in/out</div>
                <div>• Refreshing the page</div>
                <div>• Check console for 🔐 Auth Debug messages</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={log.id || index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getEventColor(log.event)}>
                        {log.event}
                      </Badge>
                       {log.stage && (
                        <Badge variant="outline" className="text-xs">
                          {log.stage}
                        </Badge>
                      )}
                      {log.id && log.id.startsWith('local_') && (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          LOCAL
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.event_time || log.client_ts)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={log.has_session ? 'text-green-600' : 'text-red-600'}>
                        Session: {log.has_session ? '✓' : '✗'}
                      </span>
                      <span className={log.has_user ? 'text-green-600' : 'text-red-600'}>
                        User: {log.has_user ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    <div>Path: {log.pathname}</div>
                    {log.from_path && log.to_path && (
                      <div>Redirect: {log.from_path} → {log.to_path}</div>
                    )}
                    {log.auth_event && (
                      <div>Auth Event: {log.auth_event}</div>
                    )}
                  </div>

                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Details
                      </summary>
                      <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-xs text-gray-500 space-y-1">
          <div>Debug mode: Add ?authDebug=1 to URL or run:</div>
          <code className="bg-gray-100 px-2 py-1 rounded">localStorage.setItem('auth_debug', 'true')</code>
          <div>Console logs: Look for 🔐 Auth Debug messages</div>
        </div>
      </div>
    </div>
  );
}