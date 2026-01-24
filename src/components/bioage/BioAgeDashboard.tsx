import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useBioAge } from "@/hooks/useBioAge";
import { BioAgeWidget } from "./BioAgeWidget";
import { AddDunedinPaceForm } from "./AddDunedinPaceForm";
import { AddProxyBioAgeForm } from "./AddProxyBioAgeForm";
import { Plus, Sparkles, Calculator, Clock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface BioAgeDashboardProps {
  chronologicalAge?: number;
}

export function BioAgeDashboard({ chronologicalAge = 35 }: BioAgeDashboardProps) {
  const { measurements, loading } = useBioAge();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formType, setFormType] = useState<'dunedin' | 'proxy' | null>(null);

  const handleOpenDialog = (type: 'dunedin' | 'proxy') => {
    setFormType(type);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormType(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bio-Age Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Verfolge dein biologisches Alter mit DunedinPACE oder Proxy-Berechnung
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormType(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Messung hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            {formType === null ? (
              <>
                <DialogHeader>
                  <DialogTitle>Messung hinzufügen</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 py-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => setFormType('dunedin')}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">DunedinPACE Test</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      Echtes epigenetisches Testergebnis von TruDiagnostic, Elysium etc.
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => setFormType('proxy')}
                  >
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Proxy aus Blutwerten</span>
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      Schätzung basierend auf HbA1c, hsCRP, Lipidprofil
                    </span>
                  </Button>
                </div>
              </>
            ) : formType === 'dunedin' ? (
              <AddDunedinPaceForm
                chronologicalAge={chronologicalAge}
                onSuccess={handleCloseDialog}
                onCancel={handleCloseDialog}
              />
            ) : (
              <AddProxyBioAgeForm
                chronologicalAge={chronologicalAge}
                onSuccess={handleCloseDialog}
                onCancel={handleCloseDialog}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Widget */}
      <BioAgeWidget chronologicalAge={chronologicalAge} />

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Messverlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Lade...</div>
          ) : measurements.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Noch keine Messungen vorhanden
            </div>
          ) : (
            <div className="space-y-3">
              {measurements.slice(0, 5).map((m, index) => {
                const bioAge = m.calculated_bio_age || chronologicalAge;
                const ageDiff = m.age_difference || 0;
                const TrendIcon = ageDiff < 0 ? TrendingDown : ageDiff > 0 ? TrendingUp : Minus;
                const trendColor = ageDiff < 0 ? 'text-green-600' : ageDiff > 0 ? 'text-red-600' : 'text-muted-foreground';
                const isDunedin = m.measurement_type === 'dunedin_pace';

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index === 0 ? 'bg-accent/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isDunedin ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {isDunedin ? (
                          <Sparkles className="w-4 h-4 text-purple-500" />
                        ) : (
                          <Calculator className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Bio-Age: {bioAge}</span>
                          <span className={`text-sm ${trendColor}`}>
                            ({ageDiff > 0 ? '+' : ''}{ageDiff})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.measured_at && format(new Date(m.measured_at), 'dd. MMM yyyy', { locale: de })}
                          {isDunedin && m.dunedin_pace && ` • PACE: ${m.dunedin_pace.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isDunedin ? 'default' : 'secondary'}>
                        {isDunedin ? 'DunedinPACE' : 'Proxy'}
                      </Badge>
                      <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
