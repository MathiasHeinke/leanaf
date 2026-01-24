import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Infinity, 
  Leaf, 
  Calendar,
  TrendingUp,
  Heart,
  Timer,
  Sparkles
} from 'lucide-react';

export function Phase3Overview() {
  // TODO: Calculate from real bloodwork data
  const bioAge = 35;
  const chronoAge = 42;
  const dunedinPace = 0.85;

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

      {/* Bio-Age Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <CardTitle className="text-lg">Biologisches Alter</CardTitle>
          </div>
          <CardDescription>
            Basierend auf deinen Biomarkern (HbA1c, hsCRP, LDL)
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    className="text-emerald-500"
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
              <Badge className="mt-2 bg-emerald-500">
                -{chronoAge - bioAge} Jahre
              </Badge>
            </div>

            {/* DunedinPACE */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">DunedinPACE</span>
                  <span className="text-sm">{dunedinPace}</span>
                </div>
                <Progress value={(1 - dunedinPace) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  &lt;0.85 = langsamer als normal altern
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <Sparkles className="w-4 h-4 inline mr-1 text-purple-500" />
                Du alterst ~15% langsamer als der Durchschnitt
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Senolytic Protocol */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            <CardTitle className="text-lg">Senolytika-Protokoll</CardTitle>
          </div>
          <CardDescription>
            "Hit-and-Run" zur Eliminierung seneszenter Zellen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Fisetin (Mayo-Protokoll)</span>
              <Badge variant="outline" className="text-green-500 border-green-500">
                Senolytikum
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dosis</span>
                <span>20mg/kg Körpergewicht</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dauer</span>
                <span>2-3 Tage konsekutiv</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Frequenz</span>
                <span>1x pro Monat</span>
              </div>
            </div>
            
            <div className="mt-4 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-sm">
              ⚠️ Nüchtern einnehmen, nicht mit Quercetin kombinieren
            </div>
          </div>
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
              title="Prolongiertes Fasten"
              frequency="Alle 3-6 Monate"
              dose="5-7 Tage"
              note="Autophagie"
            />
            <MaintenanceItem 
              title="Fisetin-Zyklus"
              frequency="1x pro Monat"
              dose="20mg/kg, 2-3 Tage"
              note="Senolytik"
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
