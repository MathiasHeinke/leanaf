import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bot, 
  Clock, 
  Play, 
  Pause, 
  Settings, 
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  AlertTriangle
} from "lucide-react";

interface PipelineConfig {
  id: string;
  pipeline_name: string;
  is_enabled: boolean;
  interval_minutes: number;
  max_entries_per_run: number;
  last_run_at: string | null;
  next_run_at: string | null;
  failure_count: number;
  max_failures: number;
  config_data: {
    areas: string[];
    batch_rotation: boolean;
    models: string[];
  };
}

interface PipelineRun {
  id: string;
  pipeline_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  entries_processed: number;
  entries_successful: number;
  entries_failed: number;
  error_message?: string;
  execution_time_ms?: number;
  metadata: Record<string, any>;
}

interface PipelineStatus {
  config: PipelineConfig | null;
  recent_runs: PipelineRun[];
  status: {
    is_enabled: boolean;
    last_run_at: string | null;
    next_run_at: string | null;
    failure_count: number;
  };
}

export const AutomatedPipelineManager: React.FC = () => {
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [configEdit, setConfigEdit] = useState({
    interval_minutes: 30,
    max_entries_per_run: 5,
    max_failures: 3
  });
  const { toast } = useToast();

  const loadPipelineStatus = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('automated-rag-pipeline', {
        body: { action: 'get_status' }
      });

      if (error) throw error;

      if (data.success) {
        setPipelineStatus(data);
        
        if (data.config) {
          setConfigEdit({
            interval_minutes: data.config.interval_minutes,
            max_entries_per_run: data.config.max_entries_per_run,
            max_failures: data.config.max_failures
          });
        }
      }
    } catch (error) {
      console.error('Error loading pipeline status:', error);
      toast({
        title: "Fehler beim Laden",
        description: "Pipeline-Status konnte nicht geladen werden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineStatus();
    
    // Auto-refresh alle 30 Sekunden
    const interval = setInterval(loadPipelineStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePipeline = async (enabled: boolean) => {
    try {
      setIsUpdating(true);
      
      const { data, error } = await supabase.functions.invoke('automated-rag-pipeline', {
        body: { 
          action: 'update_config',
          config_update: { is_enabled: enabled }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: enabled ? "Pipeline aktiviert" : "Pipeline deaktiviert",
          description: enabled ? "Automatische Datensammlung läuft" : "Automatische Datensammlung gestoppt",
        });
        
        await loadPipelineStatus();
      }
    } catch (error) {
      console.error('Error toggling pipeline:', error);
      toast({
        title: "Fehler",
        description: "Pipeline-Status konnte nicht geändert werden",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      setIsUpdating(true);
      
      const { data, error } = await supabase.functions.invoke('automated-rag-pipeline', {
        body: { 
          action: 'update_config',
          config_update: {
            interval_minutes: configEdit.interval_minutes,
            max_entries_per_run: configEdit.max_entries_per_run,
            max_failures: configEdit.max_failures,
            next_run_at: new Date(Date.now() + configEdit.interval_minutes * 60 * 1000).toISOString()
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Konfiguration aktualisiert",
          description: `Neue Einstellungen gespeichert`,
        });
        
        await loadPipelineStatus();
      }
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: "Fehler",
        description: "Konfiguration konnte nicht gespeichert werden",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManualRun = async () => {
    try {
      setIsRunning(true);
      
      toast({
        title: "Pipeline gestartet",
        description: "Sammle neue wissenschaftliche Erkenntnisse...",
      });

      const { data, error } = await supabase.functions.invoke('automated-rag-pipeline', {
        body: { action: 'run_pipeline' }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Pipeline erfolgreich ausgeführt",
          description: `${data.entries_successful} neue Einträge in ${data.execution_time_ms}ms`,
        });
        
        await loadPipelineStatus();
      } else {
        toast({
          title: "Pipeline-Fehler",
          description: data.message || "Unbekannter Fehler",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error running pipeline:', error);
      toast({
        title: "Fehler",
        description: "Pipeline konnte nicht ausgeführt werden",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getNextRunTime = () => {
    if (!pipelineStatus?.status.next_run_at) return 'Nicht geplant';
    
    const nextRun = new Date(pipelineStatus.status.next_run_at);
    const now = new Date();
    const diffMs = nextRun.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Überfällig';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) return `in ${diffMinutes} Min.`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `in ${diffHours}h ${diffMinutes % 60}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Pipeline wird geladen...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Automatisierte RAG-Pipeline
          </CardTitle>
          <CardDescription>
            Sammelt automatisch alle {pipelineStatus?.config?.interval_minutes || 30} Minuten neue wissenschaftliche Erkenntnisse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {pipelineStatus?.status.is_enabled ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Aktiv
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Pause className="w-3 h-3" />
                    Inaktiv
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">Status</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{getNextRunTime()}</div>
              <div className="text-xs text-muted-foreground">Nächster Lauf</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {pipelineStatus?.config?.interval_minutes || 30}min
              </div>
              <div className="text-xs text-muted-foreground">Intervall</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-bold text-primary">
                {pipelineStatus?.status.failure_count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Fehler</div>
            </div>
          </div>

          {/* Failure Warning */}
          {pipelineStatus?.status.failure_count && pipelineStatus.status.failure_count > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pipeline hat {pipelineStatus.status.failure_count} Fehler. 
                Bei {pipelineStatus.config?.max_failures} Fehlern wird sie automatisch deaktiviert.
              </AlertDescription>
            </Alert>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={pipelineStatus?.status.is_enabled || false}
                onCheckedChange={handleTogglePipeline}
                disabled={isUpdating}
              />
              <Label>Pipeline aktiviert</Label>
            </div>
            
            <Button
              onClick={handleManualRun}
              disabled={isRunning}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Läuft...' : 'Manuell starten'}
            </Button>

            <Button
              onClick={loadPipelineStatus}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Aktualisieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Konfiguration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">Intervall (Minuten)</Label>
              <Input
                id="interval"
                type="number"
                min="5"
                max="1440"
                value={configEdit.interval_minutes}
                onChange={(e) => setConfigEdit(prev => ({
                  ...prev,
                  interval_minutes: parseInt(e.target.value) || 30
                }))}
              />
              <div className="text-xs text-muted-foreground">
                Mindestens 5 Minuten, maximal 24 Stunden
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_entries">Max. Einträge pro Lauf</Label>
              <Input
                id="max_entries"
                type="number"
                min="1"
                max="20"
                value={configEdit.max_entries_per_run}
                onChange={(e) => setConfigEdit(prev => ({
                  ...prev,
                  max_entries_per_run: parseInt(e.target.value) || 5
                }))}
              />
              <div className="text-xs text-muted-foreground">
                1-20 Einträge pro Ausführung
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_failures">Max. Fehler</Label>
              <Input
                id="max_failures"
                type="number"
                min="1"
                max="10"
                value={configEdit.max_failures}
                onChange={(e) => setConfigEdit(prev => ({
                  ...prev,
                  max_failures: parseInt(e.target.value) || 3
                }))}
              />
              <div className="text-xs text-muted-foreground">
                Automatische Deaktivierung nach X Fehlern
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleUpdateConfig}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            {isUpdating ? 'Speichere...' : 'Konfiguration speichern'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Letzte Ausführungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineStatus?.recent_runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Noch keine Ausführungen
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineStatus?.recent_runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="font-medium">
                        {new Date(run.started_at).toLocaleString('de-DE')}
                      </div>
                      {run.error_message && (
                        <div className="text-xs text-red-500">{run.error_message}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        {run.entries_successful}/{run.entries_processed}
                      </Badge>
                      {run.execution_time_ms && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(run.execution_time_ms / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Automatisierungs-Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Automatisiert:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Regelmäßige Datensammlung (Perplexity AI)</li>
                <li>• Automatische Embedding-Generierung</li>
                <li>• Intelligente Batch-Verarbeitung</li>
                <li>• Fehler-Monitoring & Recovery</li>
                <li>• Performance-Tracking</li>
                <li>• Selbstdeaktivierung bei Problemen</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🎯 Ergebnis:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Immer aktuelle Wissensbasis</li>
                <li>• Neueste wissenschaftliche Erkenntnisse</li>
                <li>• Kontinuierlich verbesserte Antworten</li>
                <li>• Minimal manuelle Wartung</li>
                <li>• Zuverlässige 24/7 Datensammlung</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};