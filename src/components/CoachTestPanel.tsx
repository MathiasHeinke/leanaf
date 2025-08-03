import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Database, MessageSquare } from 'lucide-react';
import { EdgeFunctionDebugger } from './EdgeFunctionDebugger';
import { TraceMonitor } from './TraceMonitor';

export const CoachTestPanel: React.FC = () => {
  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [isTestingTrace, setIsTestingTrace] = useState(false);
  const [engineResult, setEngineResult] = useState<string | null>(null);
  const [traceResult, setTraceResult] = useState<string | null>(null);

  const testCoachEngine = async () => {
    setIsTestingEngine(true);
    setEngineResult(null);
    
    try {
      const response = await supabase.functions.invoke('unified-coach-engine', {
        body: {
          userId: 'test-user',
          message: 'Hallo, wie geht es dir?',
          messageId: `test-${Date.now()}`,
          coachPersonality: 'lucy',
          conversationHistory: [],
          enableStreaming: false
        }
      });

      if (response.error) {
        setEngineResult(`❌ Error: ${response.error.message}`);
        toast.error('Coach Engine Test Failed');
      } else {
        setEngineResult(`✅ Success: ${JSON.stringify(response.data, null, 2)}`);
        toast.success('Coach Engine Test Passed');
      }
    } catch (error: any) {
      setEngineResult(`❌ Exception: ${error.message}`);
      toast.error('Coach Engine Test Failed');
    } finally {
      setIsTestingEngine(false);
    }
  };

  const testTraceSystem = async () => {
    setIsTestingTrace(true);
    setTraceResult(null);

    try {
      // First check if we can read traces
      const { data: traces, error: readError } = await supabase
        .from('coach_traces')
        .select('*')
        .limit(5)
        .order('ts', { ascending: false });

      if (readError) {
        setTraceResult(`❌ Read Error: ${readError.message}`);
        toast.error('Trace System Test Failed');
        return;
      }

      // Now test the engine which should create traces
      await testCoachEngine();
      
      // Check if new traces were created
      const { data: newTraces, error: newError } = await supabase
        .from('coach_traces')
        .select('*')
        .limit(1)
        .order('ts', { ascending: false });

      if (newError) {
        setTraceResult(`❌ New Trace Error: ${newError.message}`);
        toast.error('Trace System Test Failed');
      } else {
        setTraceResult(`✅ Success: Found ${traces?.length || 0} existing traces, latest: ${newTraces?.[0]?.stage || 'none'}`);
        toast.success('Trace System Test Passed');
      }
    } catch (error: any) {
      setTraceResult(`❌ Exception: ${error.message}`);
      toast.error('Trace System Test Failed');
    } finally {
      setIsTestingTrace(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Advanced Diagnostics */}
      <EdgeFunctionDebugger />
      
      {/* Live Trace Monitoring */}
      <TraceMonitor />
      
      {/* Simple Test Panel */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Quick Coach Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coach Engine Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Coach Engine Test
              </h3>
              <Button 
                onClick={testCoachEngine}
                disabled={isTestingEngine}
                size="sm"
              >
                {isTestingEngine ? 'Testing...' : 'Test Engine'}
              </Button>
            </div>
            
            {engineResult && (
              <div className="p-3 bg-muted rounded-md">
                <pre className="text-xs whitespace-pre-wrap">{engineResult}</pre>
              </div>
            )}
          </div>

          {/* Trace System Test */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Trace System Test
              </h3>
              <Button 
                onClick={testTraceSystem}
                disabled={isTestingTrace}
                size="sm"
              >
                {isTestingTrace ? 'Testing...' : 'Test Traces'}
              </Button>
            </div>
            
            {traceResult && (
              <div className="p-3 bg-muted rounded-md">
                <pre className="text-xs whitespace-pre-wrap">{traceResult}</pre>
              </div>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex gap-2 pt-3 border-t">
            <Badge variant={engineResult?.includes('✅') ? 'default' : 'destructive'}>
              Engine: {engineResult?.includes('✅') ? 'OK' : 'ERROR'}
            </Badge>
            <Badge variant={traceResult?.includes('✅') ? 'default' : 'destructive'}>
              Traces: {traceResult?.includes('✅') ? 'OK' : 'ERROR'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};