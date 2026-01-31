import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Infinity, 
  Leaf, 
  Calendar,
  TrendingUp,
  Heart,
  Sparkles,
  Pill,
  Utensils,
  Syringe,
  Plus,
  AlertCircle
} from 'lucide-react';
import { SenolytDashboard } from '@/components/senolytic';
import { MaintenanceDashboard } from '@/components/maintenance';
import { ExtendedFastingDashboard } from '@/components/fasting';
import { LongtermTrendsDashboard } from '@/components/trends';
import { RapamycinDashboard } from '@/components/rapamycin';
import { useBioAge } from '@/hooks/useBioAge';
import { Link } from 'react-router-dom';

export function Phase3Overview() {
  const { latestMeasurement, loading } = useBioAge();
  
  // Live data with fallbacks
  const bioAge = latestMeasurement?.calculated_bio_age ?? null;
  const chronoAge = latestMeasurement?.chronological_age ?? 40;
  const dunedinPace = latestMeasurement?.dunedin_pace ?? null;
  const ageDiff = bioAge !== null ? chronoAge - bioAge : null;

  return (
    <div className="space-y-6">
      {/* Phase 3 Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Infinity className="w-5 h-5 text-purple-500" />
            <CardTitle>Phase 3: Longevity & Maintenance</CardTitle>
          </div>
          <CardDescription>
            Lebenslanges Protokoll. Ziel: Biologisches Alter minimieren, 
            alle 12 Hallmarks of Aging adressieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Ab Woche 40+</Badge>
            <Badge variant="secondary">∞ Unbegrenzt</Badge>
            <Badge className="bg-purple-500">Maintenance-Modus</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 mr-1 hidden sm:inline" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="senolytic" className="text-xs sm:text-sm">
            <Leaf className="w-4 h-4 mr-1 hidden sm:inline" />
            Senolytika
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs sm:text-sm">
            <Pill className="w-4 h-4 mr-1 hidden sm:inline" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="rapamycin" className="text-xs sm:text-sm">
            <Syringe className="w-4 h-4 mr-1 hidden sm:inline" />
            Rapamycin
          </TabsTrigger>
          <TabsTrigger value="fasting" className="text-xs sm:text-sm">
            <Utensils className="w-4 h-4 mr-1 hidden sm:inline" />
            Fasten
          </TabsTrigger>
          <TabsTrigger value="bioage" className="text-xs sm:text-sm">
            <Heart className="w-4 h-4 mr-1 hidden sm:inline" />
            Bio-Age
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Bio-Age Widget */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-destructive" />
                <CardTitle className="text-lg">Biologisches Alter</CardTitle>
              </div>
              <CardDescription>
                Basierend auf deinen Biomarkern (DunedinPACE / Proxy-Berechnung)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 gap-6">
                  <Skeleton className="h-32 w-32 mx-auto rounded-full" />
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ) : bioAge === null ? (
                // Empty state - no measurements yet
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Noch keine Bio-Age Messung</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Führe einen DunedinPACE Epigenetik-Test durch oder nutze die Proxy-Berechnung 
                    basierend auf Blutmarkern (HbA1c, hsCRP, Lipide).
                  </p>
                  <Link to="/protocol?tab=bioage">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Bio-Age hinzufügen
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {/* Bio Age Gauge */}
                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${(bioAge / chronoAge) * 352} 352`}
                          className={ageDiff !== null && ageDiff > 0 ? "text-emerald-500" : "text-amber-500"}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{bioAge}</span>
                        <span className="text-xs text-muted-foreground">Jahre</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        Chronologisch: {chronoAge}
                      </span>
                    </div>
                    {ageDiff !== null && (
                      <Badge className={ageDiff > 0 ? "mt-2 bg-emerald-500" : "mt-2 bg-amber-500"}>
                        {ageDiff > 0 ? `-${ageDiff}` : `+${Math.abs(ageDiff)}`} Jahre
                      </Badge>
                    )}
                  </div>

                  {/* DunedinPACE or Interpretation */}
                  <div className="space-y-4">
                    {dunedinPace !== null ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">DunedinPACE</span>
                            <span className="text-sm font-mono">{dunedinPace.toFixed(2)}</span>
                          </div>
                          <Progress value={(1 - Math.min(dunedinPace, 1.5) / 1.5) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {dunedinPace < 0.85 ? '< 0.85 = langsamer als normal altern' : 
                             dunedinPace < 1.0 ? '< 1.0 = leicht verlangsamt' : 
                             '≥ 1.0 = normale oder beschleunigte Alterung'}
                          </p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-muted/50 text-sm">
                          <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                          {dunedinPace < 0.85 
                            ? `Du alterst ~${Math.round((1 - dunedinPace) * 100)}% langsamer als der Durchschnitt`
                            : dunedinPace < 1.0
                            ? `Du alterst leicht langsamer als der Durchschnitt`
                            : `Optimierungspotenzial vorhanden`
                          }
                        </div>
                      </>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          Bio-Age basiert auf Proxy-Berechnung (Blutmarker). 
                          Für genauere Ergebnisse: DunedinPACE Epigenetik-Test durchführen.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Maintenance-Kalender</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <MaintenanceItem 
                  title="Fisetin-Zyklus"
                  frequency="1x pro Monat"
                  dose="20mg/kg, 2-3 Tage"
                  note="Senolytik"
                />
                <MaintenanceItem 
                  title="Retatrutid Microdosing"
                  frequency="Alle 10-14 Tage"
                  dose="0.5-1mg"
                  note="Gewichtserhalt"
                />
                <MaintenanceItem 
                  title="Epitalon-Zyklus"
                  frequency="Alle 4-6 Monate"
                  dose="10mg täglich, 10-20 Tage"
                  note="Telomere"
                />
                <MaintenanceItem 
                  title="Rapamycin"
                  frequency="Wöchentlich (8 on/4 off)"
                  dose="5-6mg"
                  note="mTOR"
                />
                <MaintenanceItem 
                  title="Prolongiertes Fasten"
                  frequency="Alle 3-6 Monate"
                  dose="5-7 Tage"
                  note="Autophagie"
                />
              </div>
            </CardContent>
          </Card>

          {/* Hallmarks Coverage */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Hallmarks of Aging</CardTitle>
              </div>
              <CardDescription>
                12 von 12 Hallmarks adressiert
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  'Genomische Instabilität',
                  'Telomer-Verkürzung',
                  'Epigenetische Änderungen',
                  'Proteostase-Verlust',
                  'Nährstoff-Sensing',
                  'Mitochondrien-Dysfunktion',
                  'Zelluläre Seneszenz',
                  'Stammzell-Erschöpfung',
                  'Veränderte Kommunikation',
                  'Disabled Autophagie',
                  'Chronische Entzündung',
                  'Dysbiose'
                ].map((hallmark, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="justify-center text-xs py-1 text-emerald-500 border-emerald-500/50"
                  >
                    ✓
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Das ARES-Protokoll adressiert alle 12 Hallmarks of Aging
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Senolytic Tab */}
        <TabsContent value="senolytic" className="mt-6">
          <SenolytDashboard />
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceDashboard />
        </TabsContent>

        {/* Rapamycin Tab */}
        <TabsContent value="rapamycin" className="mt-6">
          <RapamycinDashboard />
        </TabsContent>

        {/* Fasting Tab */}
        <TabsContent value="fasting" className="mt-6">
          <ExtendedFastingDashboard />
        </TabsContent>

        {/* Bio-Age Tab */}
        <TabsContent value="bioage" className="mt-6">
          <LongtermTrendsDashboard chronologicalAge={chronoAge} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MaintenanceItem({ 
  title, 
  frequency, 
  dose, 
  note 
}: { 
  title: string; 
  frequency: string; 
  dose: string; 
  note: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{frequency}</div>
      </div>
      <div className="text-right">
        <div className="text-sm">{dose}</div>
        <Badge variant="outline" className="text-xs">{note}</Badge>
      </div>
    </div>
  );
}
