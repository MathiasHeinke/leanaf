import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrainingPlanAnalytics } from '@/hooks/useTrainingPlanAnalytics';
import { Activity, Clock, CheckCircle, XCircle, ThumbsUp, Zap } from 'lucide-react';

export const TrainingPlanAnalyticsDashboard: React.FC = () => {
  const { metrics, isLoading, fetchMetrics } = useTrainingPlanAnalytics();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchMetrics(timeRange);
  }, [timeRange]);

  const handleRefresh = () => {
    fetchMetrics(timeRange);
  };

  const getStatusColor = (value: number, type: 'success' | 'error' | 'performance') => {
    switch (type) {
      case 'success':
        return value >= 95 ? 'bg-green-500' : value >= 85 ? 'bg-yellow-500' : 'bg-red-500';
      case 'error':
        return value <= 5 ? 'bg-green-500' : value <= 15 ? 'bg-yellow-500' : 'bg-red-500';
      case 'performance':
        return value <= 2000 ? 'bg-green-500' : value <= 5000 ? 'bg-yellow-500' : 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    type = 'default',
    suffix = '' 
  }: {
    title: string;
    value: number;
    description: string;
    icon: React.ComponentType<any>;
    type?: 'success' | 'error' | 'performance' | 'default';
    suffix?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-bold">
            {value.toLocaleString()}{suffix}
          </div>
          {type !== 'default' && (
            <Badge 
              className={`${getStatusColor(value, type)} text-white`}
              variant="secondary"
            >
              {type === 'success' && value >= 95 ? 'Excellent' :
               type === 'success' && value >= 85 ? 'Good' :
               type === 'error' && value <= 5 ? 'Excellent' :
               type === 'error' && value <= 15 ? 'Good' :
               type === 'performance' && value <= 2000 ? 'Fast' :
               type === 'performance' && value <= 5000 ? 'OK' : 'Slow'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );

  if (isLoading && metrics.totalPlansCreated === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Training Plan Analytics</h2>
          <p className="text-muted-foreground">
            Performance metrics for training plan generation
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={(value: 'day' | 'week' | 'month') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefresh} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Plans Created"
          value={metrics.totalPlansCreated}
          description="Total training plans generated"
          icon={Activity}
        />
        
        <MetricCard
          title="Success Rate"
          value={metrics.successRate}
          description="Percentage of successful plan generations"
          icon={CheckCircle}
          type="success"
          suffix="%"
        />
        
        <MetricCard
          title="Average Response Time"
          value={metrics.averageResponseTime}
          description="Average time to generate a plan"
          icon={Clock}
          type="performance"
          suffix="ms"
        />
        
        <MetricCard
          title="Error Rate"
          value={metrics.errorRate}
          description="Percentage of failed plan generations"
          icon={XCircle}
          type="error"
          suffix="%"
        />
        
        <MetricCard
          title="User Satisfaction"
          value={metrics.userFeedbackScore}
          description="Percentage of confirmed vs rejected plans"
          icon={ThumbsUp}
          type="success"
          suffix="%"
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={metrics.cacheHitRate}
          description="Percentage of requests served from cache"
          icon={Zap}
          type="performance"
          suffix="%"
        />
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>
            Overall status of the training plan generation system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Badge 
              variant={metrics.successRate >= 95 ? "default" : metrics.successRate >= 85 ? "secondary" : "destructive"}
            >
              Success Rate: {metrics.successRate.toFixed(1)}%
            </Badge>
            <Badge 
              variant={metrics.errorRate <= 5 ? "default" : metrics.errorRate <= 15 ? "secondary" : "destructive"}
            >
              Error Rate: {metrics.errorRate.toFixed(1)}%
            </Badge>
            <Badge 
              variant={metrics.averageResponseTime <= 2000 ? "default" : metrics.averageResponseTime <= 5000 ? "secondary" : "destructive"}
            >
              Avg Response: {metrics.averageResponseTime}ms
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};