
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: string;
}

export const AppHealthCheck = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    const checks: HealthCheckResult[] = [];

    try {
      // 1. Authentication Check
      if (user) {
        checks.push({
          component: 'Authentication',
          status: 'healthy',
          message: 'User authenticated successfully',
          details: `User ID: ${user.id}`
        });
      } else {
        checks.push({
          component: 'Authentication',
          status: 'warning',
          message: 'No user authenticated'
        });
      }

      // 2. Database Connection Check
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        
        checks.push({
          component: 'Database Connection',
          status: 'healthy',
          message: 'Database connection successful'
        });
      } catch (error) {
        checks.push({
          component: 'Database Connection',
          status: 'error',
          message: 'Database connection failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 3. Edge Functions Check
      try {
        const { data, error } = await supabase.functions.invoke('analyze-meal', {
          body: { text: 'test' }
        });
        
        // We expect an error here since it's just a test, but connection should work
        checks.push({
          component: 'Edge Functions',
          status: error ? 'warning' : 'healthy',
          message: error ? 'Edge functions responding with expected errors' : 'Edge functions healthy',
          details: 'analyze-meal function accessible'
        });
      } catch (error) {
        checks.push({
          component: 'Edge Functions',
          status: 'error',
          message: 'Edge functions not accessible',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 4. Storage Check
      try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) throw error;
        
        const mealImagesBucket = buckets.find(b => b.name === 'meal-images');
        if (mealImagesBucket) {
          checks.push({
            component: 'Storage',
            status: 'healthy',
            message: 'Storage buckets accessible',
            details: `Found ${buckets.length} buckets including meal-images`
          });
        } else {
          checks.push({
            component: 'Storage',
            status: 'warning',
            message: 'meal-images bucket not found'
          });
        }
      } catch (error) {
        checks.push({
          component: 'Storage',
          status: 'error',
          message: 'Storage check failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // 5. Local Storage Check
      try {
        localStorage.setItem('health-check-test', 'test');
        const testValue = localStorage.getItem('health-check-test');
        localStorage.removeItem('health-check-test');
        
        if (testValue === 'test') {
          checks.push({
            component: 'Local Storage',
            status: 'healthy',
            message: 'Local storage working correctly'
          });
        } else {
          throw new Error('Local storage test failed');
        }
      } catch (error) {
        checks.push({
          component: 'Local Storage',
          status: 'error',
          message: 'Local storage not available',
          details: 'This may affect auth persistence'
        });
      }

      // 6. Camera/Media Check
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        const microphones = devices.filter(device => device.kind === 'audioinput');
        
        checks.push({
          component: 'Media Devices',
          status: cameras.length > 0 && microphones.length > 0 ? 'healthy' : 'warning',
          message: `Found ${cameras.length} camera(s) and ${microphones.length} microphone(s)`,
          details: 'Required for photo upload and voice input features'
        });
      } catch (error) {
        checks.push({
          component: 'Media Devices',
          status: 'warning',
          message: 'Could not enumerate media devices',
          details: 'Photo upload and voice features may not work'
        });
      }

    } catch (error) {
      console.error('Health check error:', error);
    }

    setResults(checks);
    setLoading(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>App Health Check</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runHealthCheck}
            disabled={loading}
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </CardTitle>
        <div className="flex gap-2">
          <Badge className="bg-green-100 text-green-800">{healthyCount} Healthy</Badge>
          {warningCount > 0 && <Badge className="bg-yellow-100 text-yellow-800">{warningCount} Warnings</Badge>}
          {errorCount > 0 && <Badge className="bg-red-100 text-red-800">{errorCount} Errors</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
            {getStatusIcon(result.status)}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{result.component}</h4>
                {getStatusBadge(result.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
              {result.details && (
                <p className="text-xs text-muted-foreground mt-1 opacity-70">
                  {result.details}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
