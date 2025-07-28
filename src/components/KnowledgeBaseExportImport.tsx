import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Upload, FileText, Database, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [importStatus, setImportStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

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
        downloadCSV(data, `sascha_knowledge_export_${new Date().toISOString().split('T')[0]}.csv`);
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
        downloadCSV(data, `complete_knowledge_export_${new Date().toISOString().split('T')[0]}.csv`);
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

  const importKnowledge = async (file: File) => {
    setIsImporting(true);
    setImportStatus(null);

    try {
      const csvText = await file.text();
      const entries = parseCSV(csvText);

      if (entries.length === 0) {
        toast.error('Keine gültigen Einträge in der CSV-Datei gefunden');
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process entries in smaller batches
      const batchSize = 10;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        for (const entry of batch) {
          try {
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
                onConflict: 'title,coach_id'
              });

            if (error) {
              failedCount++;
              errors.push(`${entry.title}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (err) {
            failedCount++;
            errors.push(`${entry.title}: Unbekannter Fehler`);
          }
        }
      }

      setImportStatus({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        toast.success(`${successCount} Einträge erfolgreich importiert`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} Einträge fehlgeschlagen`);
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der CSV-Datei');
    } finally {
      setIsImporting(false);
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
            Wissensbasis Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground mb-1">
                {isImporting ? 'Importiere...' : 'CSV-Datei hochladen'}
              </p>
              <p className="text-xs text-muted-foreground">
                Klicken Sie hier oder ziehen Sie eine CSV-Datei hinein
              </p>
            </label>
          </div>

          {importStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {importStatus.success} erfolgreich
                </Badge>
                {importStatus.failed > 0 && (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <Badge variant="destructive">
                      {importStatus.failed} fehlgeschlagen
                    </Badge>
                  </>
                )}
              </div>

              {importStatus.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-red-600 mb-1">Fehler:</p>
                  {importStatus.errors.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs text-red-500">
                      • {error}
                    </p>
                  ))}
                  {importStatus.errors.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      ... und {importStatus.errors.length - 5} weitere
                    </p>
                  )}
                </div>
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