import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Layers, FileJson } from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    updated: number;
    skipped: number;
    errors: number;
    error_details?: string[];
  };
  database_totals?: {
    products: number;
    products_with_asin: number;
    unique_asins: number;
    products_with_shop_url: number;
  };
}

interface BrandSyncResult {
  success: boolean;
  message: string;
  results?: {
    updated: number;
    deprecated: number;
    errors: number;
    error_details?: string[];
    orphan_ids?: string[];
  };
  database_totals?: {
    brand_products: number;
    brand_deprecated: number;
  };
}

interface BulkFileInfo {
  file: File;
  brandSlug: string;
  brandName: string;
  productCount: number | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: BrandSyncResult;
}

interface BulkSummary {
  totalFiles: number;
  totalProducts: number;
  totalUpdated: number;
  totalDeprecated: number;
  totalErrors: number;
}

// All 20 brands for dropdown + bulk auto-detection
const BRAND_OPTIONS = [
  { slug: "amazon-generic", name: "Amazon Generic" },
  { slug: "biogena", name: "Biogena" },
  { slug: "bulk", name: "Bulk" },
  { slug: "doctors-best", name: "Doctor's Best" },
  { slug: "doppelherz", name: "Doppelherz" },
  { slug: "esn", name: "ESN" },
  { slug: "gloryfeel", name: "Gloryfeel" },
  { slug: "gymbeam", name: "GymBeam" },
  { slug: "lebenskraft-pur", name: "Lebenskraft Pur" },
  { slug: "life-extension", name: "Life Extension" },
  { slug: "moleqlar", name: "MoleQlar" },
  { slug: "more-nutrition", name: "More Nutrition" },
  { slug: "natural-elements", name: "Natural Elements" },
  { slug: "nature-love", name: "Nature Love" },
  { slug: "naturtreu", name: "Naturtreu" },
  { slug: "nordic-naturals", name: "Nordic Naturals" },
  { slug: "now-foods", name: "Now Foods" },
  { slug: "orthomol", name: "Orthomol" },
  { slug: "profuel", name: "ProFuel" },
  { slug: "sunday-natural", name: "Sunday Natural" },
];

// Extract brand slug from filename: doctors_best.json -> doctors-best
const extractBrandFromFilename = (filename: string): string => {
  const base = filename.replace(/\.json$/i, '').replace(/-\d+$/, '');
  return base.replace(/_/g, '-').toLowerCase();
};

// Find brand name from slug
const getBrandName = (slug: string): string => {
  const brand = BRAND_OPTIONS.find(b => b.slug === slug);
  return brand?.name || slug;
};

export default function ImportCSVRunner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState("");
  
  // Single Brand Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<BrandSyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Mode State
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<BulkFileInfo[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const runFullUpdate = async () => {
    setLoading(true);
    setProgress("Lade CSV...");
    
    try {
      const response = await fetch("/temp-import.csv");
      const csvText = await response.text();
      
      setProgress("Parse CSV...");
      
      const lines = csvText.split("\n");
      const headers = lines[0].split(",");
      
      const idIdx = headers.indexOf("id");
      const amazonAsinIdx = headers.indexOf("amazon_asin");
      const amazonUrlIdx = headers.indexOf("amazon_url");
      const amazonImageIdx = headers.indexOf("amazon_image");
      const amazonNameIdx = headers.indexOf("amazon_name");
      const matchScoreIdx = headers.indexOf("match_score");
      const shopUrlIdx = headers.indexOf("shop_url");
      
      const updateData: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        const id = values[idIdx];
        if (!id || id.length < 30) continue;
        
        updateData.push({
          id,
          amazon_asin: values[amazonAsinIdx] || null,
          amazon_url: values[amazonUrlIdx] || null,
          amazon_image: values[amazonImageIdx] || null,
          amazon_name: values[amazonNameIdx] || null,
          match_score: values[matchScoreIdx] || null,
          shop_url: values[shopUrlIdx] || null,
        });
      }
      
      setProgress(`Sende ${updateData.length} Produkte an Edge Function...`);
      
      const { data, error } = await supabase.functions.invoke("import-products-csv", {
        body: { full_update: updateData }
      });
      
      if (error) throw error;
      
      setResult(data);
      setProgress("Fertig!");
      toast.success(`Import abgeschlossen: ${data.results?.updated || 0} aktualisiert`);
      
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(`Fehler: ${err.message}`);
      setProgress(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".json")) {
        toast.error("Bitte eine JSON-Datei auswählen");
        return;
      }
      setJsonFile(file);
      setSyncResult(null);
    }
  };

  const runBrandSync = async () => {
    if (!jsonFile) {
      toast.error("Bitte zuerst eine JSON-Datei auswählen");
      return;
    }
    if (!selectedBrand) {
      toast.error("Bitte eine Marke auswählen");
      return;
    }

    setSyncLoading(true);
    setSyncProgress("Lese JSON-Datei...");
    setSyncResult(null);

    try {
      let fileContent = await jsonFile.text();
      setSyncProgress("Parse JSON (repariere NaN-Werte)...");
      
      fileContent = fileContent.replace(/:\s*NaN\s*([,}\]])/g, ': null$1');
      fileContent = fileContent.replace(/,\s*NaN\s*([,\]])/g, ', null$1');
      fileContent = fileContent.replace(/\[\s*NaN\s*([,\]])/g, '[null$1');
      
      let products;
      try {
        products = JSON.parse(fileContent);
      } catch (parseErr: any) {
        console.error("JSON parse error:", parseErr);
        throw new Error(`Ungültiges JSON-Format: ${parseErr.message}`);
      }

      if (!Array.isArray(products)) {
        throw new Error("JSON muss ein Array von Produkten sein");
      }

      setSyncProgress(`Sende ${products.length} Produkte für Brand-Sync...`);
      
      const { data, error } = await supabase.functions.invoke("import-products-csv", {
        body: {
          brand_sync: {
            brand_slug: selectedBrand,
            products: products
          }
        }
      });

      if (error) throw error;

      setSyncResult(data);
      setSyncProgress("Fertig!");
      
      if (data.success) {
        toast.success(
          `Sync abgeschlossen: ${data.results?.updated || 0} aktualisiert, ${data.results?.deprecated || 0} deprecated`
        );
      } else {
        toast.error(data.message || "Sync fehlgeschlagen");
      }

    } catch (err: any) {
      console.error("Brand sync error:", err);
      toast.error(`Fehler: ${err.message}`);
      setSyncProgress(`Fehler: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // === BULK MODE FUNCTIONS ===

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileInfos: BulkFileInfo[] = [];
    
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".json")) {
        toast.error(`${file.name} ist keine JSON-Datei`);
        continue;
      }

      const brandSlug = extractBrandFromFilename(file.name);
      const brandName = getBrandName(brandSlug);
      
      // Quick parse to count products
      let productCount: number | null = null;
      try {
        let content = await file.text();
        content = content.replace(/:\s*NaN\s*([,}\]])/g, ': null$1');
        content = content.replace(/,\s*NaN\s*([,\]])/g, ', null$1');
        content = content.replace(/\[\s*NaN\s*([,\]])/g, '[null$1');
        const products = JSON.parse(content);
        if (Array.isArray(products)) {
          productCount = products.length;
        }
      } catch {
        // Ignore parse errors during preview
      }

      fileInfos.push({
        file,
        brandSlug,
        brandName,
        productCount,
        status: 'pending'
      });
    }

    setBulkFiles(fileInfos);
    setBulkSummary(null);
  };

  const runBulkSync = async () => {
    if (bulkFiles.length === 0) {
      toast.error("Keine Dateien ausgewählt");
      return;
    }

    setBulkLoading(true);
    setBulkProgress({ current: 0, total: bulkFiles.length });
    setBulkSummary(null);

    const summary: BulkSummary = {
      totalFiles: bulkFiles.length,
      totalProducts: 0,
      totalUpdated: 0,
      totalDeprecated: 0,
      totalErrors: 0
    };

    const updatedFiles = [...bulkFiles];

    for (let i = 0; i < updatedFiles.length; i++) {
      const fileInfo = updatedFiles[i];
      setBulkProgress({ current: i + 1, total: bulkFiles.length });
      
      // Update status to processing
      updatedFiles[i] = { ...fileInfo, status: 'processing' };
      setBulkFiles([...updatedFiles]);

      try {
        let fileContent = await fileInfo.file.text();
        
        // Fix NaN values
        fileContent = fileContent.replace(/:\s*NaN\s*([,}\]])/g, ': null$1');
        fileContent = fileContent.replace(/,\s*NaN\s*([,\]])/g, ', null$1');
        fileContent = fileContent.replace(/\[\s*NaN\s*([,\]])/g, '[null$1');
        
        const products = JSON.parse(fileContent);
        
        if (!Array.isArray(products)) {
          throw new Error("JSON muss ein Array sein");
        }

        summary.totalProducts += products.length;

        const { data, error } = await supabase.functions.invoke("import-products-csv", {
          body: {
            brand_sync: {
              brand_slug: fileInfo.brandSlug,
              products: products
            }
          }
        });

        if (error) throw error;

        updatedFiles[i] = {
          ...fileInfo,
          status: data.success ? 'done' : 'error',
          result: data
        };

        if (data.results) {
          summary.totalUpdated += data.results.updated || 0;
          summary.totalDeprecated += data.results.deprecated || 0;
          summary.totalErrors += data.results.errors || 0;
        }

      } catch (err: any) {
        console.error(`Error processing ${fileInfo.file.name}:`, err);
        updatedFiles[i] = {
          ...fileInfo,
          status: 'error',
          result: {
            success: false,
            message: err.message
          }
        };
        summary.totalErrors += 1;
      }

      setBulkFiles([...updatedFiles]);
      
      // Small delay between requests to avoid rate limits
      if (i < updatedFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setBulkSummary(summary);
    setBulkLoading(false);
    toast.success(`Bulk-Import abgeschlossen: ${summary.totalUpdated} Produkte aktualisiert`);
  };

  const clearBulkFiles = () => {
    setBulkFiles([]);
    setBulkSummary(null);
    setBulkProgress({ current: 0, total: 0 });
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-5xl space-y-8">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button 
          variant={!bulkMode ? "default" : "outline"} 
          onClick={() => setBulkMode(false)}
          size="sm"
        >
          <FileJson className="h-4 w-4 mr-2" />
          Einzelne Datei
        </Button>
        <Button 
          variant={bulkMode ? "default" : "outline"} 
          onClick={() => setBulkMode(true)}
          size="sm"
        >
          <Layers className="h-4 w-4 mr-2" />
          Bulk Import (Multi-File)
        </Button>
      </div>

      {/* BULK MODE */}
      {bulkMode ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Bulk Brand Sync
            </CardTitle>
            <CardDescription>
              Mehrere JSON-Dateien gleichzeitig hochladen. Marke wird automatisch aus Dateinamen erkannt 
              (z.B. doctors_best.json → doctors-best).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">JSON-Dateien (mehrere möglich)</label>
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleBulkFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="w-full justify-start"
                  disabled={bulkLoading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {bulkFiles.length > 0 
                    ? `${bulkFiles.length} Dateien ausgewählt` 
                    : "JSONs auswählen..."}
                </Button>
              </div>

              <Button 
                onClick={runBulkSync} 
                disabled={bulkLoading || bulkFiles.length === 0}
                className="min-w-[160px]"
              >
                {bulkLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {bulkProgress.current}/{bulkProgress.total}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Bulk Sync starten
                  </>
                )}
              </Button>

              {bulkFiles.length > 0 && !bulkLoading && (
                <Button variant="ghost" onClick={clearBulkFiles} size="sm">
                  Zurücksetzen
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {bulkLoading && (
              <div className="space-y-2">
                <Progress 
                  value={(bulkProgress.current / bulkProgress.total) * 100} 
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground">
                  Verarbeite {bulkProgress.current} von {bulkProgress.total}...
                </p>
              </div>
            )}

            {/* File List */}
            {bulkFiles.length > 0 && (
              <div className="border rounded-lg divide-y max-h-[400px] overflow-auto">
                {bulkFiles.map((fileInfo, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 flex items-center justify-between text-sm ${
                      fileInfo.status === 'processing' ? 'bg-primary/5' :
                      fileInfo.status === 'done' ? 'bg-green-500/5' :
                      fileInfo.status === 'error' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {fileInfo.status === 'pending' && (
                        <div className="h-4 w-4 rounded-full border-2" />
                      )}
                      {fileInfo.status === 'processing' && (
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {fileInfo.status === 'done' && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {fileInfo.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <span className="font-medium">{fileInfo.file.name}</span>
                        <span className="text-muted-foreground ml-2">
                          → {fileInfo.brandName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-muted-foreground">
                      {fileInfo.productCount !== null && (
                        <span>{fileInfo.productCount} Produkte</span>
                      )}
                      {fileInfo.result?.results && (
                        <span className="ml-2 text-green-600">
                          +{fileInfo.result.results.updated}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {bulkSummary && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 text-center">
                      <p className="text-sm text-muted-foreground">Dateien</p>
                      <p className="text-2xl font-bold">{bulkSummary.totalFiles}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4 text-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">Aktualisiert</p>
                      <p className="text-2xl font-bold text-green-500">{bulkSummary.totalUpdated}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-500/10 border-yellow-500/30">
                    <CardContent className="pt-4 text-center">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">Deprecated</p>
                      <p className="text-2xl font-bold text-yellow-500">{bulkSummary.totalDeprecated}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="pt-4 text-center">
                      <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">Fehler</p>
                      <p className="text-2xl font-bold text-red-500">{bulkSummary.totalErrors}</p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Gesamt: {bulkSummary.totalProducts} Produkte verarbeitet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* SINGLE FILE MODE */
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Brand Product Sync
            </CardTitle>
            <CardDescription>
              JSON-Datei hochladen um alle Produkte einer Marke zu aktualisieren. 
              Produkte die nicht in der JSON sind werden als "deprecated" markiert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">JSON-Datei</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-start"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {jsonFile ? jsonFile.name : "JSON auswählen..."}
                </Button>
              </div>

              <div className="w-[200px]">
                <label className="text-sm font-medium mb-2 block">Marke</label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Marke wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAND_OPTIONS.map(brand => (
                      <SelectItem key={brand.slug} value={brand.slug}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={runBrandSync} 
                disabled={syncLoading || !jsonFile || !selectedBrand}
                className="min-w-[140px]"
              >
                {syncLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Läuft...
                  </>
                ) : (
                  "Sync starten"
                )}
              </Button>
            </div>

            {syncProgress && (
              <p className="text-sm font-mono bg-muted p-2 rounded">{syncProgress}</p>
            )}

            {syncResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="pt-4 text-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">Aktualisiert</p>
                      <p className="text-3xl font-bold text-green-500">
                        {syncResult.results?.updated || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-500/10 border-yellow-500/30">
                    <CardContent className="pt-4 text-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">Deprecated</p>
                      <p className="text-3xl font-bold text-yellow-500">
                        {syncResult.results?.deprecated || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardContent className="pt-4 text-center">
                      <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                      <p className="text-sm text-muted-foreground">Fehler</p>
                      <p className="text-3xl font-bold text-red-500">
                        {syncResult.results?.errors || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {syncResult.database_totals && (
                  <div className="text-sm text-muted-foreground">
                    Gesamt in DB: {syncResult.database_totals.brand_products} Produkte, 
                    davon {syncResult.database_totals.brand_deprecated} deprecated
                  </div>
                )}

                {syncResult.results?.orphan_ids && syncResult.results.orphan_ids.length > 0 && (
                  <div className="bg-yellow-500/10 p-4 rounded text-sm">
                    <p className="font-semibold text-yellow-600 mb-2">
                      Deprecated Produkt-IDs ({syncResult.results?.deprecated}):
                    </p>
                    <code className="text-xs break-all">
                      {syncResult.results.orphan_ids.join(", ")}
                      {(syncResult.results?.deprecated || 0) > 20 && "..."}
                    </code>
                  </div>
                )}

                {syncResult.results?.error_details && syncResult.results.error_details.length > 0 && (
                  <div className="bg-destructive/10 p-4 rounded">
                    <p className="font-semibold text-destructive mb-2">
                      Fehler ({syncResult.results.errors}):
                    </p>
                    <ul className="text-sm space-y-1 max-h-40 overflow-auto">
                      {syncResult.results.error_details.map((e, i) => (
                        <li key={i} className="text-xs">{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Vollständige Response
                  </summary>
                  <pre className="bg-muted p-4 rounded overflow-auto max-h-60 mt-2">
                    {JSON.stringify(syncResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CSV Full Import Card - Secondary */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Full Import Runner</CardTitle>
          <CardDescription>
            Legacy-Import: Liest /temp-import.csv und aktualisiert Amazon-Daten per ID-Matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runFullUpdate} disabled={loading} variant="secondary">
              {loading ? "Läuft..." : "Full Update starten"}
            </Button>
          </div>
          
          {progress && (
            <p className="text-sm font-mono bg-muted p-2 rounded">{progress}</p>
          )}
          
          {result && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Aktualisiert</p>
                    <p className="text-3xl font-bold text-green-500">{result.results?.updated || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Übersprungen</p>
                    <p className="text-3xl font-bold text-yellow-500">{result.results?.skipped || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Produkte mit ASIN</p>
                    <p className="text-3xl font-bold">{result.database_totals?.products_with_asin || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Produkte mit Shop-URL</p>
                    <p className="text-3xl font-bold text-blue-500">{result.database_totals?.products_with_shop_url || 0}</p>
                  </CardContent>
                </Card>
              </div>
              
              {result.results?.error_details && result.results.error_details.length > 0 && (
                <div className="bg-destructive/10 p-4 rounded">
                  <p className="font-semibold text-destructive mb-2">Fehler ({result.results.errors}):</p>
                  <ul className="text-sm space-y-1">
                    {result.results.error_details.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
