import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload, FileText, Database, CheckCircle, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { getCurrentDateString } from '@/utils/dateHelpers';

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

export const KnowledgeBaseExportImport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ 
    success: number; 
    failed: number; 
    updated: number;
    skipped: number;
    errors: string[] 
  } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge' | 'update'>('merge');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [coachStats, setCoachStats] = useState<Record<string, number>>({});

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('Keine Daten zum Exportieren verfügbar');
      return;
    }

    // CSV Header
    const headers = [
      'title',
      'expertise_area', 
      'knowledge_type',
      'content',
      'coach_id',
      'priority_level',
      'tags',
      'source_url',
      'created_at'
    ];

    // Convert data to CSV format
    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        return headers.map(header => {
          let value = row[header] || '';
          // Handle arrays (tags)
          if (Array.isArray(value)) {
            value = value.join(';');
          }
          // Escape quotes and wrap in quotes if contains comma/quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSaschaKnowledge = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('coach_knowledge_base')
        .select('*')
        .eq('coach_id', 'sascha')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        downloadCSV(data, `sascha_knowledge_export_${getCurrentDateString()}.csv`);
        toast.success(`${data.length} Sascha Wissensbasis-Einträge erfolgreich exportiert`);
      } else {
        toast.error('Keine Sascha Wissensbasis-Einträge gefunden');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Export der Wissensbasis');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllKnowledge = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from('coach_knowledge_base')
        .select('*')
        .order('coach_id', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        downloadCSV(data, `complete_knowledge_export_${getCurrentDateString()}.csv`);
        toast.success(`${data.length} Wissensbasis-Einträge erfolgreich exportiert`);
      } else {
        toast.error('Keine Wissensbasis-Einträge gefunden');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Export der Wissensbasis');
    } finally {
      setIsExporting(false);
    }
  };

  const parseCSV = (csvText: string): KnowledgeEntry[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const entries: KnowledgeEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (could be improved for complex cases)
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      
      if (values.length !== headers.length) continue;

      const entry: any = {};
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Convert tags back to array
        if (header === 'tags' && value) {
          entry[header] = value.split(';').filter(t => t.trim());
        } else if (header === 'priority_level') {
          entry[header] = parseInt(value) || 1;
        } else {
          entry[header] = value;
        }
      });

      entries.push(entry as KnowledgeEntry);
    }

    return entries;
  };

  const analyzeCoachData = async () => {
    setIsAnalyzing(true);
    try {
      const { data: coaches } = await supabase
        .from('coach_knowledge_base')
        .select('coach_id');

      if (!coaches) return;

      const uniqueCoaches = [...new Set(coaches.map(c => c.coach_id))];
      const stats: Record<string, number> = {};
      
      for (const coachId of uniqueCoaches) {
        const { count } = await supabase
          .from('coach_knowledge_base')
          .select('*', { count: 'exact' })
          .eq('coach_id', coachId);
        
        stats[coachId] = count || 0;
      }
      
      setCoachStats(stats);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createBackup = async (coachId?: string) => {
    try {
      const query = supabase.from('coach_knowledge_base').select('*');
      if (coachId) query.eq('coach_id', coachId);
      
      const { data } = await query;
      if (data) {
        const backup = {
          timestamp: new Date().toISOString(),
          coach_id: coachId || 'all',
          entries: data
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge_backup_${coachId || 'all'}_${getCurrentDateString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(`Backup für ${coachId || 'alle Coaches'} heruntergeladen`);
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Fehler beim Erstellen des Backups');
    }
  };

  const importKnowledge = async (file: File) => {
    setIsImporting(true);
    setImportStatus(null);
    setImportProgress(0);

    try {
      const csvText = await file.text();
      const entries = parseCSV(csvText);

      if (entries.length === 0) {
        toast.error('Keine gültigen Einträge in der CSV-Datei gefunden');
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Replace mode: Delete existing entries for coaches in CSV first
      if (importMode === 'replace') {
        const coachIds = [...new Set(entries.map(e => e.coach_id))];
        for (const coachId of coachIds) {
          await supabase
            .from('coach_knowledge_base')
            .delete()
            .eq('coach_id', coachId);
        }
      }

      // Process entries
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setImportProgress((i / entries.length) * 100);
        
        try {
          if (importMode === 'merge') {
            // Check if entry exists
            const { data: existing } = await supabase
              .from('coach_knowledge_base')
              .select('id')
              .eq('title', entry.title)
              .eq('coach_id', entry.coach_id)
              .maybeSingle();
            
            if (existing) {
              skippedCount++;
              continue;
            }
          }

          const { error } = await supabase
            .from('coach_knowledge_base')
            .upsert({
              title: entry.title,
              expertise_area: entry.expertise_area,
              knowledge_type: entry.knowledge_type,
              content: entry.content,
              coach_id: entry.coach_id,
              priority_level: entry.priority_level || 1,
              tags: entry.tags || [],
              source_url: entry.source_url || null
            }, {
              onConflict: importMode === 'update' ? 'title,coach_id' : undefined,
              ignoreDuplicates: importMode === 'merge'
            });

          if (error) {
            failedCount++;
            errors.push(`${entry.title}: ${error.message}`);
          } else {
            if (importMode === 'update') {
              updatedCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          failedCount++;
          errors.push(`${entry.title}: Unbekannter Fehler`);
        }
      }

      setImportProgress(100);
      setImportStatus({ 
        success: successCount, 
        failed: failedCount, 
        updated: updatedCount,
        skipped: skippedCount,
        errors 
      });
      
      const totalProcessed = successCount + updatedCount;
      if (totalProcessed > 0) {
        toast.success(`${totalProcessed} Einträge erfolgreich verarbeitet`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} Einträge fehlgeschlagen`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der CSV-Datei');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      importKnowledge(file);
    } else {
      toast.error('Bitte wählen Sie eine gültige CSV-Datei aus');
    }
  };

  return (
    <div className="space-y-4">
      {/* Coach Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Knowledge Base Statistiken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 mb-4">
            <Button
              onClick={analyzeCoachData}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
            >
              {isAnalyzing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Statistiken aktualisieren
            </Button>
            <Button
              onClick={() => createBackup()}
              variant="outline"
              size="sm"
            >
              <Download className="mr-2 h-4 w-4" />
              Vollständiges Backup
            </Button>
          </div>
          
          {Object.keys(coachStats).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(coachStats).map(([coachId, count]) => (
                <div key={coachId} className="text-center p-3 border rounded-lg">
                  <div className="font-semibold text-lg">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{coachId}</div>
                  <Button
                    onClick={() => createBackup(coachId)}
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5" />
            Wissensbasis Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={exportSaschaKnowledge}
              disabled={isExporting}
              variant="outline"
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'Sascha Knowledge'}
            </Button>
            
            <Button 
              onClick={exportAllKnowledge}
              disabled={isExporting}
              variant="outline"
              className="flex-1"
            >
              <Database className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'Alle Coaches'}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Exportiert die komplette Wissensbasis als CSV-Datei für externe Bearbeitung.
          </p>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Erweiterte Wissensbasis Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Import-Modus</label>
              <Select value={importMode} onValueChange={(value: 'replace' | 'merge' | 'update') => setImportMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Merge</Badge>
                      <span>Nur neue Einträge hinzufügen</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="update">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Update</Badge>
                      <span>Existierende aktualisieren</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="replace">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Replace</Badge>
                      <span>Komplett ersetzen</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">CSV-Datei</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-foreground">
                    {isImporting ? 'Importiere...' : 'CSV hochladen'}
                  </p>
                </label>
              </div>
            </div>
          </div>
          
          {isImporting && (
            <div className="space-y-2">
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Import läuft... {importProgress.toFixed(0)}% abgeschlossen
                </AlertDescription>
              </Alert>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {importStatus && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {importStatus.success > 0 && (
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-semibold text-green-700">{importStatus.success}</div>
                    <div className="text-xs text-green-600">Neu erstellt</div>
                  </div>
                )}
                
                {importStatus.updated > 0 && (
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-lg font-semibold text-blue-700">{importStatus.updated}</div>
                    <div className="text-xs text-blue-600">Aktualisiert</div>
                  </div>
                )}
                
                {importStatus.skipped > 0 && (
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-semibold text-yellow-700">{importStatus.skipped}</div>
                    <div className="text-xs text-yellow-600">Übersprungen</div>
                  </div>
                )}
                
                {importStatus.failed > 0 && (
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-lg font-semibold text-red-700">{importStatus.failed}</div>
                    <div className="text-xs text-red-600">Fehlgeschlagen</div>
                  </div>
                )}
              </div>
              
              {importStatus.failed > 0 && importStatus.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <details className="mt-2">
                      <summary className="cursor-pointer">Fehler-Details anzeigen ({importStatus.errors.length})</summary>
                      <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {importStatus.errors.map((error, index) => (
                          <li key={index} className="text-xs font-mono">{error}</li>
                        ))}
                      </ul>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>CSV-Format:</strong> title, expertise_area, knowledge_type, content, coach_id, priority_level, tags, source_url
            </p>
            <p>
              <strong>Coach IDs:</strong> sascha, lucy, kai, markus, vita (Dr. Vita Femina)
            </p>
            <p>
              <strong>Tags:</strong> Mehrere Tags mit Semikolon (;) trennen
            </p>
            <p>
              <strong>Upsert:</strong> Bestehende Einträge (gleicher title + coach_id) werden aktualisiert
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};