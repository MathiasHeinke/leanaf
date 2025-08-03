import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRobustStreamingChat } from '@/hooks/useRobustStreamingChat';
import { RobustStreamingIndicator } from '@/components/RobustStreamingIndicator';
import { useAuth } from '@/hooks/useAuth';

export const StreamingTestPanel: React.FC = () => {
  const [testMessage, setTestMessage] = useState('Hallo, wie geht es dir heute?');
  const { user } = useAuth();
  
  const {
    streamingMessage,
    streamState,
    startStreaming,
    stopStreaming,
    clearStreamingMessage,
    isRecovering,
    canRetry,
    retryCount,
    metrics,
    streamError,
    isHealthy
  } = useRobustStreamingChat({
    onStreamStart: () => console.log('🧪 Test streaming started'),
    onStreamEnd: () => console.log('✅ Test streaming completed'),
    onError: (error) => console.error('❌ Test streaming error:', error)
  });

  const handleTestStream = async () => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    await startStreaming(
      user.id,
      testMessage,
      'lucy',
      []
    );
  };

  const handleRetry = async () => {
    await handleTestStream();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Streaming Test Panel
          <Badge variant={isHealthy ? 'default' : 'destructive'}>
            {isHealthy ? 'Healthy' : 'Unhealthy'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Controls */}
        <div className="space-y-2">
          <Input
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Test message..."
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleTestStream}
              disabled={streamState !== 'idle' && streamState !== 'error'}
            >
              Start Test Stream
            </Button>
            <Button 
              variant="outline"
              onClick={stopStreaming}
              disabled={streamState === 'idle'}
            >
              Stop Stream
            </Button>
            <Button 
              variant="outline"
              onClick={clearStreamingMessage}
              disabled={!streamingMessage}
            >
              Clear Message
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        <RobustStreamingIndicator
          streamState={streamState}
          isRecovering={isRecovering}
          retryCount={retryCount}
          canRetry={canRetry}
          metrics={metrics}
          error={streamError}
          onRetry={handleRetry}
        />

        {/* Streaming Message */}
        {streamingMessage && (
          <div className="p-3 border rounded-lg bg-muted/50">
            <div className="text-sm font-medium mb-2">
              Streaming Response {streamingMessage.isComplete ? '(Complete)' : '(Streaming...)'}
            </div>
            <div className="text-sm whitespace-pre-wrap">
              {streamingMessage.content || 'Waiting for content...'}
            </div>
          </div>
        )}

        {/* Metrics */}
        {metrics && Object.keys(metrics).length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {metrics.firstTokenTime && (
              <div>First Token: {metrics.firstTokenTime}ms</div>
            )}
            {metrics.totalDuration && (
              <div>Total Duration: {metrics.totalDuration}ms</div>
            )}
            {metrics.tokensPerSecond && (
              <div>Tokens/sec: {metrics.tokensPerSecond}</div>
            )}
            {metrics.contextLoadTime && (
              <div>Context Load: {metrics.contextLoadTime}ms</div>
            )}
          </div>
        )}

        {/* Debug Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Stream State: {streamState}</div>
          <div>Retry Count: {retryCount}</div>
          <div>Can Retry: {canRetry ? 'Yes' : 'No'}</div>
          <div>Is Recovering: {isRecovering ? 'Yes' : 'No'}</div>
        </div>
      </CardContent>
    </Card>
  );
};