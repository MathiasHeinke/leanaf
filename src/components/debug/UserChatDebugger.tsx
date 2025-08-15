import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Activity, MessageCircle, Cog, CheckCircle } from 'lucide-react';

export type DebugStep = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp: number;
  details?: string;
  duration?: number;
};

type Props = {
  isVisible: boolean;
  onToggle: () => void;
  steps: DebugStep[];
  onClear: () => void;
};

const statusIcons = {
  pending: '⚪',
  running: '🟡',
  success: '🟢',
  error: '🔴',
};

const statusLabels = {
  pending: 'Wartend',
  running: 'Läuft...',
  success: 'Erfolgreich',
  error: 'Fehler',
};

export function UserChatDebugger({ isVisible, onToggle, steps, onClear }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const latestStep = steps[steps.length - 1];
  const hasError = steps.some(step => step.status === 'error');
  const isProcessing = steps.some(step => step.status === 'running');

  // Auto-expand when there's an error
  useEffect(() => {
    if (hasError) {
      setIsExpanded(true);
    }
  }, [hasError]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 w-80 max-w-[calc(100vw-2rem)] z-40">
      <div className="bg-background border rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Message Debug</span>
            {isProcessing && <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />}
            {hasError && <div className="w-2 h-2 bg-red-500 rounded-full" />}
          </div>
          <div className="flex items-center gap-2">
            {latestStep && (
              <span className="text-xs text-muted-foreground">
                {statusIcons[latestStep.status]} {statusLabels[latestStep.status]}
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {steps.length} Schritte • Live-Verfolgung
              </div>
              <button 
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Leeren
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {steps.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Noch keine Nachrichten verarbeitet
                </div>
              ) : (
                steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-3 p-2 rounded-lg border bg-card/50">
                    <div className="text-sm mt-0.5">{statusIcons[step.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{step.title}</div>
                      {step.details && (
                        <div className="text-xs text-muted-foreground mt-1">{step.details}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                        {step.duration && <span>• {step.duration}ms</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tips */}
            {hasError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                <div className="text-xs text-destructive font-medium mb-1">💡 Tipp</div>
                <div className="text-xs text-destructive/80">
                  ARES hatte Probleme bei der Verarbeitung. Versuche deine Nachricht anders zu formulieren.
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                <div className="text-xs text-yellow-700 dark:text-yellow-300 font-medium mb-1">⚡ Status</div>
                <div className="text-xs text-yellow-700/80 dark:text-yellow-300/80">
                  ARES verarbeitet deine Nachricht...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}