import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity, 
  Database, 
  Flag,
  Monitor,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Route
} from 'lucide-react';
import { ProductionMonitoringDashboard } from '@/components/ProductionMonitoringDashboard';
import { PerformanceMonitoringDashboard } from '@/components/PerformanceMonitoringDashboard';
import { SecurityMonitor } from '@/components/SecurityMonitor';
import { AppHealthCheck } from '@/components/AppHealthCheck';
import { FeatureFlagsManager } from '@/components/FeatureFlagsManager';
import { StreamingDashboard } from '@/components/StreamingDashboard';
import { CoachConversationMonitor } from '@/components/CoachConversationMonitor';
import OpenAIPerformanceDashboard from '@/components/OpenAIPerformanceDashboard';
import RAGPerformanceMonitor from '@/components/RAGPerformanceMonitor';
import RealTimeTelemetryDashboard from '@/components/RealTimeTelemetryDashboard';
import { LiveTraceMonitor } from '@/components/LiveTraceMonitor';

export const AdminPage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useSecureAdminAccess('admin_panel');
  
  // Mock performance metrics for the dashboard
  const performanceMetrics = {
    averageResponseTime: 1200,
    successRate: 97.5,
    errorPatterns: { 'timeout': 5, 'rate_limit': 3 },
    totalRequests: 1500
  };
  
  const streamingMetrics = {
    avgResponseTime: 800,
    streamingSuccess: 98.2,
    totalMessages: 2400,
    p95ResponseTime: 1500
  };

  // Show loading state while checking admin access
  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-spin" />
            <CardTitle>Berechtigung wird überprüft...</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Bitte warten Sie, während Ihre Administratorrechte überprüft werden.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <CardTitle>Zugriff verweigert</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Sie haben keine Berechtigung für diese Seite.
            </p>
            {adminError && (
              <p className="text-destructive text-sm">
                Fehler: {adminError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 📱 MOBILE-OPTIMIZED STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                🚀 Production Admin
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Real-time monitoring & control center
              </p>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
      </div>

      {/* 📊 SINGLE-COLUMN MOBILE-FIRST LAYOUT */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="production" className="w-full">
          {/* 📱 RESPONSIVE TAB NAVIGATION - Erweitert für alle Tabs ohne Scrollen */}
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-8 h-auto min-h-[80px] p-2 bg-muted rounded-lg">
            <TabsTrigger value="production" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Production</span>
              <span className="sm:hidden text-[10px]">Prod</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Performance</span>
              <span className="sm:hidden text-[10px]">Perf</span>
            </TabsTrigger>
            <TabsTrigger value="trace" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <Route className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Live Trace</span>
              <span className="sm:hidden text-[10px]">Trace</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Security</span>
              <span className="sm:hidden text-[10px]">Sec</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <Database className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Health</span>
              <span className="sm:hidden text-[10px]">Health</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <Flag className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Features</span>
              <span className="sm:hidden text-[10px]">Feat</span>
            </TabsTrigger>
            <TabsTrigger value="streaming" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Streaming</span>
              <span className="sm:hidden text-[10px]">Stream</span>
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-xs sm:text-sm flex flex-col sm:flex-row items-center gap-1 min-h-[44px] px-2 py-2">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Coach Monitor</span>
              <span className="sm:hidden text-[10px]">Coach</span>
            </TabsTrigger>
          </TabsList>

          {/* 🔥 PRODUCTION MONITORING - MAIN TAB */}
          <TabsContent value="production" className="space-y-6 mt-6 safe-area-pb-6">
            <ProductionMonitoringDashboard />
          </TabsContent>

          {/* 🔍 LIVE TRACE MONITORING */}
          <TabsContent value="trace" className="space-y-6 mt-6 safe-area-pb-6">
            <LiveTraceMonitor />
          </TabsContent>

          {/* 📊 PERFORMANCE MONITORING */}
          <TabsContent value="performance" className="space-y-6 mt-6 safe-area-pb-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Performance Monitoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PerformanceMonitoringDashboard 
                    performanceMetrics={performanceMetrics}
                    retryStates={{}}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    OpenAI Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OpenAIPerformanceDashboard />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    RAG Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RAGPerformanceMonitor />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Enhanced Telemetry
                  </CardTitle>
                  <CardDescription>
                    Real-time telemetry data from coach traces
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RealTimeTelemetryDashboard />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🔒 SECURITY MONITORING */}
          <TabsContent value="security" className="space-y-6 mt-6 safe-area-pb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Security Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SecurityMonitor />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 🏥 HEALTH CHECK */}
          <TabsContent value="health" className="space-y-6 mt-6 safe-area-pb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AppHealthCheck />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 🚩 FEATURE FLAGS */}
          <TabsContent value="features" className="space-y-6 mt-6 safe-area-pb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Flag className="w-5 h-5 mr-2" />
                  Feature Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FeatureFlagsManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📡 STREAMING DASHBOARD */}
          <TabsContent value="streaming" className="space-y-6 mt-6 safe-area-pb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Streaming Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StreamingDashboard 
                  metrics={streamingMetrics}
                  isStreaming={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 💬 COACH CONVERSATION MONITOR */}
          <TabsContent value="debug" className="space-y-6 mt-6 safe-area-pb-6">
            <CoachConversationMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;