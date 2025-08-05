import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Shield, 
  Activity, 
  Zap, 
  Users, 
  Database,
  Settings,
  BarChart3,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server,
  Globe,
  Eye,
  UserCheck,
  Workflow,
  Brain
} from 'lucide-react';
import { ProductionMonitoringDashboard } from '@/components/ProductionMonitoringDashboard';
import { LiveTraceMonitor } from '@/components/LiveTraceMonitor';
import EnhancedPerformanceDashboard from '@/components/EnhancedPerformanceDashboard';
import { SecurityMonitor } from '@/components/SecurityMonitor';
import { AppHealthCheck } from '@/components/AppHealthCheck';
import { FeatureFlagsManager } from '@/components/FeatureFlagsManager';
import { StreamingDashboard } from '@/components/StreamingDashboard';

export function GehirnPage() {
  const { user } = useAuth();
  const { isAdmin, loading, error } = useSecureAdminAccess();
  
  // Onboarding controls state
  const [onboardingEnabled, setOnboardingEnabled] = useState(() => {
    const saved = localStorage.getItem('onboarding-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [personalOnboarding, setPersonalOnboarding] = useState(() => {
    const saved = localStorage.getItem('personal-onboarding-enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Auto-save function with debouncing
  useEffect(() => {
    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem('onboarding-enabled', JSON.stringify(onboardingEnabled));
      localStorage.setItem('personal-onboarding-enabled', JSON.stringify(personalOnboarding));
      setAutoSaveStatus('saved');
      
      // Reset to idle after showing saved status
      setTimeout(() => setAutoSaveStatus('idle'), 1000);
    }, 500);

    return () => clearTimeout(timer);
  }, [onboardingEnabled, personalOnboarding]);

  const handleResetOnboarding = () => {
    localStorage.removeItem('onboarding-completed');
    localStorage.removeItem('personal-onboarding-completed');
    toast.success('Onboarding reset successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Verifying access...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Access Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <Lock className="h-5 w-5" />
              <span>Access Denied</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Brain className="h-8 w-8 text-primary" />
            <span>Gehirn Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Comprehensive system monitoring and configuration
          </p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Admin Access</span>
        </Badge>
      </div>

      <Tabs defaultValue="production" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="production" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Production</span>
          </TabsTrigger>
          <TabsTrigger value="live-trace" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Live Trace</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          <ProductionMonitoringDashboard />
        </TabsContent>

        <TabsContent value="live-trace" className="space-y-4">
          <LiveTraceMonitor />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            <EnhancedPerformanceDashboard />
            <StreamingDashboard 
              metrics={{
                avgResponseTime: 800,
                streamingSuccess: 98.2,
                totalMessages: 2400,
                p95ResponseTime: 1500
              }}
              isStreaming={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5" />
                  <span>Onboarding Controls</span>
                </CardTitle>
                <CardDescription>
                  Manage onboarding flow for new users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="onboarding-enabled">General Onboarding</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable the main onboarding flow
                    </div>
                  </div>
                  <Switch
                    id="onboarding-enabled"
                    checked={onboardingEnabled}
                    onCheckedChange={setOnboardingEnabled}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="personal-onboarding">Personal Onboarding</Label>
                    <div className="text-sm text-muted-foreground">
                      Enable personalized setup flow
                    </div>
                  </div>
                  <Switch
                    id="personal-onboarding"
                    checked={personalOnboarding}
                    onCheckedChange={setPersonalOnboarding}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">Auto-save Status</span>
                    <div className="text-xs text-muted-foreground">
                      Settings are automatically saved
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {autoSaveStatus === 'saving' && (
                      <>
                        <Clock className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-yellow-600">Saving...</span>
                      </>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">Saved</span>
                      </>
                    )}
                    {autoSaveStatus === 'idle' && (
                      <>
                        <CheckCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Up to date</span>
                      </>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleResetOnboarding}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Reset All Onboarding
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <SecurityMonitor />
              <AppHealthCheck />
              <FeatureFlagsManager />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}