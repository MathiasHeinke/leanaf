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

// 22 Duplikate zum Löschen - direkt per UUID
const DUPLICATE_IDS_TO_DELETE = [
  // ESN
  '595c3827-b1cd-4428-a359-16098c1f308e', // Ultrapure Creatine Monohydrat
  // Doppelherz
  '8eee61c9-8ffb-448f-bf2a-ce779d270944', // Vitamin D3 2000 IE 60 Tabs
  // MoleQlar NMN
  'e82f8180-1b4a-41ac-9a0b-6be82a83367b', // NMN Pur 250mg
  '962d1dea-6007-4b48-aa6b-d4b7b77db3cf', // NMN 500mg
  // MoleQlar Spermidin
  'efdaa869-801a-4674-a416-b3b326f80343', // Spermidin
  // Naturtreu
  '47071656-cbc3-43a4-9bed-02925ce7baa3', // Darmfreund Probiotika
  // Orthomol (10)
  'c248e42c-fdae-4194-8f1b-d28c9359df4c', // Immun 30 Tagesportionen
  '8cf916b1-fdf3-411b-8ebe-35e7003326aa', // Arthroplus 30 Portions
  'b900c084-556e-4b91-aeff-b54e9de1d7f0', // Beauty 30 Trinkfläschchen
  '05fec0f0-bfd8-441c-8c4a-4ba5e45c35cb', // Cardio 30 Beutel
  '7e62b477-34a3-4216-ace0-2e7c251d3518', // Mental 30 Portions
  '9bdbc344-46ed-4391-9b2e-b745ca16eb90', // Osteo 30 Portions
  'a8be0def-d8c0-4802-86a7-96d1e14822ae', // Sport 30 Trinkfläschchen
  '0a6f1366-1bb2-45b4-918a-b77540d7bcc9', // Tendo 30 Granulat
  '8da03c33-6593-4d06-96cf-c306934eb14c', // Vital f 30 Granulat
  '8de1d522-ad26-4cf8-b39d-9fe715d70540', // Vital m 30 Granulat
  // Sunday Natural
  '0aa7ed83-5095-4d34-a9a0-9b7f4ac81022', // Omega-3 Algenöl
  '9990e599-1f3b-439a-a716-84f8c65af3f4', // Vitamin D3+K2 Tropfen
  // ProFuel
  'f066ea49-0a64-4835-a526-c21313dccdd5', // Omega-3 Algenöl 90 Caps
  '1a77b854-7a32-4c4a-82b8-40a409c69b69', // Vitamin D3 + K2 vegan
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
    addLog('🗑️ Starting duplicate deletion by ID...');
    
    let deleted = 0;
    let notFound = 0;
    
    for (const id of DUPLICATE_IDS_TO_DELETE) {
      const { error, count } = await supabase
        .from('supplement_products')
        .delete()
        .eq('id', id);
      
      if (error) {
        addLog(`❌ Delete failed: ${id} - ${error.message}`);
        notFound++;
      } else if (count && count > 0) {
        deleted++;
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
                  <div className="text-2xl font-bold">{DUPLICATE_IDS_TO_DELETE.length}</div>
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
                    22 Duplikate löschen
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
