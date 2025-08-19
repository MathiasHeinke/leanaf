import React from 'react';
import { PromptViewer } from '@/components/gehirn/PromptViewer';
import { usePromptTraceData } from '@/hooks/usePromptTraceData';

interface PromptInspectionModalProps {
  traceId?: string | null;
  promptData?: any; // For direct debug data from response.meta.debug
  onClose: () => void;
}

export function PromptInspectionModal({ traceId, promptData: directPromptData, onClose }: PromptInspectionModalProps) {
  const { promptData: fetchedPromptData, loading, error } = usePromptTraceData(traceId || undefined);
  
  // Create fallback data from direct data if available
  const createFallbackData = (metadata: any) => {
    if (!metadata) return null;
    return {
      traceId: metadata.traceId || traceId,
      fallbackMetadata: {
        coachId: metadata.coachId,
        model: metadata.model || metadata.finalModel,
        pipeline: metadata.pipeline,
        fallback: metadata.fallback,
        retryCount: metadata.retryCount,
        processingTime: metadata.processingTime,
        source: metadata.source,
        downgraded: metadata.downgraded,
        error: metadata.error,
        rawResponse: metadata.rawResponse,
        apiErrors: metadata.apiErrors,
        version: metadata.version,
        usedV1Fallback: metadata.usedV1Fallback,
        dial: metadata.dial,
        archetype: metadata.archetype,
        antiRepeatTriggered: metadata.antiRepeatTriggered,
      }
    };
  };

  // Always prioritize fetchedPromptData if available, then create fallback from directPromptData
  const promptData = fetchedPromptData || createFallbackData(directPromptData);
  
  // Debug trace ID mismatch issues
  if (traceId && !fetchedPromptData && !error) {
    console.warn(`[PromptInspectionModal] TraceId lookup failed for: ${traceId}. Using fallback data.`);
  }

  if (!traceId && !directPromptData) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading prompt data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !promptData) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg p-6 max-w-md">
          <div className="text-center">
            <p className="text-destructive mb-4">Trace data not found</p>
            <p className="text-sm text-muted-foreground mb-4">
              TraceId: <code className="bg-muted px-2 py-1 rounded text-xs">{traceId}</code>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              The trace might not be stored in the database yet, or there's a format mismatch between Edge Function traces and database queries.
            </p>
            <div className="text-xs text-left bg-muted p-3 rounded mb-4">
              <strong>Debug Info:</strong><br/>
              Error: {error}<br/>
              TraceId format: {traceId?.includes('-') ? 'UUID' : 'Legacy'}
            </div>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-7xl h-[98vh] sm:h-[95vh] rounded-lg overflow-hidden">
        <PromptViewer 
          data={promptData} 
          onClose={onClose} 
          className="h-full"
        />
      </div>
    </div>
  );
}