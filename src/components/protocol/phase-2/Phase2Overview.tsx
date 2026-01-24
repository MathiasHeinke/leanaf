import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, 
  Flame, 
  Brain,
  Dna,
  Zap
} from 'lucide-react';
import { MitochondrialDashboard } from '@/components/mitochondrial';

export function Phase2Overview() {
  return (
    <div className="space-y-6">
      {/* Phase 2 Header */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            <CardTitle>Phase 2: Fine-Tuning</CardTitle>
          </div>
          <CardDescription>
            3-4 Monate Feinschliff. Mitochondrien optimieren, Telomere schützen, 
            kognitive Performance steigern.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Woche 25-40</Badge>
            <Badge variant="secondary">≈3-4 Monate</Badge>
            <Badge className="bg-blue-500">Ziel: 15-18% KFA</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Phase 2 Tabs */}
      <Tabs defaultValue="mitochondrial">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mitochondrial" className="flex items-center gap-1">
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline">Mito</span>
          </TabsTrigger>
          <TabsTrigger value="epitalon" className="flex items-center gap-1">
            <Dna className="w-4 h-4" />
            <span className="hidden sm:inline">Epitalon</span>
          </TabsTrigger>
          <TabsTrigger value="nootropics" className="flex items-center gap-1">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Nootropics</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-1">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Training</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mitochondrial" className="mt-6">
          <MitochondrialDashboard />
        </TabsContent>

        <TabsContent value="epitalon" className="mt-6">
          <EpitalonPlaceholder />
        </TabsContent>

        <TabsContent value="nootropics" className="mt-6">
          <NootropicsPlaceholder />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <TrainingPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EpitalonPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Dna className="w-5 h-5 text-purple-500" />
          <CardTitle className="text-lg">Telomer-Schutz (Khavinson-Protokoll)</CardTitle>
        </div>
        <CardDescription>
          Epitalon: 10mg täglich für 10-20 Tage, 2x pro Jahr
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Epitalon</span>
            <Badge variant="outline" className="text-purple-500 border-purple-500">
              Telomerase-Aktivator
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Aktiviert Telomerase, verlangsamt zelluläre Alterung.
          </p>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Dosis:</span> 10mg täglich</div>
            <div><span className="font-medium">Dauer:</span> 10-20 Tage</div>
            <div><span className="font-medium">Frequenz:</span> Alle 4-6 Monate</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Epitalon-Manager wird in Block C implementiert
        </p>
      </CardContent>
    </Card>
  );
}

function NootropicsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-cyan-500" />
          <CardTitle className="text-lg">Nootropic Stack</CardTitle>
        </div>
        <CardDescription>
          Kognitive Performance und Neuroplastizität
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Semax</span>
              <Badge variant="outline">BDNF ↑</Badge>
            </div>
            <div className="text-sm">
              400-600mcg nasal, morgens nüchtern
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Selank</span>
              <Badge variant="outline">Anxiolytisch</Badge>
            </div>
            <div className="text-sm">
              300-400mcg nasal, bei Bedarf
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <Zap className="w-4 h-4 inline mr-1" />
            Cycling: 4 Wochen on / 2 Wochen off
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Nootropic-Tracker wird in Block D implementiert
        </p>
      </CardContent>
    </Card>
  );
}

function TrainingPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Training-Anpassung Phase 2</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Intensität</span>
            <Badge className="bg-blue-500">+10% Gewicht</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Volumen</span>
            <span className="font-medium">Leicht reduziert</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Zone 2</span>
            <span className="font-medium">180-200 Min/Woche</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">VO2max</span>
            <span className="font-medium">2x/Woche (Norwegian 4x4)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
