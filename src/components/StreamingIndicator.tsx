import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap, Wifi, WifiOff } from 'lucide-react';

interface StreamingIndicatorProps {
  isStreaming: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  tokensPerSecond?: number;
}

export const StreamingIndicator = ({ 
  isStreaming, 
  connectionQuality, 
  tokensPerSecond = 0 
}: StreamingIndicatorProps) => {
  const getQualityIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="w-3 h-3 text-green-500" />;
      case 'good':
        return <Wifi className="w-3 h-3 text-yellow-500" />;
      case 'poor':
        return <Wifi className="w-3 h-3 text-red-500" />;
      case 'disconnected':
        return <WifiOff className="w-3 h-3 text-gray-500" />;
    }
  };

  const getQualityBadge = () => {
    if (!isStreaming) return null;
    
    switch (connectionQuality) {
      case 'excellent':
        return <Badge variant="default" className="bg-green-100 text-green-800">Fast</Badge>;
      case 'good':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Good</Badge>;
      case 'poor':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Slow</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Offline</Badge>;
    }
  };

  if (!isStreaming && connectionQuality === 'disconnected') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {getQualityIcon()}
      
      {isStreaming && (
        <>
          <Zap className="w-3 h-3 animate-pulse text-primary" />
          <span>Streaming</span>
          {tokensPerSecond > 0 && (
            <span className="tabular-nums">
              {tokensPerSecond.toFixed(1)} tok/s
            </span>
          )}
        </>
      )}
      
      {getQualityBadge()}
    </div>
  );
};