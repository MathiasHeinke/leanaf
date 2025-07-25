import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ImportOpenfoodfacts() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const startImport = async () => {
    setIsImporting(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('🚀 Starting import of German foods...');
      
      const { data, error: importError } = await supabase.functions.invoke('import-openfoodfacts', {
        body: {
          action: 'import',
          limit: 1,
          country: 'de'
        }
      });

      if (importError) {
        throw new Error(`Import failed: ${importError.message}`);
      }

      console.log('✅ Import completed:', data);
      setResult(data);
    } catch (err) {
      console.error('❌ Import error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  const getStats = async () => {
    try {
      const { data, error: statsError } = await supabase.functions.invoke('import-openfoodfacts', {
        body: {
          action: 'stats'
        }
      });

      if (statsError) {
        throw new Error(`Stats failed: ${statsError.message}`);
      }

      console.log('📊 Current stats:', data);
      setResult(data);
    } catch (err) {
      console.error('❌ Stats error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>🍎 Food Database Import</CardTitle>
        <CardDescription>Import German foods from Open Food Facts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={startImport} 
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? '⏳ Importing...' : '🚀 Start Import'}
          </Button>
          <Button 
            onClick={getStats} 
            variant="outline"
            className="flex-1"
          >
            📊 Get Stats
          </Button>
        </div>

        {error && (
          <div className="text-red-600 bg-red-50 p-2 rounded text-sm">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="text-green-600 bg-green-50 p-2 rounded text-sm">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}