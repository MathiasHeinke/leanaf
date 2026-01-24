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
import { EpitalonDashboard } from '@/components/epitalon';
import { NootropicDashboard } from '@/components/nootropic';

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
          <EpitalonDashboard />
        </TabsContent>

        <TabsContent value="nootropics" className="mt-6">
          <NootropicDashboard />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <TrainingPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
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
