import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Play, 
  Database, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';

interface DebugTest {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  duration?: number;
}

export const EdgeFunctionDebugger: React.FC = () => {
  const [tests, setTests] = useState<DebugTest[]>([
    { name: 'Supabase Client Connection', status: 'pending' },
    { name: 'Edge Function Reachability', status: 'pending' },
    { name: 'Direct HTTP Call Test', status: 'pending' },
    { name: 'Trace DB Write Test', status: 'pending' },
    { name: 'Full Pipeline Test', status: 'pending' }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(-1);
  const [debugMessage, setDebugMessage] = useState('Hallo Lucy, wie gehts?');

  const updateTest = (index: number, updates: Partial<DebugTest>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...updates } : test
    ));
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentTestIndex(0);
    
    // Test 1: Supabase Client Connection
    await runTest(0, async () => {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw new Error(`Supabase client error: ${error.message}`);
      return `✅ Connected. Found ${data?.length || 0} profiles`;
    });

    // Test 2: Edge Function Reachability (with required params)
    await runTest(1, async () => {
      const response = await supabase.functions.invoke('enhanced-coach-non-streaming', {
        body: { 
          userId: 'test-user-001',
          message: 'Test message',
          messageId: `test-${Date.now()}`,
          coachId: 'lucy',
          enableStreaming: false
        }
      });
      
      if (response.error) {
        throw new Error(`Edge Function error: ${response.error.message}`);
      }
      return `✅ Edge Function reached. Response: ${JSON.stringify(response.data)}`;
    });

    // Test 3: Direct HTTP Call (with required params)
    await runTest(2, async () => {
      const url = 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/enhanced-coach-non-streaming';
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I'
        },
        body: JSON.stringify({ 
          userId: 'test-user-002',
          message: 'HTTP test message',
          messageId: `http-test-${Date.now()}`,
          coachId: 'lucy',
          enableStreaming: false
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      return `✅ Direct HTTP call successful. Response: ${JSON.stringify(data)}`;
    });

    // Test 4: Trace DB Write Test
    await runTest(3, async () => {
      const testTrace = {
        trace_id: `test-${Date.now()}`,
        ts: new Date().toISOString(),
        stage: 'test_write',
        data: { test: true, timestamp: Date.now() }
      };
      
      const { error } = await supabase
        .from('coach_traces')
        .insert(testTrace);
      
      if (error) {
        throw new Error(`Trace write error: ${error.message}`);
      }
      
      return `✅ Trace written successfully. ID: ${testTrace.trace_id}`;
    });

    // Test 5: Full Pipeline Test
    await runTest(4, async () => {
      const response = await supabase.functions.invoke('enhanced-coach-non-streaming', {
        body: {
          userId: 'debug-user-pipeline',
          message: debugMessage,
          messageId: `debug-${Date.now()}`,
          coachId: 'lucy', // Using coachId instead of coachPersonality
          conversationHistory: [],
          enableStreaming: false,
          traceId: `debug-${Date.now()}`
        }
      });

      if (response.error) {
        throw new Error(`Pipeline error: ${response.error.message}`);
      }

      // Check if traces were created
      const { data: traces } = await supabase
        .from('coach_traces')
        .select('*')
        .gte('ts', new Date(Date.now() - 10000).toISOString())
        .order('ts', { ascending: false })
        .limit(5);

      return `✅ Pipeline successful. Response: ${JSON.stringify(response.data)}, Recent traces: ${traces?.length || 0}`;
    });

    setIsRunning(false);
    setCurrentTestIndex(-1);
  };

  const runTest = async (index: number, testFn: () => Promise<string>) => {
    setCurrentTestIndex(index);
    updateTest(index, { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'success', 
        result,
        duration
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'error', 
        result: `❌ ${error.message}`,
        duration
      });
    }
  };

  const getStatusIcon = (status: DebugTest['status']) => {
    switch (status) {
      case 'running': return <Activity className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const getStatusBadge = (status: DebugTest['status']) => {
    switch (status) {
      case 'running': return <Badge variant="secondary">Running...</Badge>;
      case 'success': return <Badge variant="default">Success</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const hasErrors = tests.some(test => test.status === 'error');
  const allComplete = tests.every(test => test.status !== 'pending');
  const successCount = tests.filter(test => test.status === 'success').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasErrors ? <WifiOff className="h-5 w-5 text-red-500" /> : <Wifi className="h-5 w-5 text-green-500" />}
          Edge Function Diagnostics
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            onClick={runAllTests}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? 'Running Tests...' : 'Run Full Diagnosis'}
          </Button>
          {allComplete && (
            <Badge variant={hasErrors ? 'destructive' : 'default'}>
              {successCount}/{tests.length} Tests Passed
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Message Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Message:</label>
          <Textarea
            value={debugMessage}
            onChange={(e) => setDebugMessage(e.target.value)}
            placeholder="Enter message to test with..."
            rows={2}
          />
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div 
              key={test.name}
              className={`p-3 border rounded-lg ${
                currentTestIndex === index ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(test.status)}
                  <span className="font-medium">{test.name}</span>
                  {test.duration && (
                    <span className="text-xs text-muted-foreground">
                      ({test.duration}ms)
                    </span>
                  )}
                </div>
                {getStatusBadge(test.status)}
              </div>
              
              {test.result && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <pre className="whitespace-pre-wrap">{test.result}</pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {allComplete && hasErrors && (
          <div className="mt-4 p-3 border border-orange-200 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-orange-800">Recommendations:</span>
            </div>
            <ul className="text-sm text-orange-700 space-y-1">
              {tests[0].status === 'error' && (
                <li>• Check Supabase client configuration and network connectivity</li>
              )}
              {tests[1].status === 'error' && (
                <li>• Edge Function may not be deployed or has syntax errors</li>
              )}
              {tests[2].status === 'error' && (
                <li>• Direct HTTP calls failing - check authentication and CORS</li>
              )}
              {tests[3].status === 'error' && (
                <li>• Database permissions issue - check RLS policies for coach_traces table</li>
              )}
              {tests[4].status === 'error' && (
                <li>• Full pipeline broken - check Edge Function logs and implementation</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};