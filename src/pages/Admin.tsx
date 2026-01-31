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
  Settings,
  Loader2,
  Users,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { exportSupplementMatrixCSV } from '@/utils/exportMatrixCSV';
import { Link } from 'react-router-dom';
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

import { EmbeddingStatus } from '@/components/EmbeddingStatus';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


export const AdminPage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useSecureAdminAccess('admin_panel');
  const [isExporting, setIsExporting] = useState(false);

  const handleMatrixExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportSupplementMatrixCSV();
      if (!result.success) {
        console.error('Export failed:', result.error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  
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
      {/* 📊 FULL-WIDTH DESKTOP, MOBILE-FIRST LAYOUT */}
      <div className="w-full px-4 py-6 md:px-8 lg:px-12">
        <Tabs defaultValue="production" className="w-full">
          {/* 🎛️ COMPACT TAB NAVIGATION - 4 tabs */}
          <div className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-3 h-auto bg-card border border-border dark:bg-card dark:border-border rounded-lg p-1 shadow-sm">
              <TabsTrigger value="production" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Monitor className="w-4 h-4" />
                <span>Production</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Activity className="w-4 h-4" />
                <span>Performance</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex flex-col items-center justify-center gap-1 h-16 px-2 rounded-md text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Settings className="w-4 h-4" />
                <span>System</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 🔥 PRODUCTION MONITORING - MAIN TAB */}
          <TabsContent value="production" className="space-y-6 mt-6 safe-area-pb-6">
            <ProductionMonitoringDashboard />
          </TabsContent>



          {/* 📊 PERFORMANCE MONITORING */}
          <TabsContent value="performance" className="space-y-6 mt-6 safe-area-pb-6">
            <EnhancedPerformanceDashboard />
          </TabsContent>

          {/* 🔒🏥 SYSTEM & SECURITY - Combined Overview */}
          <TabsContent value="system" className="space-y-6 mt-6 safe-area-pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Coach Personas Editor Link */}
              <Link to="/admin/personas">
                <Card className="bg-background border-border dark:bg-card dark:border-border hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground dark:text-foreground">
                      <Users className="w-5 h-5 mr-2" />
                      Coach Personas Editor
                    </CardTitle>
                    <CardDescription>
                      Verwalte die Coach-Persönlichkeiten: Dials, Floskeln, Beispiel-Antworten
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              {/* Conversation Analytics Link */}
              <Link to="/admin/conversation-analytics">
                <Card className="bg-background border-border dark:bg-card dark:border-border hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground dark:text-foreground">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Conversation Analytics
                    </CardTitle>
                    <CardDescription>
                      Topic-Verteilung, Expert-Level Users, Response-Längen-Trends
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              {/* Matrix Export Card */}
              <Card className="bg-background border-border dark:bg-card dark:border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground dark:text-foreground">
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Relevance Matrix Export
                  </CardTitle>
                  <CardDescription>
                    Alle 111 Wirkstoffe mit ~55 Gewichtungs-Modifikatoren als CSV
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleMatrixExport} 
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Exportiere...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Matrix als CSV exportieren
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Embedding Status & RAG System */}
              <EmbeddingStatus />
              
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