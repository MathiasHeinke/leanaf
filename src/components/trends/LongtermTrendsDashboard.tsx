import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useLongtermBioAge } from "@/hooks/useLongtermBioAge";
import { BioAgeInputForm } from "@/components/bioage/BioAgeInputForm";
import { BioAgeTrendChart } from "@/components/bioage/BioAgeTrendChart";
import { AgingRateCalculator } from "@/components/bioage/AgingRateCalculator";
import { HallmarkScoreCard } from "@/components/bioage/HallmarkScoreCard";
import { Plus, TrendingDown, TrendingUp, Minus, Calendar, Clock, Award } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LongtermTrendsDashboardProps {
  chronologicalAge?: number;
}

export function LongtermTrendsDashboard({ chronologicalAge = 40 }: LongtermTrendsDashboardProps) {
  const {
    measurements,
    latestMeasurement,
    loading,
    getAverageAgeDifference,
    getBestMeasurement,
    refetch,
  } = useLongtermBioAge();
  
  const [showAddForm, setShowAddForm] = useState(false);

  const avgDiff = getAverageAgeDifference();
  const bestMeasurement = getBestMeasurement();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Lade Bio-Age Daten...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Langzeit Bio-Age Tracking</h2>
          <p className="text-sm text-muted-foreground">
            Verfolge dein biologisches Alter über Monate und Jahre
          </p>
        </div>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Messung hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <BioAgeInputForm
              chronologicalAge={chronologicalAge}
              onSuccess={() => {
                setShowAddForm(false);
                refetch();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Bio-Age */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Aktuell</span>
            </div>
            <div className="text-2xl font-bold">
              {latestMeasurement?.biological_age ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground">Jahre Bio-Age</div>
          </CardContent>
        </Card>

        {/* Age Difference */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              {avgDiff < 0 ? (
                <TrendingDown className="w-4 h-4 text-green-600" />
              ) : avgDiff > 0 ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Ø Differenz</span>
            </div>
            <div className={`text-2xl font-bold ${
              avgDiff < 0 ? 'text-green-600' : avgDiff > 0 ? 'text-red-600' : ''
            }`}>
              {avgDiff > 0 ? '+' : ''}{avgDiff.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Jahre vs. Chrono</div>
          </CardContent>
        </Card>

        {/* Total Measurements */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Messungen</span>
            </div>
            <div className="text-2xl font-bold">{measurements.length}</div>
            <div className="text-xs text-muted-foreground">Gesamt erfasst</div>
          </CardContent>
        </Card>

        {/* Best Result */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-muted-foreground">Bestes</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {bestMeasurement?.biological_age ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {bestMeasurement?.measured_at
                ? format(new Date(bestMeasurement.measured_at), 'MMM yy', { locale: de })
                : 'Jahre'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <BioAgeTrendChart chronologicalAge={chronologicalAge} monthsToShow={12} />
        </div>

        {/* Aging Rate */}
        <div>
          <AgingRateCalculator />
        </div>
      </div>

      {/* Hallmarks */}
      <HallmarkScoreCard />

      {/* Recent Measurements */}
      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Letzte Messungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {measurements.slice(0, 5).map((m, index) => {
                const diff = m.age_difference || 0;
                const TrendIcon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus;
                const trendColor = diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-muted-foreground';

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index === 0 ? 'bg-accent/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Bio-Age: {m.biological_age}</span>
                          <span className={`text-sm ${trendColor}`}>
                            ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {m.measured_at && format(new Date(m.measured_at), 'dd. MMM yyyy', { locale: de })}
                          {m.dunedin_pace && ` • PACE: ${m.dunedin_pace.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {m.test_type || 'Test'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
