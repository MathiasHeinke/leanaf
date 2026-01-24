import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Syringe, Check, Loader2 } from "lucide-react";
import { EpitalonCycle, useEpitalonCycles } from "@/hooks/useEpitalonCycles";
import { cn } from "@/lib/utils";

interface EpitalonInjectionLoggerProps {
  cycle: EpitalonCycle;
  onLogged: () => void;
}

const INJECTION_SITES = [
  {
    id: 'abdomen',
    label: 'Bauch',
    description: 'Links oder rechts vom Nabel',
    icon: '🔴',
  },
  {
    id: 'thigh',
    label: 'Oberschenkel',
    description: 'Vorderseite, mittleres Drittel',
    icon: '🟡',
  },
  {
    id: 'deltoid',
    label: 'Schulter',
    description: 'Seitlicher Deltamuskel',
    icon: '🔵',
  },
];

export function EpitalonInjectionLogger({ cycle, onLogged }: EpitalonInjectionLoggerProps) {
  const { logInjection } = useEpitalonCycles();
  
  // Recommend next site in rotation
  const rotationSites = cycle.injection_site_rotation || ['abdomen', 'thigh', 'deltoid'];
  const nextSiteIndex = cycle.injections_completed % rotationSites.length;
  const recommendedSite = rotationSites[nextSiteIndex];

  const [selectedSite, setSelectedSite] = useState(recommendedSite);
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    if (!selectedSite) return;

    setIsLogging(true);
    try {
      await logInjection(cycle.id, selectedSite, notes);
      onLogged();
    } finally {
      setIsLogging(false);
      setNotes('');
    }
  };

  return (
    <Card className="border-purple-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Syringe className="w-4 h-4 text-purple-500" />
          Tag {cycle.current_day} - Injektion loggen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosis-Anzeige */}
        <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-purple-500/10">
          <span className="text-2xl font-bold text-purple-500">{cycle.dose_mg}mg</span>
          <span className="text-sm text-muted-foreground">Epitalon subkutan</span>
        </div>

        {/* Site Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Injektionsort wählen</Label>
            <span className="text-xs text-muted-foreground">
              Empfohlen: {INJECTION_SITES.find(s => s.id === recommendedSite)?.label}
            </span>
          </div>

          <div className="grid gap-2">
            {INJECTION_SITES.map((site) => {
              const isRecommended = site.id === recommendedSite;
              const isSelected = site.id === selectedSite;
              const wasLast = site.id === cycle.last_injection_site;

              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => setSelectedSite(site.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    isSelected 
                      ? "border-purple-500 bg-purple-500/10" 
                      : "border-border hover:border-purple-500/50"
                  )}
                >
                  <span className="text-xl">{site.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{site.label}</div>
                    <div className="text-xs text-muted-foreground">{site.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isRecommended && (
                      <Badge variant="outline" className="text-xs text-purple-500 border-purple-500">
                        Empfohlen
                      </Badge>
                    )}
                    {wasLast && (
                      <Badge variant="secondary" className="text-xs">
                        Zuletzt
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notizen */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notizen (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. Uhrzeit, Besonderheiten..."
            rows={2}
          />
        </div>

        {/* Log Button */}
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={handleLog}
          disabled={isLogging || !selectedSite}
        >
          {isLogging ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Speichere...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Injektion geloggt (Tag {cycle.current_day}/{cycle.duration_days})
            </>
          )}
        </Button>

        {/* Reminder */}
        <p className="text-xs text-muted-foreground text-center">
          💡 Abends nehmen für beste Melatonin-Synergie
        </p>
      </CardContent>
    </Card>
  );
}
