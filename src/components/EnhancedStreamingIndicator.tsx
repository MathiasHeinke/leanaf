import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Brain, Database, Wifi } from 'lucide-react';

interface StreamingIndicatorProps {
  isConnected: boolean;
  isStreaming?: boolean;
  progress?: number;
  stage?: 'connecting' | 'context' | 'streaming' | 'complete';
  metrics?: {
    tokensIn?: number;
    duration?: number;
    contextLoaded?: boolean;
  };
}

export function EnhancedStreamingIndicator({ 
  isConnected, 
  isStreaming = false, 
  progress = 0,
  stage = 'connecting',
  metrics 
}: StreamingIndicatorProps) {
  const getStageInfo = (currentStage: string) => {
    switch (currentStage) {
      case 'connecting':
        return { 
          icon: Wifi, 
          text: 'Verbinde...', 
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-950'
        };
      case 'context':
        return { 
          icon: Database, 
          text: 'Lade Kontext...', 
          color: 'text-purple-500',
          bgColor: 'bg-purple-50 dark:bg-purple-950'
        };
      case 'streaming':
        return { 
          icon: Brain, 
          text: 'Coach denkt...', 
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-950'
        };
      case 'complete':
        return { 
          icon: Zap, 
          text: 'Abgeschlossen', 
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-50 dark:bg-emerald-950'
        };
      default:
        return { 
          icon: Loader2, 
          text: 'Verarbeite...', 
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-950'
        };
    }
  };

  const stageInfo = getStageInfo(stage);
  const IconComponent = stageInfo.icon;

  if (!isConnected && !isStreaming) return null;

  return (
    <div className={`
      rounded-lg border p-3 space-y-2 transition-all duration-300
      ${stageInfo.bgColor}
    `}>
      <div className="flex items-center gap-2">
        <IconComponent 
          className={`h-4 w-4 ${stageInfo.color} ${
            stage === 'streaming' || stage === 'connecting' ? 'animate-spin' : ''
          }`} 
        />
        <span className={`text-sm font-medium ${stageInfo.color}`}>
          {stageInfo.text}
        </span>
        
        {stage === 'streaming' && (
          <Badge variant="secondary" className="ml-auto text-xs">
            Live
          </Badge>
        )}
      </div>

      {progress > 0 && progress < 100 && (
        <Progress value={progress} className="h-1" />
      )}

      {metrics && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {metrics.tokensIn && (
            <span>📊 {metrics.tokensIn} Tokens</span>
          )}
          {metrics.duration && (
            <span>⏱️ {metrics.duration}ms</span>
          )}
          {metrics.contextLoaded && (
            <span className="text-green-600">✅ Kontext geladen</span>
          )}
        </div>
      )}
    </div>
  );
}