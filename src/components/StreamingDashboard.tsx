import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, MessageSquare, TrendingUp } from 'lucide-react';

interface PerformanceMetrics {
  avgResponseTime: number;
  streamingSuccess: number;
  totalMessages: number;
  p95ResponseTime: number;
}

interface StreamingDashboardProps {
  metrics: PerformanceMetrics;
  isStreaming: boolean;
  currentLatency?: number;
}

export const StreamingDashboard = ({ metrics, isStreaming, currentLatency }: StreamingDashboardProps) => {
  const getLatencyColor = (latency: number) => {
    if (latency < 2000) return 'text-green-600';
    if (latency < 5000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLatencyBadge = (latency: number) => {
    if (latency < 2000) return { variant: 'default' as const, text: 'Excellent' };
    if (latency < 5000) return { variant: 'secondary' as const, text: 'Good' };
    return { variant: 'destructive' as const, text: 'Slow' };
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getLatencyColor(metrics.avgResponseTime)}>
              {(metrics.avgResponseTime / 1000).toFixed(1)}s
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            P95: {(metrics.p95ResponseTime / 1000).toFixed(1)}s
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Streaming Success</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.streamingSuccess}%</div>
          <Progress value={metrics.streamingSuccess} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalMessages}</div>
          <p className="text-xs text-muted-foreground">
            Today's conversations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Status</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <Badge variant="default">Streaming</Badge>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <Badge variant="secondary">Idle</Badge>
              </>
            )}
          </div>
          {currentLatency && (
            <div className="mt-2">
              <Badge {...getLatencyBadge(currentLatency)}>
                {(currentLatency / 1000).toFixed(1)}s
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};