import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Upload, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';

interface KnowledgeEntry {
  title: string;
  expertise_area: string;
  knowledge_type: string;
  content: string;
  coach_id: string;
  priority_level: number;
  tags: string[];
  source_url?: string;
  created_at: string;
}

export const KnowledgeBaseCSVImport = () => {
  const { user } = useAuth();
  const [csvData, setCsvData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<KnowledgeEntry[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const parseCsv = (csvText: string): KnowledgeEntry[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    if (headers.length < 8) {
      throw new Error('CSV muss mindestens 8 Spalten haben');
    }

    return lines.slice(1).map((line, index) => {
      try {
        // Parse CSV line while handling quoted values
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());

        if (cleanValues.length < 8) {
          throw new Error(`Zeile ${index + 2}: Nicht genügend Spalten`);
        }

        const tags = cleanValues[6] ? cleanValues[6].split(';').map(tag => tag.trim()) : [];
        
        return {
          title: cleanValues[0],
          expertise_area: cleanValues[1],
          knowledge_type: cleanValues[2],
          content: cleanValues[3],
          coach_id: cleanValues[4],
          priority_level: parseInt(cleanValues[5]) || 1,
          tags,
          source_url: cleanValues[7] || undefined,
          created_at: cleanValues[8] || new Date().toISOString()
        };
      } catch (error) {
        throw new Error(`Fehler in Zeile ${index + 2}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    });
  };

  const handleParseCsv = () => {
    try {
      const entries = parseCsv(csvData);
      setParsedEntries(entries);
      toast.success(`${entries.length} Einträge erfolgreich geparst`);
    } catch (error) {
      toast.error(`Fehler beim Parsen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const handleImport = async () => {
    if (!user || parsedEntries.length === 0) {
      toast.error('Keine Daten zum Importieren');
      return;
    }

    setIsImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const entry of parsedEntries) {
        try {
          const { error } = await supabase
            .from('coach_knowledge_base')
            .insert({
              title: entry.title,
              expertise_area: entry.expertise_area,
              knowledge_type: entry.knowledge_type,
              content: entry.content,
              coach_id: entry.coach_id,
              priority_level: entry.priority_level,
              tags: entry.tags,
              source_url: entry.source_url
            });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error('Import error:', error);
          errors.push(`${entry.title}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        }
      }

      setImportResults({ success: successCount, errors });
      
      if (successCount > 0) {
        toast.success(`${successCount} Einträge erfolgreich importiert`);
      }
      
      if (errors.length > 0) {
        toast.error(`${errors.length} Fehler beim Import`);
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Import der Wissensdatenbank');
    } finally {
      setIsImporting(false);
    }
  };

  const sampleCsv = `title,expertise_area,knowledge_type,content,coach_id,priority_level,tags,source_url,created_at
Rohkost-Ernährung: Chancen & Risiken,plant_based_diets,science,"Strenge Rohkost liefert niedrigen BMI und günstige Lipidprofile, aber birgt hohes Risiko für B12-, Protein-, Calcium-, Zink- und Vitamin-D-Mangel.",ares,3,raw_diet;micronutrients;female_health,"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6566854/",2025-07-28T18:00:00+02:00`;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Wissensdatenbank CSV Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* CSV Format Info */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">CSV Format:</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Erwartete Spalten: title, expertise_area, knowledge_type, content, coach_id, priority_level, tags, source_url, created_at
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Beispiel anzeigen</summary>
            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
{sampleCsv}
            </pre>
          </details>
        </div>

        {/* CSV Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">CSV Daten einfügen:</label>
          <Textarea
            placeholder="CSV Daten hier einfügen..."
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        {/* Parse Button */}
        <Button 
          onClick={handleParseCsv}
          disabled={!csvData.trim()}
          variant="outline"
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          CSV Parsen
        </Button>

        {/* Parsed Entries Preview */}
        {parsedEntries.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Geparste Einträge ({parsedEntries.length})</h3>
              <Button 
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {isImporting ? 'Importiere...' : 'In Datenbank importieren'}
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {parsedEntries.slice(0, 5).map((entry, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{entry.title}</h4>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {entry.coach_id}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Prio {entry.priority_level}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.content}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
              {parsedEntries.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... und {parsedEntries.length - 5} weitere Einträge
                </p>
              )}
            </div>
          </div>
        )}

        {/* Import Results */}
        {importResults && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Import Ergebnisse</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Erfolgreich: {importResults.success}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Fehler: {importResults.errors.length}</span>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-red-600">
                    Fehler anzeigen
                  </summary>
                  <div className="mt-2 space-y-1">
                    {importResults.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};