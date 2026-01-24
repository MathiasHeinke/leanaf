import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Target, 
  Syringe, 
  Dumbbell, 
  Apple,
  Clock,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

export function Phase1Overview() {
  // TODO: Connect to real data from peptide_protocols and user stats
  
  return (
    <div className="space-y-6">
      {/* Phase 1 Header */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            <CardTitle>Phase 1: Aggressive Rekomposition</CardTitle>
          </div>
          <CardDescription>
            6 Monate intensive Transformation. Ziel: KFA unter 15%, Muskelmasse aufbauen, 
            metabolische Gesundheit optimieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Woche 1-24</Badge>
            <Badge variant="secondary">≈6 Monate</Badge>
          </div>
        </CardContent>
      </Card>

      {/* KFA Target Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">KFA-Ziel</CardTitle>
            </div>
            <Badge>Aktuell: ~18%</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>25%</span>
              <span className="font-medium text-emerald-500">15%</span>
              <span>10%</span>
            </div>
            <div className="relative">
              <Progress value={60} className="h-3" />
              <div 
                className="absolute top-0 h-3 w-1 bg-emerald-500" 
                style={{ left: '60%' }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Noch ~3% bis zum Ziel. Bei aktuellem Tempo: ~8 Wochen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Protocol */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Heutiger Plan</CardTitle>
          </div>
          <CardDescription>
            Dein Tagesplan für optimale Ergebnisse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Morning Stack */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-amber-500 border-amber-500">
                  08:00 - Morgens nüchtern
                </Badge>
              </div>
              <div className="space-y-2">
                <ProtocolItem 
                  name="CJC-1295 / Ipamorelin" 
                  dose="100mcg / 100mcg" 
                  type="peptide"
                />
                <ProtocolItem 
                  name="Berberin" 
                  dose="500mg" 
                  type="supplement"
                />
              </div>
            </div>

            {/* Pre-Workout */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-blue-500 border-blue-500">
                  15:30 - Pre-Workout
                </Badge>
              </div>
              <div className="space-y-2">
                <ProtocolItem 
                  name="Koffein + L-Theanin" 
                  dose="200mg + 100mg" 
                  type="supplement"
                />
                <ProtocolItem 
                  name="Citrullin" 
                  dose="6g" 
                  type="supplement"
                />
              </div>
            </div>

            {/* Evening */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-purple-500 border-purple-500">
                  21:00 - Abends
                </Badge>
              </div>
              <div className="space-y-2">
                <ProtocolItem 
                  name="BPC-157" 
                  dose="250mcg" 
                  type="peptide"
                />
                <ProtocolItem 
                  name="TB-500" 
                  dose="2.5mg" 
                  type="peptide"
                  note="2x/Woche"
                />
              </div>
            </div>

            {/* Weekly */}
            <div className="p-3 rounded-lg border-2 border-dashed border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary">
                  Wöchentlich - Sonntag
                </Badge>
              </div>
              <div className="space-y-2">
                <ProtocolItem 
                  name="Retatrutid" 
                  dose="4mg" 
                  type="peptide"
                  note="Woche 6 - Titration"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Focus */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Training-Fokus</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">4x</div>
              <div className="text-xs text-muted-foreground">Krafttraining/Woche</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">180+</div>
              <div className="text-xs text-muted-foreground">Min Zone 2</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">1x</div>
              <div className="text-xs text-muted-foreground">VO2max</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">RPT-Fokus:</span> Reverse Pyramid Training für maximale Kraftentwicklung bei Kaloriendefizit.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Ernährung</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Protein</span>
              <span className="font-medium">≥2g/kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Kalorien</span>
              <span className="font-medium">TDEE - 500kcal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Essens-Fenster</span>
              <span className="font-medium">16:00 - 21:00 (5h)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtocolItem({ 
  name, 
  dose, 
  type, 
  note 
}: { 
  name: string; 
  dose: string; 
  type: 'peptide' | 'supplement'; 
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Syringe className={`w-4 h-4 ${type === 'peptide' ? 'text-purple-500' : 'text-emerald-500'}`} />
        <span className="text-sm">{name}</span>
        {note && (
          <Badge variant="outline" className="text-xs">
            {note}
          </Badge>
        )}
      </div>
      <span className="text-sm font-medium">{dose}</span>
    </div>
  );
}
