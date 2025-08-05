import React, { useState, useEffect } from 'react';
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
  Route,
  Bug,
  Settings,
  Check,
  Loader2
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

import { EmbeddingStatus } from '@/components/EmbeddingStatus';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOnboardingState } from '@/hooks/useOnboardingState';

export const AdminPage = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useSecureAdminAccess('admin_panel');
  const { forceShowOnboarding, resetOnboarding } = useOnboardingState();
  const [onboardingEnabled, setOnboardingEnabled] = useState(false);
  const [onboardingGloballyDisabled, setOnboardingGloballyDisabled] = useState(false);
  const [adminPersonalOnboarding, setAdminPersonalOnboarding] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  // Load admin settings from localStorage
  useEffect(() => {
    const savedOnboardingEnabled = localStorage.getItem('admin_onboarding_enabled');
    const savedGloballyDisabled = localStorage.getItem('admin_onboarding_globally_disabled');
    const savedPersonalOnboarding = localStorage.getItem(`admin_personal_onboarding_${user?.id}`);
    
    if (savedOnboardingEnabled) {
      setOnboardingEnabled(JSON.parse(savedOnboardingEnabled));
    }
    if (savedGloballyDisabled) {
      setOnboardingGloballyDisabled(JSON.parse(savedGloballyDisabled));
    }
    if (savedPersonalOnboarding) {
      setAdminPersonalOnboarding(JSON.parse(savedPersonalOnboarding));
    }
  }, [user?.id]);

  // Auto-save function
  const autoSave = async () => {
    if (!user || autoSaving) return;
    
    setAutoSaving(true);
    try {
      localStorage.setItem('admin_onboarding_enabled', JSON.stringify(onboardingEnabled));
      localStorage.setItem('admin_onboarding_globally_disabled', JSON.stringify(onboardingGloballyDisabled));
      localStorage.setItem(`admin_personal_onboarding_${user.id}`, JSON.stringify(adminPersonalOnboarding));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  // Manual save function
  const handleManualSave = async () => {
    if (!user || manualSaving || autoSaving) return;
    
    setManualSaving(true);
    try {
      localStorage.setItem('admin_onboarding_enabled', JSON.stringify(onboardingEnabled));
      localStorage.setItem('admin_onboarding_globally_disabled', JSON.stringify(onboardingGloballyDisabled));
      localStorage.setItem(`admin_personal_onboarding_${user.id}`, JSON.stringify(adminPersonalOnboarding));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setManualSaving(false);
    }
  };

  // Auto-save when onboarding settings change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user) {
        autoSave();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [onboardingEnabled, onboardingGloballyDisabled, adminPersonalOnboarding, user]);

  // Save admin settings handlers (auto-save will handle persistence)
  const handleOnboardingEnabledChange = (checked: boolean) => {
    setOnboardingEnabled(checked);
    if (checked) {
      forceShowOnboarding();
    }
  };

  const handleGloballyDisabledChange = (checked: boolean) => {
    setOnboardingGloballyDisabled(checked);
  };

  const handlePersonalOnboardingChange = (checked: boolean) => {
    setAdminPersonalOnboarding(checked);
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
      {/* 📊 SINGLE-COLUMN MOBILE-FIRST LAYOUT */}
      <div className="container mx-auto px-4 py-6">
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
            <div className="grid grid-cols-1 gap-6">
              {/* 🎯 ONBOARDING ADMIN CONTROLS */}
              <Card className="bg-background border-border">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground">
                    <Settings className="w-5 h-5 mr-2" />
                    Onboarding Controls
                  </CardTitle>
                  <CardDescription>
                    Admin-Steuerung für das Onboarding-System
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="onboarding-toggle" className="text-sm font-medium">
                        Onboarding für alle Nutzer aktivieren
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Zeigt das Onboarding für alle Nutzer an, unabhängig vom Status
                      </p>
                    </div>
                    <Switch
                      id="onboarding-toggle"
                      checked={onboardingEnabled}
                      onCheckedChange={handleOnboardingEnabledChange}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="onboarding-disable-toggle" className="text-sm font-medium">
                        Onboarding deaktivieren/aktivieren
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Deaktiviert das Onboarding komplett für alle neuen Nutzer
                      </p>
                    </div>
                    <Switch
                      id="onboarding-disable-toggle"
                      checked={onboardingGloballyDisabled}
                      onCheckedChange={handleGloballyDisabledChange}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="admin-personal-onboarding-toggle" className="text-sm font-medium">
                        Admin Onboarding persönlich ein/aus
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Zeigt/versteckt das Onboarding nur für Ihren Admin-Account
                      </p>
                    </div>
                    <Switch
                      id="admin-personal-onboarding-toggle"
                      checked={adminPersonalOnboarding}
                      onCheckedChange={handlePersonalOnboardingChange}
                    />
                  </div>

                  {/* Save status and actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      {(autoSaving || manualSaving) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {manualSaving ? 'Speichere...' : 'Speichere automatisch...'}
                          </span>
                        </>
                      ) : lastSaved ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">
                            Gespeichert um {lastSaved.toLocaleTimeString()}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Änderungen werden automatisch gespeichert</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleManualSave}
                        disabled={manualSaving || autoSaving}
                        className="flex items-center gap-2"
                      >
                        {manualSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Speichern
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetOnboarding}
                        className="flex items-center gap-2"
                      >
                        🔄 Onboarding zurücksetzen
                      </Button>
                    </div>
                  </div>
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