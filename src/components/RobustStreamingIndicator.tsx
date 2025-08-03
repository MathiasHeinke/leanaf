import React from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type StreamState = 'idle' | 'connecting' | 'loading-context' | 'streaming' | 'completing' | 'error' | 'aborted';

interface RobustStreamingIndicatorProps {
  streamState: StreamState;
  isRecovering?: boolean;
  retryCount?: number;
  canRetry?: boolean;
  metrics?: {
    firstTokenTime?: number;
    totalDuration?: number;
    tokensPerSecond?: number;
    contextLoadTime?: number;
  };
  error?: string | null;
  onRetry?: () => void;
}

export const RobustStreamingIndicator: React.FC<RobustStreamingIndicatorProps> = ({
  streamState,
  isRecovering = false,
  retryCount = 0,
  canRetry = false,
  metrics,
  error,
  onRetry
}) => {
  const getStateInfo = (state: StreamState) => {
    switch (state) {
      case 'connecting':
        return {
          icon: <Wifi className="h-3 w-3 animate-pulse" />,
          text: 'Verbinde...',
          color: 'bg-blue-500',
          progress: 15
        };
      case 'loading-context':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Lade Kontext...',
          color: 'bg-yellow-500',
          progress: 35
        };
      case 'streaming':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Streaming...',
          color: 'bg-green-500',
          progress: 70
        };
      case 'completing':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Abschließen...',
          color: 'bg-green-600',
          progress: 95
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: isRecovering ? 'Wiederherstellung...' : 'Fehler',
          color: 'bg-red-500',
          progress: 0
        };
      case 'aborted':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Abgebrochen',
          color: 'bg-gray-500',
          progress: 0
        };
      default:
        return null;
    }
  };

  const stateInfo = getStateInfo(streamState);

  if (!stateInfo || streamState === 'idle') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stateInfo.color} animate-pulse`} />
        {stateInfo.icon}
        <span className="font-medium">{stateInfo.text}</span>
        
        {streamState === 'streaming' && (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            Live
          </Badge>
        )}
        
        {retryCount > 0 && (
          <Badge variant="outline" className="text-xs px-1 py-0">
            Versuch {retryCount + 1}
          </Badge>
        )}
      </div>

      {/* Progress bar for active states */}
      {(streamState === 'connecting' || streamState === 'loading-context' || streamState === 'streaming') && (
        <div className="flex-1 max-w-24">
          <Progress value={stateInfo.progress} className="h-1" />
        </div>
      )}

      {/* Performance metrics */}
      {metrics && streamState === 'streaming' && (
        <div className="text-xs text-muted-foreground">
          {metrics.tokensPerSecond && (
            <span>{Math.round(metrics.tokensPerSecond)} t/s</span>
          )}
        </div>
      )}

      {/* Error details with retry button */}
      {(streamState === 'error' || streamState === 'aborted') && !isRecovering && (
        <div className="flex items-center gap-1">
          {error && (
            <span className="text-xs text-destructive max-w-32 truncate" title={error}>
              {error}
            </span>
          )}
          {canRetry && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Erneut versuchen"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Recovery indicator */}
      {isRecovering && (
        <div className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs text-blue-600">Repariere...</span>
        </div>
      )}
    </div>
  );
};