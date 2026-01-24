import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NADProtocolCard } from "./NADProtocolCard";
import { CreateNADProtocolForm } from "./CreateNADProtocolForm";
import { useNADTracking } from "@/hooks/useNADTracking";
import { Battery, Plus, TestTube, Info, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function NADDashboard() {
  const { protocol, bloodLevels, loading, refetch } = useNADTracking();
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        <span className="ml-2">Lade NAD+ Daten...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Battery className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold">NAD+ Tracking</h2>
        </div>
        {protocol && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <TestTube className="h-4 w-4 mr-1" />
                Blutwert hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <p className="text-center text-muted-foreground p-4">
                Blutwert-Formular kommt bald...
              </p>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 flex items-start gap-2">
        <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
        <p className="text-sm text-orange-800">
          <strong>NAD+ Booster:</strong> Unterstützt DNA-Reparatur und Sirtuin-Aktivität.
          Täglich morgens nüchtern für beste Absorption.
        </p>
      </div>

      {/* Main Content */}
      {protocol ? (
        <div className="grid gap-4 md:grid-cols-2">
          <NADProtocolCard protocol={protocol} onLogged={refetch} />

          {/* Blood Levels Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                NAD+ Blutwerte
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bloodLevels.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Noch keine Blutwerte erfasst</p>
                  <p className="text-xs mt-1">
                    NAD+ Tests sind optional, aber hilfreich für die Optimierung
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bloodLevels.slice(0, 5).map((level) => (
                    <div 
                      key={level.id} 
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <span className="text-sm">
                        {format(new Date(level.measured_at), 'dd. MMM', { locale: de })}
                      </span>
                      {level.nad_level ? (
                        <Badge variant="outline">
                          {level.nad_level} {level.nad_unit}
                        </Badge>
                      ) : level.lactate_pyruvate_ratio ? (
                        <Badge variant="outline">
                          L/P Ratio: {level.lactate_pyruvate_ratio.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : showCreateForm ? (
        <CreateNADProtocolForm 
          onSuccess={() => {
            setShowCreateForm(false);
            refetch();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Battery className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Kein NAD+ Protokoll aktiv</p>
            <Button onClick={() => setShowCreateForm(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              NAD+ Protokoll erstellen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hallmarks Addressed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Adressierte Hallmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['Genomische Instabilität', 'Epigenetische Veränderungen', 'Mitochondriale Dysfunktion'].map((hallmark) => (
              <Badge key={hallmark} variant="secondary" className="bg-orange-100 text-orange-800">
                {hallmark}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
