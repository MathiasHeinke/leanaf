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
import EnhancedPerformanceDashboard from '@/components/EnhancedPerformanceDashboard';
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
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
      </div>

      {/* 📊 SINGLE-COLUMN MOBILE-FIRST LAYOUT */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="production" className="w-full">
          {/* 🎛️ COMPACT TAB NAVIGATION - 4 tabs ohne Scrollen */}
          <div className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-4 h-auto bg-card border border-border dark:bg-card dark:border-border rounded-lg p-1 shadow-sm">
              <TabsTrigger value="production" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Monitor className="w-4 h-4" />
                <span>Production</span>
              </TabsTrigger>
              <TabsTrigger value="trace" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Route className="w-4 h-4" />
                <span>Live Trace</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Activity className="w-4 h-4" />
                <span>Performance</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Shield className="w-4 h-4" />
                <span>System & Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
              {/* OpenAI Performance */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    OpenAI Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OpenAIPerformanceDashboard />
                </CardContent>
              </Card>

              {/* RAG Performance */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <Database className="w-5 h-5 mr-2" />
                    RAG Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RAGPerformanceMonitor />
                </CardContent>
              </Card>

              {/* Real-Time Telemetry */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <Activity className="w-5 h-5 mr-2" />
                    Real-Time Telemetry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RealTimeTelemetryDashboard />
                </CardContent>
              </Card>

              {/* Enhanced Performance */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <Monitor className="w-5 h-5 mr-2" />
                    Enhanced Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedPerformanceDashboard />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 🔒🏥 SYSTEM & SECURITY - Combined Overview */}
          <TabsContent value="system" className="space-y-6 mt-6 safe-area-pb-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Security Monitor */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <Shield className="w-5 h-5 mr-2" />
                    Security Monitor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SecurityMonitor />
                </CardContent>
              </Card>

              {/* System Health */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <Database className="w-5 h-5 mr-2" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AppHealthCheck />
                </CardContent>
              </Card>

              {/* Feature Flags */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <Flag className="w-5 h-5 mr-2" />
                    Feature Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FeatureFlagsManager />
                </CardContent>
              </Card>

              {/* Streaming Analytics */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;