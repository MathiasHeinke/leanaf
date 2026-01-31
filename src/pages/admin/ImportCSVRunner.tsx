import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

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

const BRAND_OPTIONS = [
  { slug: "naturtreu", name: "Naturtreu" },
  { slug: "moleqlar", name: "MoleQlar" },
  { slug: "sunday-natural", name: "Sunday Natural" },
  { slug: "biogena", name: "Biogena" },
  { slug: "lebenskraft-pur", name: "Lebenskraft Pur" },
];

export default function ImportCSVRunner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState("");
  
  // Brand Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<BrandSyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const fileContent = await jsonFile.text();
      setSyncProgress("Parse JSON...");
      
      let products;
      try {
        products = JSON.parse(fileContent);
      } catch (parseErr) {
        throw new Error("Ungültiges JSON-Format");
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

  return (
    <div className="container mx-auto p-8 max-w-5xl space-y-8">
      {/* Brand Sync Card - Primary */}
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

            <div className="w-[180px]">
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
