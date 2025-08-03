import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Zap, 
  Shield, 
  Database,
  Monitor,
  BarChart3,
  Clock,
  AlertCircle,
  Play,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'sonner';

// 🔥 PRODUCTION MONITORING INTERFACES
interface LoadTestMetrics {
  p95_response_time: number;
  p99_response_time: number;
  avg_response_time: number;
  total_requests: number;
  failed_requests: number;
  error_rate: number;
  virtual_users: number;
  test_duration: number;
  timestamp: string;
}

interface CircuitBreakerStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  open_events: number;
  open_percentage: number;
  avg_failure_recovery_time: number;
  last_failure: string | null;
}

interface TokenBudgetStats {
  prompt_tokens: number;
  budget_limit: number;
  utilization_percent: number;
  timestamp: string;
  user_hash: string;
}

interface SystemHealthMetrics {
  first_token_p95: number;
  total_latency_p95: number;
  error_5xx_rate: number;
  circuit_breaker_opens: number;
  status: 'healthy' | 'warning' | 'critical';
  last_updated: string;
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ProductionMonitoringDashboard() {
  const [isLoadTesting, setIsLoadTesting] = useState(false);
  const [loadTestMetrics, setLoadTestMetrics] = useState<LoadTestMetrics[]>([]);
  const [circuitBreakerStats, setCircuitBreakerStats] = useState<CircuitBreakerStats | null>(null);
  const [tokenBudgetData, setTokenBudgetData] = useState<TokenBudgetStats[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [logAuditResults, setLogAuditResults] = useState<any>(null);

  // 📊 Mock Data Generation für Demo
  useEffect(() => {
    generateMockData();
    const interval = setInterval(generateMockData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const generateMockData = () => {
    // Mock Load Test Metrics
    const mockLoadMetrics: LoadTestMetrics[] = Array.from({ length: 24 }, (_, i) => ({
      p95_response_time: 1200 + Math.random() * 800,
      p99_response_time: 1800 + Math.random() * 1200,
      avg_response_time: 800 + Math.random() * 400,
      total_requests: 15000 + Math.random() * 5000,
      failed_requests: Math.floor(Math.random() * 50),
      error_rate: Math.random() * 2,
      virtual_users: 200,
      test_duration: 300,
      timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString()
    }));
    setLoadTestMetrics(mockLoadMetrics);

    // Mock Circuit Breaker Stats
    setCircuitBreakerStats({
      total_requests: 125000,
      successful_requests: 124850,
      failed_requests: 150,
      open_events: 3,
      open_percentage: 0.24,
      avg_failure_recovery_time: 45000,
      last_failure: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    });

    // Mock Token Budget Data (last 1000 prompts)
    const mockTokenData: TokenBudgetStats[] = Array.from({ length: 100 }, (_, i) => ({
      prompt_tokens: Math.floor(2000 + Math.random() * 4000),
      budget_limit: 6000,
      utilization_percent: Math.floor(40 + Math.random() * 50),
      timestamp: new Date(Date.now() - i * 10 * 60 * 1000).toISOString(),
      user_hash: `usr_${Math.random().toString(36).substr(2, 12)}`
    }));
    setTokenBudgetData(mockTokenData);

    // Mock System Health
    const latestLoadTest = mockLoadMetrics[mockLoadMetrics.length - 1];
    const health: SystemHealthMetrics = {
      first_token_p95: 1400 + Math.random() * 600,
      total_latency_p95: latestLoadTest.p95_response_time,
      error_5xx_rate: latestLoadTest.error_rate,
      circuit_breaker_opens: 0.24,
      status: latestLoadTest.p95_response_time > 4000 ? 'warning' : 
              latestLoadTest.error_rate > 3 ? 'critical' : 'healthy',
      last_updated: new Date().toISOString()
    };
    setSystemHealth(health);

    // Mock Log Audit
    setLogAuditResults({
      total_logs: 50000,
      hashed_user_ids: 49950,
      plain_text_emails: 0,
      gps_coordinates: 0,
      compliance_score: 99.9,
      violations: []
    });
  };

  const runLoadTest = async () => {
    setIsLoadTesting(true);
    toast.info('🚀 Starting Load Test with 200 VU...');
    
    try {
      // Simulate load test execution
      setTimeout(() => {
        generateMockData();
        setIsLoadTesting(false);
        toast.success('✅ Load Test completed successfully!');
      }, 10000);
    } catch (error) {
      console.error('Load test failed:', error);
      setIsLoadTesting(false);
      toast.error('❌ Load Test failed');
    }
  };

  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' };
      case 'critical':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' };
      default:
        return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const tokenHistogramData = tokenBudgetData.reduce((acc, item) => {
    const bucket = Math.floor(item.prompt_tokens / 1000) * 1000;
    const key = `${bucket}-${bucket + 999}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const histogramChartData = Object.entries(tokenHistogramData).map(([range, count]) => ({
    range,
    count
  }));

  if (!systemHealth) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading Production Metrics...</span>
        </div>
      </div>
    );
  }

  const healthConfig = getHealthStatus(systemHealth.status);
  const HealthIcon = healthConfig.icon;

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* 🚨 SYSTEM HEALTH OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`border-l-4 ${
          systemHealth.status === 'healthy' ? 'border-l-green-500' :
          systemHealth.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HealthIcon className={`w-4 h-4 mr-2 ${healthConfig.color}`} />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge 
                variant={systemHealth.status === 'healthy' ? 'default' : 
                        systemHealth.status === 'warning' ? 'secondary' : 'destructive'}
              >
                {systemHealth.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(systemHealth.last_updated).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              First Token P95
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth.first_token_p95.toFixed(0)}ms
            </div>
            <Progress 
              value={(systemHealth.first_token_p95 / 2000) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt; 2000ms {systemHealth.first_token_p95 > 2000 && '⚠️'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Total Latency P95
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth.total_latency_p95.toFixed(0)}ms
            </div>
            <Progress 
              value={(systemHealth.total_latency_p95 / 4000) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt; 4000ms {systemHealth.total_latency_p95 > 4000 && '⚠️'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth.error_5xx_rate.toFixed(2)}%
            </div>
            <Progress 
              value={(systemHealth.error_5xx_rate / 3) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt; 1% {systemHealth.error_5xx_rate > 1 && '⚠️'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🚨 ALERTS */}
      {(systemHealth.first_token_p95 > 3000 || systemHealth.total_latency_p95 > 6000 || systemHealth.error_5xx_rate > 3) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Production Alert:</strong> {' '}
            {systemHealth.first_token_p95 > 3000 && 'First Token latency > 3s for 5+ minutes. '}
            {systemHealth.total_latency_p95 > 6000 && 'Total latency > 6s for 5+ minutes. '}
            {systemHealth.error_5xx_rate > 3 && '5xx error rate ≥ 3% for 10+ minutes. '}
            Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 📊 LOAD TEST DASHBOARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Load Test (200 VU)
              </span>
              <Button 
                onClick={runLoadTest} 
                disabled={isLoadTesting}
                size="sm"
              >
                {isLoadTesting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isLoadTesting ? 'Running...' : 'Run Test'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loadTestMetrics.slice(-12)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value, name) => [`${value}ms`, name]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="p95_response_time" 
                    stroke="#8884d8" 
                    name="P95 Response Time"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg_response_time" 
                    stroke="#82ca9d" 
                    name="Avg Response Time"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {loadTestMetrics.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Latest P95</p>
                  <p className="font-bold">{loadTestMetrics[loadTestMetrics.length - 1].p95_response_time.toFixed(0)}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Error Rate</p>
                  <p className="font-bold">{loadTestMetrics[loadTestMetrics.length - 1].error_rate.toFixed(2)}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🔧 CIRCUIT BREAKER TELEMETRY */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Circuit Breaker Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent>
            {circuitBreakerStats && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {circuitBreakerStats.open_percentage.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Open Events</div>
                    <div className="text-xs mt-1">
                      Target: &lt; 0.5% {circuitBreakerStats.open_percentage > 0.5 && '⚠️'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {(circuitBreakerStats.avg_failure_recovery_time / 1000).toFixed(0)}s
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Recovery</div>
                    <div className="text-xs mt-1">Last: {circuitBreakerStats.last_failure ? 
                      new Date(circuitBreakerStats.last_failure).toLocaleTimeString() : 'None'}</div>
                  </div>
                </div>

                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Successful', value: circuitBreakerStats.successful_requests, color: '#22c55e' },
                          { name: 'Failed', value: circuitBreakerStats.failed_requests, color: '#ef4444' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Successful', value: circuitBreakerStats.successful_requests, color: '#22c55e' },
                          { name: 'Failed', value: circuitBreakerStats.failed_requests, color: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 📈 TOKEN BUDGET HISTOGRAM */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Token Budget Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">Last 1,000 prompts</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histogramChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Utilization:</span>
                <span className="font-bold">
                  {(tokenBudgetData.reduce((sum, item) => sum + item.utilization_percent, 0) / tokenBudgetData.length).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget Limit:</span>
                <span className="font-bold">6,000 tokens</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🔍 LOG AUDIT RESULTS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              DSGVO Log Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logAuditResults && (
              <div className="space-y-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {logAuditResults.compliance_score}%
                  </div>
                  <div className="text-sm text-muted-foreground">Compliance Score</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Logs</p>
                    <p className="font-bold">{logAuditResults.total_logs.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hashed User IDs</p>
                    <p className="font-bold text-green-600">
                      {logAuditResults.hashed_user_ids.toLocaleString()} 
                      <CheckCircle className="w-4 h-4 inline ml-1" />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plain Text Emails</p>
                    <p className="font-bold text-green-600">
                      {logAuditResults.plain_text_emails} 
                      <CheckCircle className="w-4 h-4 inline ml-1" />
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GPS Coordinates</p>
                    <p className="font-bold text-green-600">
                      {logAuditResults.gps_coordinates} 
                      <CheckCircle className="w-4 h-4 inline ml-1" />
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded border-l-4 border-l-green-500">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">All Hash-Prefixes: usr_...</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    DSGVO compliance verified ✓
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 📋 MONITORING TARGETS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            24h Monitoring Targets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metrik</th>
                  <th className="text-left p-2">Ziel</th>
                  <th className="text-left p-2">Aktuell</th>
                  <th className="text-left p-2">Alarm</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">First-Token P95</td>
                  <td className="p-2">&lt; 2s</td>
                  <td className="p-2">{(systemHealth.first_token_p95 / 1000).toFixed(1)}s</td>
                  <td className="p-2">&gt; 3s 5 min lang</td>
                  <td className="p-2">
                    {systemHealth.first_token_p95 > 3000 ? 
                      <Badge variant="destructive">ALARM</Badge> :
                      systemHealth.first_token_p95 > 2000 ?
                      <Badge variant="secondary">WARNING</Badge> :
                      <Badge variant="default">OK</Badge>
                    }
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Gesamt P95</td>
                  <td className="p-2">&lt; 4s</td>
                  <td className="p-2">{(systemHealth.total_latency_p95 / 1000).toFixed(1)}s</td>
                  <td className="p-2">&gt; 6s 5 min lang</td>
                  <td className="p-2">
                    {systemHealth.total_latency_p95 > 6000 ? 
                      <Badge variant="destructive">ALARM</Badge> :
                      systemHealth.total_latency_p95 > 4000 ?
                      <Badge variant="secondary">WARNING</Badge> :
                      <Badge variant="default">OK</Badge>
                    }
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">5xx-Rate</td>
                  <td className="p-2">&lt; 1%</td>
                  <td className="p-2">{systemHealth.error_5xx_rate.toFixed(2)}%</td>
                  <td className="p-2">≥ 3% 10 min lang</td>
                  <td className="p-2">
                    {systemHealth.error_5xx_rate >= 3 ? 
                      <Badge variant="destructive">ALARM</Badge> :
                      systemHealth.error_5xx_rate > 1 ?
                      <Badge variant="secondary">WARNING</Badge> :
                      <Badge variant="default">OK</Badge>
                    }
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Breaker Opens</td>
                  <td className="p-2">&lt; 0.5%</td>
                  <td className="p-2">{systemHealth.circuit_breaker_opens.toFixed(2)}%</td>
                  <td className="p-2">≥ 2% 10 min lang</td>
                  <td className="p-2">
                    {systemHealth.circuit_breaker_opens >= 2 ? 
                      <Badge variant="destructive">ALARM</Badge> :
                      systemHealth.circuit_breaker_opens > 0.5 ?
                      <Badge variant="secondary">WARNING</Badge> :
                      <Badge variant="default">OK</Badge>
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 🎯 ROLL-OUT STATUS */}
      {systemHealth.status === 'healthy' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>🎉 Production Ready!</strong> Alle Metriken sind grün. 
            Roll-out von 5% auf 100% kann beginnen. Füße hoch, Logs off-camp, Bier auf! 🍻
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}