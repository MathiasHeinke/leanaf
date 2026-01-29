// =====================================================
// ARES Matrix Import: Admin UI Page
// =====================================================

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Upload, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { 
  parseMatrixMarkdown, 
  toRelevanceMatrix,
  type ImportedIngredient 
} from '@/lib/matrixImportParser';
import { 
  matchAllIngredients, 
  getMatchStats,
  type MatchResult,
  type DbSupplement 
} from '@/lib/matrixIngredientMatcher';

type ImportStatus = 'idle' | 'parsing' | 'matching' | 'ready' | 'importing' | 'done' | 'error';

interface ImportState {
  status: ImportStatus;
  ingredients: ImportedIngredient[];
  matchResults: MatchResult[];
  parseErrors: string[];
  importProgress: number;
  importErrors: string[];
  successCount: number;
}

export default function ImportMatrixPage() {
  const navigate = useNavigate();
  const [markdownContent, setMarkdownContent] = useState('');
  const [state, setState] = useState<ImportState>({
    status: 'idle',
    ingredients: [],
    matchResults: [],
    parseErrors: [],
    importProgress: 0,
    importErrors: [],
    successCount: 0,
  });

  const handleParse = useCallback(async () => {
    if (!markdownContent.trim()) return;

    setState(prev => ({ ...prev, status: 'parsing' }));

    try {
      // Parse the markdown
      const parseResult = parseMatrixMarkdown(markdownContent);
      
      setState(prev => ({
        ...prev,
        ingredients: parseResult.ingredients,
        parseErrors: parseResult.errors,
        status: 'matching',
      }));

      // Fetch all supplements from database
      const { data: dbSupplements, error } = await supabase
        .from('supplement_database')
        .select('id, name');

      if (error) throw error;

      // Match ingredients to DB supplements
      const matchResults = matchAllIngredients(
        parseResult.ingredients.map(i => ({ 
          ingredient_id: i.ingredient_id, 
          ingredient_name: i.ingredient_name 
        })),
        dbSupplements as DbSupplement[]
      );

      setState(prev => ({
        ...prev,
        matchResults,
        status: 'ready',
      }));
    } catch (error) {
      console.error('Parse error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        parseErrors: [...prev.parseErrors, error instanceof Error ? error.message : 'Unknown error'],
      }));
    }
  }, [markdownContent]);

  const handleImport = useCallback(async () => {
    const matchedIngredients = state.matchResults.filter(r => r.matchedDbId);
    if (matchedIngredients.length === 0) return;

    setState(prev => ({ ...prev, status: 'importing', importProgress: 0, importErrors: [], successCount: 0 }));

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < matchedIngredients.length; i++) {
      const match = matchedIngredients[i];
      const ingredient = state.ingredients.find(ing => ing.ingredient_id === match.ingredientId);
      
      if (!ingredient || !match.matchedDbId) continue;

      try {
        const matrix = toRelevanceMatrix(ingredient);
        
        const { error } = await supabase
          .from('supplement_database')
          .update({ relevance_matrix: matrix as any })
          .eq('id', match.matchedDbId);

        if (error) {
          errors.push(`${ingredient.ingredient_name}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch (error) {
        errors.push(`${ingredient.ingredient_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Update progress
      setState(prev => ({
        ...prev,
        importProgress: ((i + 1) / matchedIngredients.length) * 100,
        successCount,
        importErrors: errors,
      }));
    }

    setState(prev => ({ ...prev, status: 'done' }));
  }, [state.matchResults, state.ingredients]);

  const matchStats = state.matchResults.length > 0 ? getMatchStats(state.matchResults) : null;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Matrix-Import</h1>
          <p className="text-muted-foreground">Importiere Relevanz-Matrix-Daten in die Supplement-Datenbank</p>
        </div>
      </div>

      <Tabs defaultValue="input" className="space-y-4">
        <TabsList>
          <TabsTrigger value="input">1. Daten eingeben</TabsTrigger>
          <TabsTrigger value="preview" disabled={state.ingredients.length === 0}>
            2. Vorschau ({state.ingredients.length})
          </TabsTrigger>
          <TabsTrigger value="matching" disabled={state.matchResults.length === 0}>
            3. Matching ({matchStats?.matched || 0}/{matchStats?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="import" disabled={state.status !== 'ready' && state.status !== 'done'}>
            4. Import
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input">
          <Card>
            <CardHeader>
              <CardTitle>Markdown-Datei einfügen</CardTitle>
              <CardDescription>
                Füge den Inhalt der Matrix-Markdown-Datei ein. Die JSON-Blöcke werden automatisch extrahiert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="# ARES Matrix...&#10;&#10;```json&#10;{&#10;  &quot;ingredient_id&quot;: &quot;vit_d3&quot;,&#10;  ...&#10;}&#10;```"
                className="font-mono text-sm min-h-[400px]"
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
              />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {markdownContent.length.toLocaleString()} Zeichen
                </span>
                <Button 
                  onClick={handleParse} 
                  disabled={!markdownContent.trim() || state.status === 'parsing' || state.status === 'matching'}
                >
                  {state.status === 'parsing' || state.status === 'matching' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verarbeite...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Parsen & Matchen
                    </>
                  )}
                </Button>
              </div>

              {state.parseErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Parse-Fehler</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {state.parseErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Extrahierte Wirkstoffe</CardTitle>
              <CardDescription>
                {state.ingredients.length} Wirkstoffe aus dem Markdown extrahiert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Base Score</TableHead>
                      <TableHead>Modifiers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.ingredients.map((ing, i) => (
                      <TableRow key={ing.ingredient_id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{ing.ingredient_id}</TableCell>
                        <TableCell className="font-medium">{ing.ingredient_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ing.category}</Badge>
                        </TableCell>
                        <TableCell>{ing.base_score}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {ing.phase_modifiers && Object.keys(ing.phase_modifiers).length > 0 && (
                              <Badge variant="secondary" className="text-xs">Phase</Badge>
                            )}
                            {ing.context_modifiers && Object.keys(ing.context_modifiers).length > 0 && (
                              <Badge variant="secondary" className="text-xs">Context</Badge>
                            )}
                            {ing.goal_modifiers && Object.keys(ing.goal_modifiers).length > 0 && (
                              <Badge variant="secondary" className="text-xs">Goals</Badge>
                            )}
                            {ing.bloodwork_triggers && Object.keys(ing.bloodwork_triggers).length > 0 && (
                              <Badge variant="secondary" className="text-xs">Bloodwork</Badge>
                            )}
                            {ing.demographic_modifiers && Object.keys(ing.demographic_modifiers).length > 0 && (
                              <Badge variant="secondary" className="text-xs">Demo</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Matching Tab */}
        <TabsContent value="matching">
          <div className="space-y-4">
            {matchStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Matching-Statistik</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 rounded-lg bg-muted">
                      <div className="text-2xl font-bold">{matchStats.total}</div>
                      <div className="text-sm text-muted-foreground">Gesamt</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-green-500/10">
                      <div className="text-2xl font-bold text-green-600">{matchStats.matched}</div>
                      <div className="text-sm text-muted-foreground">Gematcht</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-500/10">
                      <div className="text-2xl font-bold text-blue-600">{matchStats.exact}</div>
                      <div className="text-sm text-muted-foreground">Exakt</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-purple-500/10">
                      <div className="text-2xl font-bold text-purple-600">{matchStats.manual + matchStats.fuzzy}</div>
                      <div className="text-sm text-muted-foreground">Fuzzy/Manual</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-orange-500/10">
                      <div className="text-2xl font-bold text-orange-600">{matchStats.unmatched}</div>
                      <div className="text-sm text-muted-foreground">Nicht gefunden</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Matching-Ergebnisse</CardTitle>
                <CardDescription>
                  Überprüfe die Zuordnungen vor dem Import
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">Status</TableHead>
                        <TableHead>Import-Name</TableHead>
                        <TableHead>→</TableHead>
                        <TableHead>DB-Name</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Typ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.matchResults.map((result) => (
                        <TableRow key={result.ingredientId}>
                          <TableCell>
                            {result.matchType !== 'none' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{result.ingredientName}</TableCell>
                          <TableCell className="text-muted-foreground">→</TableCell>
                          <TableCell>
                            {result.matchedDbName || (
                              <span className="text-muted-foreground italic">Nicht gefunden</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(result.matchScore * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              result.matchType === 'exact' ? 'default' :
                              result.matchType === 'manual' ? 'secondary' :
                              result.matchType === 'fuzzy' ? 'outline' : 'destructive'
                            }>
                              {result.matchType}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import starten</CardTitle>
              <CardDescription>
                Importiere die Matrix-Daten für alle gematchten Wirkstoffe in die Datenbank
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {matchStats && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Bereit zum Import</AlertTitle>
                  <AlertDescription>
                    <strong>{matchStats.matched}</strong> von {matchStats.total} Wirkstoffen werden importiert.
                    {matchStats.unmatched > 0 && (
                      <> {matchStats.unmatched} Wirkstoffe ohne DB-Entsprechung werden übersprungen.</>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {state.status === 'importing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importiere...</span>
                    <span>{state.importProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={state.importProgress} />
                </div>
              )}

              {state.status === 'done' && (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>Import abgeschlossen!</AlertTitle>
                  <AlertDescription>
                    <strong>{state.successCount}</strong> Wirkstoffe erfolgreich importiert.
                    {state.importErrors.length > 0 && (
                      <div className="mt-2">
                        <strong>{state.importErrors.length}</strong> Fehler:
                        <ul className="list-disc list-inside mt-1">
                          {state.importErrors.slice(0, 5).map((err, i) => (
                            <li key={i} className="text-sm">{err}</li>
                          ))}
                          {state.importErrors.length > 5 && (
                            <li className="text-sm text-muted-foreground">
                              ... und {state.importErrors.length - 5} weitere
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  Zurück
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={state.status === 'importing' || state.status === 'done'}
                >
                  {state.status === 'importing' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importiere...
                    </>
                  ) : state.status === 'done' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Fertig
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {matchStats?.matched || 0} Wirkstoffe importieren
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
