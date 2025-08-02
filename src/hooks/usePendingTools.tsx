import { useState, useCallback } from 'react';

export interface PendingTool {
  tool: string;
  label: string;
  description?: string;
  confidence: number;
  contextData?: any;
  messageId?: string;
}

export const usePendingTools = () => {
  const [pendingTools, setPendingTools] = useState<PendingTool[]>([]);

  const addPendingTool = useCallback((pendingTool: PendingTool) => {
    setPendingTools(prev => {
      // Remove any existing tool of the same type
      const filtered = prev.filter(t => t.tool !== pendingTool.tool);
      return [...filtered, pendingTool];
    });
  }, []);

  const removePendingTool = useCallback((tool: string) => {
    setPendingTools(prev => prev.filter(t => t.tool !== tool));
  }, []);

  const clearAllPendingTools = useCallback(() => {
    setPendingTools([]);
  }, []);

  const getPendingTool = useCallback((tool: string): PendingTool | undefined => {
    return pendingTools.find(t => t.tool === tool);
  }, [pendingTools]);

  const hasPendingTool = useCallback((tool: string): boolean => {
    return pendingTools.some(t => t.tool === tool);
  }, [pendingTools]);

  return {
    pendingTools,
    addPendingTool,
    removePendingTool,
    clearAllPendingTools,
    getPendingTool,
    hasPendingTool
  };
};