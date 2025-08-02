import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Clock, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { ConversationContext } from '@/hooks/useConversationMemory';

interface MemoryDebugPanelProps {
  context: ConversationContext;
  isSyncing: boolean;
  error: string | null;
  onClearMemory?: () => void;
  onRetrySync?: () => void;
}

export const MemoryDebugPanel: React.FC<MemoryDebugPanelProps> = ({
  context,
  isSyncing,
  error,
  onClearMemory,
  onRetrySync
}) => {
  const { recentMessages, historicalSummary, messageCount } = context;

  return (
    <Card className="w-full max-w-md mx-auto border-muted bg-background/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4" />
          Memory Debug
          {isSyncing && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Badge variant={error ? "destructive" : isSyncing ? "secondary" : "default"}>
            {error ? "Error" : isSyncing ? "Syncing..." : "Active"}
          </Badge>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">{error}</span>
            {onRetrySync && (
              <Button size="sm" variant="outline" onClick={onRetrySync}>
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Message Count */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Messages:</span>
          <Badge variant="outline">{messageCount}</Badge>
        </div>

        {/* Recent Messages */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Recent (Memory):</span>
          <Badge variant="outline">
            <MessageSquare className="h-3 w-3 mr-1" />
            {recentMessages.length}/10
          </Badge>
        </div>

        {/* Historical Summary */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Historical Summary:</span>
          <Badge variant={historicalSummary ? "default" : "secondary"}>
            {historicalSummary ? "Available" : "None"}
          </Badge>
        </div>

        {/* Summary Preview */}
        {historicalSummary && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Summary:</p>
            <p className="text-xs">{historicalSummary.slice(0, 100)}...</p>
          </div>
        )}

        {/* Recent Messages Preview */}
        {recentMessages.length > 0 && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Last Message:</p>
            <p className="text-xs">
              <Badge variant="secondary" className="mr-1">
                {recentMessages[recentMessages.length - 1].role}
              </Badge>
              {recentMessages[recentMessages.length - 1].content.slice(0, 80)}...
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {onClearMemory && (
            <Button size="sm" variant="destructive" onClick={onClearMemory} className="flex-1">
              <Brain className="h-3 w-3 mr-1" />
              Clear Memory
            </Button>
          )}
          <Badge variant="outline" className="flex-1 justify-center">
            <Clock className="h-3 w-3 mr-1" />
            Rolling Memory
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};