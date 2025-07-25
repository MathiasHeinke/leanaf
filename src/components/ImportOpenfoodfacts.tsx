import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';

export function ImportOpenfoodfacts() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  // Only show for specific email address
  if (!user || user.email !== 'office@mathiasheinke.de') {
    return null;
  }

  const startImport = async () => {
    setIsImporting(true);
    setError(null);
    setResult(null);
    setProgress(0);
    
    const batchSize = 25; // Smaller batches for better German/European coverage
    const totalProducts = 250; // More total products to get better variety
    const batches = Math.ceil(totalProducts / batchSize);
    setTotalBatches(batches);
    
    try {
      console.log('🚀 Starting import of German/European foods (Hähnchen, Rind, etc.)...');
      
      let totalImported = 0;
      let totalSkipped = 0;
      
      for (let batch = 0; batch < batches; batch++) {
        setCurrentBatch(batch + 1);
        const currentBatchSize = batch === batches - 1 ? totalProducts - (batch * batchSize) : batchSize;
        
        const { data, error: importError } = await supabase.functions.invoke('import-openfoodfacts', {
          body: {
            action: 'import',
            limit: currentBatchSize,
            country: 'de',
            batch: batch + 1,
            background: batch > 2 // Use background processing for later batches
          }
        });

        if (importError) {
          console.error(`Batch ${batch + 1} error:`, importError);
          // Continue with next batch instead of failing completely
          continue;
        }

        if (data?.success) {
          totalImported += data.products_imported || 0;
          totalSkipped += data.products_skipped || 0;
          console.log(`Batch ${batch + 1}: ${data.products_imported} imported, ${data.products_skipped} skipped`);
        }
        
        const progressPercent = ((batch + 1) / batches) * 100;
        setProgress(progressPercent);
        
        // Longer delay between batches for German-focused searches
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log('✅ Import completed - Focus: German/European basic foods');
      setResult({
        success: true,
        message: `Import abgeschlossen: ${totalImported} deutsche/europäische Produkte importiert (${totalSkipped} übersprungen)`,
        imported: totalImported,
        skipped: totalSkipped,
        batches: batches,
        focus: 'Deutsche/Europäische Grundprodukte: Hähnchen, Rind, Gemüse, etc.'
      });
    } catch (err) {
      console.error('❌ Import error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsImporting(false);
      setProgress(0);
      setCurrentBatch(0);
      setTotalBatches(0);
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
        <CardDescription>Import deutsche/europäische Grundprodukte: Hähnchen, Rind, Gemüse, etc.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={startImport} 
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? `⏳ Batch ${currentBatch}/${totalBatches}...` : '🥩 Import Deutsche Produkte'}
          </Button>
          <Button 
            onClick={getStats} 
            variant="outline"
            className="flex-1"
            disabled={isImporting}
          >
            📊 Get Stats
          </Button>
        </div>

        {isImporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Batch {currentBatch} of {totalBatches}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

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