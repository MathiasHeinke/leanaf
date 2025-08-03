import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorPatterns: Record<string, number>;
  totalRequests: number;
}

interface RetryState {
  messageId: string;
  attempts: Array<{
    attemptNumber: number;
    timestamp: Date;
    error?: string;
    duration?: number;
    success: boolean;
  }>;
  isRetrying: boolean;
  canRetry: boolean;
}

interface PerformanceMonitoringDashboardProps {
  performanceMetrics: PerformanceMetrics;
  retryStates: Record<string, RetryState>;
  streamingMetrics?: {
    isConnected: boolean;
    tokensPerSecond: number;
    connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  };
}

export const PerformanceMonitoringDashboard = ({
  performanceMetrics,
  retryStates,
  streamingMetrics
}: PerformanceMonitoringDashboardProps) => {
  const activeRetries = Object.values(retryStates).filter(state => state.isRetrying).length;
  const failedMessages = Object.values(retryStates).filter(state => !state.canRetry).length;
  
  const getResponseTimeColor = (time: number) => {
    if (time < 2000) return 'text-green-600';
    if (time < 5000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate > 0.95) return 'bg-green-500';
    if (rate > 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConnectionQualityBadge = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  return (
    <div className="grid gap-4 grid-cols-1">
      {/* Response Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getResponseTimeColor(performanceMetrics.averageResponseTime)}`}>
            {performanceMetrics.averageResponseTime.toFixed(0)}ms
          </div>
          <p className="text-xs text-muted-foreground">
            Average response time
          </p>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(performanceMetrics.successRate * 100).toFixed(1)}%
          </div>
          <div className="mt-2">
            <Progress 
              value={performanceMetrics.successRate * 100} 
              className="h-2"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {performanceMetrics.totalRequests} total requests
          </p>
        </CardContent>
      </Card>

      {/* Active Retries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Retries</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeRetries}
          </div>
          <p className="text-xs text-muted-foreground">
            {failedMessages} failed messages
          </p>
        </CardContent>
      </Card>

      {/* Streaming Status */}
      {streamingMetrics && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streaming</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {getConnectionQualityBadge(streamingMetrics.connectionQuality)}
            </div>
            {streamingMetrics.tokensPerSecond > 0 && (
              <p className="text-sm font-medium">
                {streamingMetrics.tokensPerSecond.toFixed(1)} tok/s
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {streamingMetrics.isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Patterns */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Error Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(performanceMetrics.errorPatterns).map(([errorType, count]) => (
              <div key={errorType} className="flex justify-between items-center">
                <span className="text-sm capitalize">{errorType.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{count}</Badge>
                  <div className="w-16 h-2 bg-gray-200 rounded">
                    <div 
                      className="h-2 bg-red-500 rounded"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(performanceMetrics.errorPatterns))) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(performanceMetrics.errorPatterns).length === 0 && (
              <p className="text-sm text-muted-foreground">No errors recorded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Retry Activity */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.values(retryStates)
              .slice(-5)
              .map((state) => (
                <div key={state.messageId} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">
                    {state.messageId.slice(0, 8)}...
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {state.attempts.length} attempts
                    </Badge>
                    {state.isRetrying ? (
                      <Activity className="h-3 w-3 animate-spin text-blue-500" />
                    ) : state.attempts[state.attempts.length - 1]?.success ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            {Object.keys(retryStates).length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};