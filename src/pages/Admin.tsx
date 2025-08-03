import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity, 
  Database, 
  Flag,
  Users,
  BarChart3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { PerformanceMonitoringDashboard } from '@/components/PerformanceMonitoringDashboard';
import { SecurityMonitor } from '@/components/SecurityMonitor';
import { AppHealthCheck } from '@/components/AppHealthCheck';
import { FeatureFlagsManager } from '@/components/FeatureFlagsManager';
import { StreamingDashboard } from '@/components/StreamingDashboard';
import OpenAIPerformanceDashboard from '@/components/OpenAIPerformanceDashboard';
import RAGPerformanceMonitor from '@/components/RAGPerformanceMonitor';

export const AdminPage = () => {
  const { user } = useAuth();
  const [performanceMetrics] = useState({
    averageResponseTime: 1200,
    successRate: 97.5,
    errorPatterns: { 'timeout': 5, 'rate_limit': 3 },
    totalRequests: 1500
  });
  
  const [streamingMetrics] = useState({
    avgResponseTime: 800,
    streamingSuccess: 98.2,
    totalMessages: 2400,
    p95ResponseTime: 1500
  });

  const [retryStates] = useState({});

  // Basic admin check - in production, check user roles
  const isAdmin = user?.email?.includes('admin') || process.env.NODE_ENV === 'development';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Sie haben keine Berechtigung für diese Seite.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              System-Überwachung und Debug-Tools
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Shield className="w-3 h-3 mr-1" />
            Admin-Modus
          </Badge>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Health
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="streaming" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Streaming
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              AI & RAG
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <PerformanceMonitoringDashboard
              performanceMetrics={performanceMetrics}
              retryStates={retryStates}
              streamingMetrics={{
                isConnected: true,
                tokensPerSecond: 15,
                connectionQuality: 'excellent' as const
              }}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityMonitor />
          </TabsContent>

          <TabsContent value="health">
            <AppHealthCheck />
          </TabsContent>

          <TabsContent value="features">
            <FeatureFlagsManager />
          </TabsContent>

          <TabsContent value="streaming">
            <StreamingDashboard
              metrics={streamingMetrics}
              isStreaming={true}
              currentLatency={800}
            />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <OpenAIPerformanceDashboard />
            <RAGPerformanceMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};