import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Syringe, Clock } from "lucide-react";
import { Protocol } from "@/hooks/useProtocols";

interface ActiveProtocolsGridProps {
  protocols: Protocol[];
}

const SUBSTANCE_DISPLAY: Record<string, { name: string; color: string }> = {
  'retatrutid': { name: 'Retatrutid', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  'cjc_1295_ipamorelin': { name: 'CJC/Ipamorelin', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  'bpc_157': { name: 'BPC-157', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  'tb_500': { name: 'TB-500', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'trt': { name: 'TRT', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function ActiveProtocolsGrid({ protocols }: ActiveProtocolsGridProps) {
  if (protocols.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Syringe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Keine aktiven Protokolle</p>
          <p className="text-xs text-muted-foreground mt-1">
            Erstelle ein Protokoll um zu starten
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {protocols.map((protocol) => {
        // Use protocol.name or first peptide name for display
        const protocolName = protocol.name || protocol.peptides[0]?.name || 'Unbekannt';
        const substanceKey = protocolName.toLowerCase().replace(/[\s\/]/g, '_');
        const substance = SUBSTANCE_DISPLAY[substanceKey] || {
          name: protocolName,
          color: 'bg-muted text-muted-foreground border-border',
        };

        // Get current dose from first peptide entry
        const currentDose = protocol.peptides[0]?.dose || 0;
        const currentUnit = protocol.peptides[0]?.unit || 'mcg';

        return (
          <Card key={protocol.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary/10">
                    <Syringe className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{substance.name}</span>
                </div>
                <Badge variant="outline" className={substance.color}>
                  Aktiv
                </Badge>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {currentDose} {currentUnit}
                  </span>
                  <span>•</span>
                  <span>{protocol.timing}</span>
                </div>

                {protocol.cycle_pattern && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {protocol.cycle_pattern.type === 'daily' && 'Täglich'}
                      {protocol.cycle_pattern.type === 'on_off' && 
                        `${protocol.cycle_pattern.days_on} Tage an / ${protocol.cycle_pattern.days_off} Tage Pause`}
                      {protocol.cycle_pattern.type === 'weekly' && 'Wöchentlich'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
