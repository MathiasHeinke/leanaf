// Admin-Seite für CSV-Import von angereicherten Produktdaten
// Route: /admin/import-csv

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { FileUp, Loader2, Play, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  success: boolean;
  results?: {
    batch_name: string;
    products_updated: number;
    products_inserted: number;
    products_errors: string[];
    total_errors: number;
  };
  database_totals?: {
    products: number;
  };
  error?: string;
}

// 37 Duplikate zum Löschen nach Import
const DUPLICATES_TO_DELETE = [
  // Biogena (3)
  { brand_slug: 'biogena', product_name: 'Ashwagandha KSM-66 500mg' },
  { brand_slug: 'biogena', product_name: 'Berberin 500mg' },
  { brand_slug: 'biogena', product_name: 'Colostrum Gold 60 Kapseln' },
  // Nature Love (2)
  { brand_slug: 'nature-love', product_name: 'Omega-3 vegan aus Algenöl' },
  { brand_slug: 'nature-love', product_name: 'Vitamin D3 + K2 Tropfen' },
  // Doppelherz (4)
  { brand_slug: 'doppelherz', product_name: 'Omega-3 1000mg' },
  { brand_slug: 'doppelherz', product_name: 'Omega-3 Seefischöl 1000' },
  { brand_slug: 'doppelherz', product_name: 'Vitamin D3 2000 I.E.' },
  { brand_slug: 'doppelherz', product_name: 'Vitamin D3 2000 IE 60 Tabs' },
  // Orthomol (11)
  { brand_slug: 'orthomol', product_name: 'Orthomol Immun 30 Portions' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Vital f 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Vital m 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Sport 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Cardio 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Mental 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Tendo 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Arthro plus 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Osteo 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Femin 30 Beutel' },
  { brand_slug: 'orthomol', product_name: 'Orthomol Hair intense 30 Beutel' },
  // Sunday Natural (3)
  { brand_slug: 'sunday-natural', product_name: 'Omega-3 Algenöl' },
  { brand_slug: 'sunday-natural', product_name: 'Omega-3 Algae Oil EPA+DHA' },
  { brand_slug: 'sunday-natural', product_name: 'Vitamin D3+K2 Tropfen' },
  // Naturtreu (3)
  { brand_slug: 'naturtreu', product_name: 'Darmfreund Probiotika' },
  { brand_slug: 'naturtreu', product_name: 'Darmfreund Probiotika Kapseln' },
  { brand_slug: 'naturtreu', product_name: 'Ruhepol Magnesium' },
  // ProFuel (5)
  { brand_slug: 'profuel', product_name: 'Omega-3 vegan' },
  { brand_slug: 'profuel', product_name: 'Omega-3 Algenöl' },
  { brand_slug: 'profuel', product_name: 'Vitamin D3 + K2' },
  { brand_slug: 'profuel', product_name: 'Vitamin D3 5000 IE' },
  { brand_slug: 'profuel', product_name: 'Vitamin D3+K2 Tropfen' },
  // MoleQlar (4)
  { brand_slug: 'moleqlar', product_name: 'NMN Pur 250mg' },
  { brand_slug: 'moleqlar', product_name: 'NMN 500mg' },
  { brand_slug: 'moleqlar', product_name: 'Spermidin' },
  { brand_slug: 'moleqlar', product_name: 'Spermidin Plus' },
  // ESN (2)
  { brand_slug: 'esn', product_name: 'Omega-3 Ultra' },
  { brand_slug: 'esn', product_name: 'Ultrapure Creatine Monohydrat' },
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const products: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const product: Record<string, string> = {};
    
    headers.forEach((header, idx) => {
      product[header] = values[idx] || '';
    });
    
    if (product.id || product.product_name) {
      products.push(product);
    }
  }
  
  return products;
}

export default function AdminImportCSVPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{ updated: number; inserted: number; errors: number } | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[] | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadCSV = async () => {
    addLog('Loading CSV from /data/lovable_FINAL_v3_COMPLETE.csv...');
    try {
      const response = await fetch('/data/lovable_FINAL_v3_COMPLETE.csv');
      if (!response.ok) throw new Error('CSV not found');
      
      const csvText = await response.text();
      const products = parseCSV(csvText);
      
      setCsvData(products);
      addLog(`✅ CSV loaded: ${products.length} products found`);
      toast.success(`${products.length} Produkte aus CSV geladen`);
    } catch (err) {
      addLog(`❌ Error loading CSV: ${err instanceof Error ? err.message : 'Unknown'}`);
      toast.error('CSV konnte nicht geladen werden');
    }
  };

  const runImport = async () => {
    if (!csvData || csvData.length === 0) {
      toast.error('Keine CSV-Daten geladen');
      return;
    }

    setIsImporting(true);
    setResults(null);
    setProgress(0);
    
    const batchSize = 50;
    const batches = Math.ceil(csvData.length / batchSize);
    
    setTotalBatches(batches);
    addLog(`🚀 Starting import: ${csvData.length} products in ${batches} batches`);

    let totalUpdated = 0;
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < batches; i++) {
      setCurrentBatch(i + 1);
      setProgress(Math.round(((i + 1) / batches) * 100));
      
      const start = i * batchSize;
      const end = Math.min(start + batchSize, csvData.length);
      const batch = csvData.slice(start, end);

      try {
        const { data, error } = await supabase.functions.invoke<ImportResult>('import-products-csv', {
          body: { products: batch, batch_name: `batch-${i + 1}` },
        });

        if (error) {
          addLog(`❌ Batch ${i + 1}: ${error.message}`);
          totalErrors++;
          continue;
        }

        if (data?.results) {
          totalUpdated += data.results.products_updated;
          totalInserted += data.results.products_inserted;
          totalErrors += data.results.total_errors;
          
          if (data.results.products_updated > 0 || data.results.products_inserted > 0) {
            addLog(`✅ Batch ${i + 1}: ${data.results.products_updated} updated, ${data.results.products_inserted} inserted`);
          }
          
          if (data.results.total_errors > 0) {
            addLog(`⚠️ Batch ${i + 1}: ${data.results.total_errors} errors`);
          }
        }
      } catch (err) {
        addLog(`❌ Batch ${i + 1} exception: ${err instanceof Error ? err.message : 'Unknown'}`);
        totalErrors++;
      }

      // Pause zwischen Batches
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setResults({ updated: totalUpdated, inserted: totalInserted, errors: totalErrors });
    addLog(`🎉 Import complete! Updated: ${totalUpdated}, Inserted: ${totalInserted}, Errors: ${totalErrors}`);
    setIsImporting(false);
    toast.success(`Import abgeschlossen: ${totalUpdated} aktualisiert, ${totalInserted} neu`);
  };

  const deleteDuplicates = async () => {
    setIsDeleting(true);
    addLog('🗑️ Starting duplicate deletion...');
    
    let deleted = 0;
    let notFound = 0;
    
    // Erst alle Brands holen
    const { data: brands } = await supabase
      .from('supplement_brands')
      .select('id, slug');
    
    const brandMap = new Map(brands?.map(b => [b.slug, b.id]) || []);
    
    for (const dup of DUPLICATES_TO_DELETE) {
      const brandId = brandMap.get(dup.brand_slug);
      if (!brandId) {
        addLog(`⚠️ Brand not found: ${dup.brand_slug}`);
        notFound++;
        continue;
      }
      
      const { error, count } = await supabase
        .from('supplement_products')
        .delete()
        .eq('product_name', dup.product_name)
        .eq('brand_id', brandId);
      
      if (error) {
        addLog(`❌ Delete failed: ${dup.product_name} - ${error.message}`);
      } else if (count && count > 0) {
        deleted++;
        addLog(`✅ Deleted: ${dup.product_name} (${dup.brand_slug})`);
      } else {
        notFound++;
      }
    }
    
    addLog(`🎉 Deletion complete! Deleted: ${deleted}, Not found: ${notFound}`);
    setIsDeleting(false);
    toast.success(`${deleted} Duplikate gelöscht`);
    
    // Finale Produktzahl prüfen
    const { count } = await supabase
      .from('supplement_products')
      .select('*', { count: 'exact', head: true });
    
    addLog(`📊 Final product count: ${count}`);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-6 w-6" />
              CSV Import - Angereicherte Produktdaten
            </CardTitle>
            <CardDescription>
              Importiert 877 Produkte mit 25+ neuen Feldern und löscht 37 Duplikate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CSV Status */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{csvData?.length ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">CSV Produkte geladen</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{DUPLICATES_TO_DELETE.length}</div>
                  <div className="text-xs text-muted-foreground">Duplikate zu löschen</div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-4 flex-wrap">
              <Button onClick={loadCSV} variant="outline" disabled={isImporting || isDeleting}>
                <FileUp className="h-4 w-4 mr-2" />
                CSV laden
              </Button>
              <Button onClick={runImport} disabled={isImporting || isDeleting || !csvData}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importiere... ({currentBatch}/{totalBatches})
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Import starten
                  </>
                )}
              </Button>
              <Button 
                onClick={deleteDuplicates} 
                variant="destructive" 
                disabled={isImporting || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lösche...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    37 Duplikate löschen
                  </>
                )}
              </Button>
            </div>

            {/* Progress */}
            {isImporting && (
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
                <Badge variant="default" className="bg-blue-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {results.updated} aktualisiert
                </Badge>
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {results.inserted} neu eingefügt
                </Badge>
                {results.errors > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {results.errors} Fehler
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
                    <div className="text-muted-foreground">Klicke "CSV laden" um zu starten...</div>
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
