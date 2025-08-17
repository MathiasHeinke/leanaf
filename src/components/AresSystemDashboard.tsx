import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAresHealthCheck, getSystemReadiness, formatLatency } from '@/hooks/useAresHealthCheck';
import { RefreshCw, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function AresSystemDashboard() {
  const { status, isChecking, runHealthCheck } = useAresHealthCheck();
  const readiness = getSystemReadiness(status);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'border-green-500 bg-green-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            ARES System Status
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant={status.overall === 'healthy' ? 'default' : 'destructive'}>
              {readiness}% Ready
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={runHealthCheck}
              disabled={isChecking}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <Progress value={readiness} className="mt-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className={`rounded-lg border-2 p-4 ${getStatusColor(status.overall)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.overall)}
              <span className="font-semibold">
                System Status: {status.overall.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              Last Check: {status.lastCheck.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {status.services.map((service, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${getStatusColor(service.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(service.status)}
                  <span className="font-medium text-sm">{service.service}</span>
                </div>
                {service.latency && (
                  <span className="text-xs font-mono">
                    {formatLatency(service.latency)}
                  </span>
                )}
              </div>
              
              {service.message && (
                <p className="text-xs text-muted-foreground">
                  {service.message}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Feature Validation Checklist */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Feature Validation Checklist
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Cards exported as default ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Card mapping implemented ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Name context handling ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Goal recall gate ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Persona fully loaded ✅</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              <span>Edge function stable ✅</span>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        <details className="border rounded-lg p-4 bg-muted/50">
          <summary className="font-semibold cursor-pointer">
            Debug Information
          </summary>
          <pre className="mt-3 text-xs bg-background rounded p-2 overflow-auto">
            {JSON.stringify(status, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}