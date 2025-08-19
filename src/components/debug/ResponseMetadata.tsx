import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, Brain, Route, Shuffle, AlertTriangle } from 'lucide-react';

interface ResponseMetadataProps {
  metadata?: {
    coachId?: string;
    model?: string;
    pipeline?: string;
    fallback?: boolean;
    retryCount?: number;
    processingTime?: number;
    source?: 'v1' | 'v2' | 'debug' | 'orchestrator';
    downgraded?: boolean;
    error?: string;
  };
  className?: string;
}

export function ResponseMetadata({ metadata, className }: ResponseMetadataProps) {
  if (!metadata) return null;

  const {
    coachId = 'unknown',
    model = 'unknown',
    pipeline = 'unknown',
    fallback = false,
    retryCount = 0,
    processingTime,
    source = 'unknown',
    downgraded = false,
    error
  } = metadata;

  return (
    <Card className={`p-2 bg-muted/20 border-l-4 ${
      source === 'v1' ? 'border-l-red-500' : 
      fallback ? 'border-l-yellow-500' : 
      'border-l-green-500'
    } ${className}`}>
      <div className="flex flex-wrap gap-2 text-xs">
        {/* Coach & Source */}
        <Badge variant={source === 'v1' ? 'destructive' : 'secondary'} className="h-5">
          <Brain className="w-3 h-3 mr-1" />
          {coachId.toUpperCase()}
        </Badge>

        <Badge variant="outline" className="h-5">
          <Route className="w-3 h-3 mr-1" />
          {source.toUpperCase()}
        </Badge>

        {/* Model */}
        <Badge variant="outline" className="h-5">
          {model}
        </Badge>

        {/* Pipeline/Processing Info */}
        {downgraded && (
          <Badge variant="secondary" className="h-5">
            <Shuffle className="w-3 h-3 mr-1" />
            Downgraded
          </Badge>
        )}

        {fallback && (
          <Badge variant="secondary" className="h-5">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Fallback
          </Badge>
        )}

        {retryCount > 0 && (
          <Badge variant="outline" className="h-5">
            Retry #{retryCount}
          </Badge>
        )}

        {/* Timing */}
        {processingTime && (
          <Badge variant="outline" className="h-5">
            <Clock className="w-3 h-3 mr-1" />
            {processingTime}ms
          </Badge>
        )}

        {/* Error indicator */}
        {error && (
          <Badge variant="destructive" className="h-5">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )}
      </div>

      {/* Warning for V1 responses */}
      {source === 'v1' && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          ⚠️ Legacy v1 response detected - expected v2 quality degradation
        </div>
      )}

      {/* Error details */}
      {error && (
        <div className="mt-2 text-xs text-muted-foreground">
          {error}
        </div>
      )}
    </Card>
  );
}