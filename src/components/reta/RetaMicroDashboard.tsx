import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRetaMicro, getSiteLabel } from "@/hooks/useRetaMicro";
import { RetaMicroDoseCard } from "./RetaMicroDoseCard";
import { RetaMicroLogForm } from "./RetaMicroLogForm";
import { RetaMicroIntervalChart } from "./RetaMicroIntervalChart";
import { RetaMicroSideEffectsTracker } from "./RetaMicroSideEffectsTracker";
import { Plus, Syringe, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export function RetaMicroDashboard() {
  const { logs, loading, getStats, isDue, refetch } = useRetaMicro();
  const [showLogForm, setShowLogForm] = useState(false);

  const stats = getStats();
  const isOverdue = isDue();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Lade Reta Micro Daten...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Syringe className="w-5 h-5" />
            Reta Micro Tracker
          </h2>
          <p className="text-sm text-muted-foreground">
            Retatrutid Microdosing (0.5-1mg alle 10-14 Tage)
          </p>
        </div>
        <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
          <DialogTrigger asChild>
            <Button className={isOverdue ? 'animate-pulse' : ''}>
              <Plus className="w-4 h-4 mr-2" />
              Dosis loggen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <RetaMicroLogForm
              onSuccess={() => {
                setShowLogForm(false);
                refetch();
              }}
              onCancel={() => setShowLogForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert if overdue */}
      {isOverdue && (
        <Card className="border-amber-500 bg-amber-500/10">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-600">Nächste Dosis fällig!</p>
              <p className="text-sm text-muted-foreground">
                Das Ziel-Intervall von 10-14 Tagen ist überschritten.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowLogForm(true)}>
              Jetzt loggen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Gesamt</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalDoses}</div>
            <div className="text-xs text-muted-foreground">Dosen</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ø Intervall</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.averageInterval > 0 ? stats.averageInterval.toFixed(1) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Tage</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ø Appetit</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.averageAppetiteScore !== null ? stats.averageAppetiteScore.toFixed(1) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">/10</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">GI-Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {Math.round(stats.giStats.occurrenceRate * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">mit Nebenwirkungen</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dose Card */}
        <div>
          <RetaMicroDoseCard />
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="intervals" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="intervals">Intervalle</TabsTrigger>
              <TabsTrigger value="sideeffects">Nebenwirkungen</TabsTrigger>
            </TabsList>

            <TabsContent value="intervals" className="mt-4">
              <RetaMicroIntervalChart />
            </TabsContent>

            <TabsContent value="sideeffects" className="mt-4">
              <RetaMicroSideEffectsTracker />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* History */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Letzte Dosen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.slice(0, 5).map((log, index) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === 0 ? 'bg-accent/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Syringe className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-medium">{log.dose_mg}mg</div>
                      <div className="text-xs text-muted-foreground">
                        {log.injected_at && format(new Date(log.injected_at), 'dd. MMM yyyy', { locale: de })}
                        {' • '}
                        {getSiteLabel(log.injection_site)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.appetite_score && (
                      <Badge variant="outline" className="text-xs">
                        Appetit: {log.appetite_score}/10
                      </Badge>
                    )}
                    {log.gi_side_effects && log.gi_side_effects.length > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-600/50">
                        GI: {log.gi_side_effects.length}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
