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
  
  // Use direct data if available, otherwise use fetched data
  const promptData = directPromptData || fetchedPromptData;

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

  if (error || !promptData) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">Failed to load prompt data</p>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-[95vh]">
        <PromptViewer 
          data={promptData} 
          onClose={onClose} 
        />
      </div>
    </div>
  );
}