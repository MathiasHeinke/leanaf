import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Play, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { executeMatrixImportFromFile, type BatchImportResult } from '@/lib/executeMatrixImport';
import { useToast } from '@/hooks/use-toast';

export default function ExecuteImportPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const { toast } = useToast();

  const handleExecuteImport = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const importResult = await executeMatrixImportFromFile();
      setResult(importResult);

      if (importResult.success) {
        toast({
          title: 'Import erfolgreich!',
          description: `${importResult.totalUpdated} Supplements aktualisiert`,
        });
      } else {
        toast({
          title: 'Import mit Fehlern',
          description: `${importResult.totalUpdated} aktualisiert, ${importResult.totalErrors} Fehler`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Matrix Import ausführen</h1>
          <p className="text-muted-foreground mt-1">
            Importiert die ARES Ingredient Relevance Matrix v2.1 in die Datenbank
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Batch Import</CardTitle>
            <CardDescription>
              Lädt die Matrix-Daten aus src/data/matrix-import-v2.1.md und aktualisiert alle
              gematchten Supplements in der Datenbank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExecuteImport}
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import läuft...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Import starten
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-accent-foreground" />
                  )}
                  Import Ergebnis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{result.totalParsed}</div>
                    <div className="text-sm text-muted-foreground">Geparst</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{result.totalUpdated}</div>
                    <div className="text-sm text-muted-foreground">Aktualisiert</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-accent-foreground">{result.totalSkipped}</div>
                    <div className="text-sm text-muted-foreground">Übersprungen</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{result.totalErrors}</div>
                    <div className="text-sm text-muted-foreground">Fehler</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">Exact: {result.matchStats.exact}</Badge>
                  <Badge variant="outline">Manual: {result.matchStats.manual}</Badge>
                  <Badge variant="outline">Fuzzy: {result.matchStats.fuzzy}</Badge>
                  <Badge variant="secondary">Unmatched: {result.matchStats.unmatched}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Updated Supplements */}
            {result.updatedSupplements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Aktualisierte Supplements ({result.updatedSupplements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {result.updatedSupplements.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                        >
                          <span className="font-medium">{item.dbName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">← {item.importName}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.matchType}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Skipped Ingredients */}
            {result.skippedIngredients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                    Übersprungene Wirkstoffe ({result.skippedIngredients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {result.skippedIngredients.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 text-sm text-muted-foreground"
                        >
                          <span>{item.importName}</span>
                          <span className="text-xs">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    Fehler ({result.errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-sm text-destructive">
                          {error}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
