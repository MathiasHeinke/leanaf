// Temporäre Admin-Seite für Supplement Database Seeding
// Route: /admin/seed-supplements

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { COMPLETE_PRODUCT_SEED, COMPLETE_SEED_STATS } from '@/data/seeds';
import { Database, Loader2, Play, CheckCircle2, XCircle, RefreshCw, Download, Sparkles } from 'lucide-react';
import { exportAllProductsToCSV } from '@/utils/exportProductsCSV';
import { toast } from 'sonner';

interface EnrichResult {
  success: boolean;
  task: string;
  link_products?: {
    total_unlinked: number;
    linked: number;
    skipped: number;
    sample_links: Array<{product: string, supplement: string}>;
  };
  sync_interactions?: {
    synergies_updated: number;
    blockers_updated: number;
    sample_updates: Array<{name: string, synergies: string[], blockers: string[]}>;
  };
  cleanup?: {
    empty_brands_found: number;
    brands_deleted: number;
    deleted_brands: string[];
  };
  database_stats?: {
    total_products: number;
    linked_products: number;
    link_rate: number;
    total_supplements: number;
    supplements_with_synergies: number;
    supplements_with_blockers: number;
    total_brands: number;
  };
}
interface SeedResult {
  success: boolean;
  results: {
    batch_name: string;
    products_added: number;
    products_skipped: number;
    products_errors: string[];
  };
  database_totals: {
    products: number;
    supplements: number;
    brands: number;
  };
}

export default function AdminSeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<{ products: number; supplements: number; brands: number } | null>(null);
  const [results, setResults] = useState<{ added: number; skipped: number; errors: string[] } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichStats, setEnrichStats] = useState<EnrichResult['database_stats'] | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const checkStatus = async () => {
    addLog('Checking database status...');
    try {
      const { data, error } = await supabase.functions.invoke<SeedResult>('seed-products', {
        body: {},
      });
      
      if (error) throw error;
      if (data?.database_totals) {
        setDbStatus(data.database_totals);
        addLog(`✅ DB Status: ${data.database_totals.products} products, ${data.database_totals.supplements} supplements, ${data.database_totals.brands} brands`);
      }
    } catch (err) {
      addLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  };

  const runSeeding = async () => {
    setIsSeeding(true);
    setResults(null);
    setProgress(0);
    
    const products = COMPLETE_PRODUCT_SEED;
    const batchSize = 25;
    const batches = Math.ceil(products.length / batchSize);
    
    setTotalBatches(batches);
    addLog(`🚀 Starting seed: ${products.length} products in ${batches} batches`);

    let totalAdded = 0;
    let totalSkipped = 0;
    const totalErrors: string[] = [];

    for (let i = 0; i < batches; i++) {
      setCurrentBatch(i + 1);
      setProgress(Math.round(((i + 1) / batches) * 100));
      
      const start = i * batchSize;
      const end = Math.min(start + batchSize, products.length);
      const batch = products.slice(start, end);

      try {
        const { data, error } = await supabase.functions.invoke<SeedResult>('seed-products', {
          body: { products: batch, batch_name: `batch-${i + 1}` },
        });

        if (error) {
          addLog(`❌ Batch ${i + 1}: ${error.message}`);
          totalErrors.push(`Batch ${i + 1}: ${error.message}`);
          continue;
        }

        if (data?.results) {
          totalAdded += data.results.products_added;
          totalSkipped += data.results.products_skipped;
          totalErrors.push(...data.results.products_errors);
          
          if (data.results.products_added > 0) {
            addLog(`✅ Batch ${i + 1}: +${data.results.products_added} added`);
          } else if (data.results.products_skipped > 0) {
            addLog(`⏭️ Batch ${i + 1}: ${data.results.products_skipped} skipped (duplicates)`);
          }
          
          setDbStatus(data.database_totals);
        }
      } catch (err) {
        addLog(`❌ Batch ${i + 1} error: ${err instanceof Error ? err.message : 'Unknown'}`);
        totalErrors.push(`Batch ${i + 1}: Exception`);
      }

      // Pause zwischen Batches
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    setResults({ added: totalAdded, skipped: totalSkipped, errors: totalErrors });
    addLog(`🎉 Complete! Added: ${totalAdded}, Skipped: ${totalSkipped}, Errors: ${totalErrors.length}`);
    setIsSeeding(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Supplement Database Seeding
            </CardTitle>
            <CardDescription>
              Admin-Tool zum Befüllen der Supplement-Produktdatenbank
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{COMPLETE_SEED_STATS.total_products}</div>
                  <div className="text-xs text-muted-foreground">Seed-Produkte</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{dbStatus?.products ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">In DB</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{dbStatus?.supplements ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">Supplements</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{dbStatus?.brands ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">Brands</div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-4 flex-wrap">
              <Button onClick={checkStatus} variant="outline" disabled={isSeeding}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Status prüfen
              </Button>
              <Button onClick={runSeeding} disabled={isSeeding}>
                {isSeeding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Seeding... ({currentBatch}/{totalBatches})
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Seeding starten
                  </>
                )}
              </Button>
              <Button 
                onClick={async () => {
                  setIsExporting(true);
                  addLog('📦 Starte CSV-Export aller Produkte...');
                  const result = await exportAllProductsToCSV();
                  if (result.success) {
                    addLog(`✅ Export abgeschlossen: ${result.productCount} Produkte exportiert`);
                    toast.success(`${result.productCount} Produkte als CSV exportiert`);
                  } else {
                    addLog(`❌ Export fehlgeschlagen: ${result.error}`);
                    toast.error(`Export fehlgeschlagen: ${result.error}`);
                  }
                  setIsExporting(false);
                }} 
                variant="secondary" 
                disabled={isSeeding || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportiere...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    CSV Export
                  </>
                )}
              </Button>
              <Button 
                onClick={async () => {
                  setIsEnriching(true);
                  addLog('✨ Starte Daten-Anreicherung (alle Tasks)...');
                  try {
                    const { data, error } = await supabase.functions.invoke<EnrichResult>('enrich-supplement-data', {
                      body: { task: 'all' },
                    });
                    
                    if (error) throw error;
                    
                    if (data?.success) {
                      // Log results
                      if (data.link_products) {
                        addLog(`🔗 Produkt-Linking: ${data.link_products.linked} verknüpft, ${data.link_products.skipped} übersprungen`);
                      }
                      if (data.sync_interactions) {
                        addLog(`🔄 Synergies: ${data.sync_interactions.synergies_updated} aktualisiert`);
                        addLog(`🔄 Blockers: ${data.sync_interactions.blockers_updated} aktualisiert`);
                      }
                      if (data.cleanup) {
                        addLog(`🧹 Cleanup: ${data.cleanup.brands_deleted} leere Brands gelöscht`);
                      }
                      if (data.database_stats) {
                        setEnrichStats(data.database_stats);
                        addLog(`📊 Link-Rate: ${data.database_stats.link_rate}% (${data.database_stats.linked_products}/${data.database_stats.total_products})`);
                      }
                      toast.success('Daten-Anreicherung abgeschlossen!');
                    } else {
                      throw new Error('Anreicherung fehlgeschlagen');
                    }
                  } catch (err) {
                    addLog(`❌ Enrichment Error: ${err instanceof Error ? err.message : 'Unknown'}`);
                    toast.error(`Anreicherung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
                  }
                  setIsEnriching(false);
                }} 
                variant="default"
                className="bg-primary"
                disabled={isSeeding || isExporting || isEnriching}
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Anreichern...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Daten anreichern
                  </>
                )}
              </Button>
            </div>

            {/* Enrichment Stats */}
            {enrichStats && (
              <Card className="border-primary/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Anreicherungs-Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xl font-bold text-primary">{enrichStats.link_rate}%</div>
                      <div className="text-xs text-muted-foreground">Produkt-Verlinkung</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{enrichStats.linked_products}/{enrichStats.total_products}</div>
                      <div className="text-xs text-muted-foreground">Verknüpfte Produkte</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{enrichStats.supplements_with_synergies}</div>
                      <div className="text-xs text-muted-foreground">Synergies</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{enrichStats.supplements_with_blockers}</div>
                      <div className="text-xs text-muted-foreground">Blockers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress */}
            {isSeeding && (
              <div className="space-y-2">
                <Progress value={progress} />
                <div className="text-sm text-muted-foreground text-center">
                  Batch {currentBatch} von {totalBatches} ({progress}%)
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="flex gap-4 flex-wrap">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {results.added} hinzugefügt
                </Badge>
                <Badge variant="secondary">
                  ⏭️ {results.skipped} übersprungen
                </Badge>
                {results.errors.length > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {results.errors.length} Fehler
                  </Badge>
                )}
              </div>
            )}

            {/* Log Output */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Log Output</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 rounded border bg-muted/50 p-3 font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground">Klicke "Status prüfen" um zu starten...</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="py-0.5">{log}</div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
