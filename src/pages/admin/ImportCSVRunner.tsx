import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export default function ImportCSVRunner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState("");

  const runFullUpdate = async () => {
    setLoading(true);
    setProgress("Lade CSV...");
    
    try {
      // Fetch the CSV file
      const response = await fetch("/temp-import.csv");
      const csvText = await response.text();
      
      setProgress("Parse CSV...");
      
      // Parse CSV
      const lines = csvText.split("\n");
      const headers = lines[0].split(",");
      
      // Find column indices
      const idIdx = headers.indexOf("id");
      const amazonAsinIdx = headers.indexOf("amazon_asin");
      const amazonUrlIdx = headers.indexOf("amazon_url");
      const amazonImageIdx = headers.indexOf("amazon_image");
      const amazonNameIdx = headers.indexOf("amazon_name");
      const matchScoreIdx = headers.indexOf("match_score");
      const shopUrlIdx = headers.indexOf("shop_url");
      
      console.log("Column indices:", { idIdx, amazonAsinIdx, amazonUrlIdx, amazonImageIdx, amazonNameIdx, matchScoreIdx, shopUrlIdx });
      
      // Parse rows
      const updateData: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles commas in quoted fields)
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
        if (!id || id.length < 30) continue; // Skip invalid UUIDs
        
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
      
      console.log(`Parsed ${updateData.length} products`);
      setProgress(`Sende ${updateData.length} Produkte an Edge Function...`);
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke("import-products-csv", {
        body: { full_update: updateData }
      });
      
      if (error) {
        throw error;
      }
      
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

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>CSV Full Import Runner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Dieser Import liest die hochgeladene CSV und aktualisiert alle 877 Produkte 
            mit den korrekten Amazon-Daten und Shop-URLs per ID-Matching.
          </p>
          
          <div className="flex gap-4">
            <Button onClick={runFullUpdate} disabled={loading}>
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
