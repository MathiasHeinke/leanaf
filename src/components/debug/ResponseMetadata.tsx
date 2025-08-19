import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Brain, Route, Shuffle, AlertTriangle, Search, Eye } from 'lucide-react';
import { PromptInspectionModal } from './PromptInspectionModal';

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
    traceId?: string;
    rawResponse?: any;
    apiErrors?: any[];
  };
  className?: string;
}

export function ResponseMetadata({ metadata, className }: ResponseMetadataProps) {
  const [showPromptModal, setShowPromptModal] = useState(false);
  
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
    error,
    traceId,
    rawResponse,
    apiErrors
  } = metadata;

  return (
    <>
      <Card className={`p-2 bg-muted/20 border-l-4 ${
        source === 'v1' ? 'border-l-red-500' : 
        fallback ? 'border-l-yellow-500' : 
        'border-l-green-500'
      } ${className}`}>
        <div className="flex items-center justify-between">
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

          {/* API Errors */}
          {apiErrors && apiErrors.length > 0 && (
            <Badge variant="destructive" className="h-5">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {apiErrors.length} API Error{apiErrors.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Debug Actions */}
        <div className="flex gap-1">
          {traceId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPromptModal(true)}
              className="h-6 px-2 text-xs hover:bg-primary/10"
              title="Inspect full prompt and OpenAI response"
            >
              <Search className="w-3 h-3 mr-1" />
              Debug
            </Button>
          )}
        </div>
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

        {/* API Error details */}
        {apiErrors && apiErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {apiErrors.map((apiError, idx) => (
              <div key={idx} className="text-xs text-red-600 dark:text-red-400">
                🚨 API Error: {apiError.message || JSON.stringify(apiError)}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Prompt Inspection Modal */}
      {showPromptModal && (
        <PromptInspectionModal
          traceId={traceId}
          promptData={metadata}
          onClose={() => setShowPromptModal(false)}
        />
      )}
    </>
  );
}