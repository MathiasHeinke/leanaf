import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Play, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parseMatrixMarkdown, toRelevanceMatrix, type ImportedIngredient } from '@/lib/matrixImportParser';
import { matchAllIngredients, getMatchStats, type DbSupplement } from '@/lib/matrixIngredientMatcher';
import { useToast } from '@/hooks/use-toast';
import matrixData from '@/data/matrix-import-v2.1.md?raw';

interface ImportResult {
  success: boolean;
  totalParsed: number;
  totalMatched: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  matchStats: {
    exact: number;
    manual: number;
    fuzzy: number;
    unmatched: number;
  };
  errors: string[];
  updatedSupplements: Array<{
    dbId: string;
    dbName: string;
    importId: string;
    importName: string;
    matchType: string;
  }>;
  skippedIngredients: Array<{
    importId: string;
    importName: string;
    reason: string;
  }>;
}

export default function MatrixImportRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleExecuteImport = async () => {
    setIsRunning(true);
    setResult(null);

    const importResult: ImportResult = {
      success: false,
      totalParsed: 0,
      totalMatched: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      matchStats: { exact: 0, manual: 0, fuzzy: 0, unmatched: 0 },
      errors: [],
      updatedSupplements: [],
      skippedIngredients: [],
    };

    try {
      // Step 1: Parse the markdown
      console.log('[Matrix Import] Parsing markdown content...');
      const parseResult = parseMatrixMarkdown(matrixData);
      importResult.totalParsed = parseResult.ingredients.length;
      
      if (parseResult.errors.length > 0) {
        importResult.errors.push(...parseResult.errors.map(e => `Parse: ${e}`));
      }
      
      console.log(`[Matrix Import] Parsed ${importResult.totalParsed} ingredients`);

      // Step 2: Fetch all supplements from DB
      console.log('[Matrix Import] Fetching supplements from database...');
      const { data: dbSupplements, error: fetchError } = await supabase
        .from('supplement_database')
        .select('id, name')
        .order('name');
      
      if (fetchError) {
        throw new Error(`Failed to fetch supplements: ${fetchError.message}`);
      }
      
      console.log(`[Matrix Import] Found ${dbSupplements?.length || 0} supplements in database`);

      // Step 3: Match ingredients to DB entries
      console.log('[Matrix Import] Matching ingredients to database entries...');
      const ingredientsForMatching = parseResult.ingredients.map(ing => ({
        ingredient_id: ing.ingredient_id,
        ingredient_name: ing.ingredient_name,
      }));
      
      const matchResults = matchAllIngredients(ingredientsForMatching, dbSupplements || []);
      const stats = getMatchStats(matchResults);
      
      importResult.matchStats = {
        exact: stats.exact,
        manual: stats.manual,
        fuzzy: stats.fuzzy,
        unmatched: stats.unmatched,
      };
      importResult.totalMatched = stats.matched;
      
      console.log(`[Matrix Import] Match results: ${stats.exact} exact, ${stats.manual} manual, ${stats.fuzzy} fuzzy, ${stats.unmatched} unmatched`);

      // Step 4: Create a map for quick ingredient lookup
      const ingredientMap = new Map<string, ImportedIngredient>();
      for (const ing of parseResult.ingredients) {
        ingredientMap.set(ing.ingredient_id, ing);
      }

      // Step 5: Process each matched ingredient
      console.log('[Matrix Import] Updating database records...');
      
      for (const match of matchResults) {
        if (match.matchType === 'none' || !match.matchedDbId) {
          importResult.skippedIngredients.push({
            importId: match.ingredientId,
            importName: match.ingredientName,
            reason: 'No database match found',
          });
          importResult.totalSkipped++;
          continue;
        }

        const ingredient = ingredientMap.get(match.ingredientId);
        if (!ingredient) {
          importResult.errors.push(`Ingredient ${match.ingredientId} not found in parsed data`);
          importResult.totalErrors++;
          continue;
        }

        // Convert to RelevanceMatrix format
        const matrix = toRelevanceMatrix(ingredient);
        const matrixJson = JSON.parse(JSON.stringify(matrix));

        // Update the database
        const { error: updateError } = await supabase
          .from('supplement_database')
          .update({ relevance_matrix: matrixJson })
          .eq('id', match.matchedDbId);
        
        if (updateError) {
          importResult.errors.push(`Update failed for ${match.ingredientName}: ${updateError.message}`);
          importResult.totalErrors++;
        } else {
          importResult.updatedSupplements.push({
            dbId: match.matchedDbId,
            dbName: match.matchedDbName || '',
            importId: match.ingredientId,
            importName: match.ingredientName,
            matchType: match.matchType,
          });
          importResult.totalUpdated++;
        }
      }

      importResult.success = importResult.totalErrors === 0;
      
      console.log(`[Matrix Import] Complete: ${importResult.totalUpdated} updated, ${importResult.totalSkipped} skipped, ${importResult.totalErrors} errors`);
      
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
      importResult.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResult(importResult);
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
          <h1 className="text-2xl font-bold">Matrix Import Runner</h1>
          <p className="text-muted-foreground mt-1">
            [Legacy] Markdown-basierter Import (v2.1). Verwende den CSV Matrix v2.3 Import auf der Admin-Hauptseite für aktuelle Daten.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Batch Import</CardTitle>
            <CardDescription>
              Matrix-Daten: {matrixData.length.toLocaleString()} Zeichen geladen
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
