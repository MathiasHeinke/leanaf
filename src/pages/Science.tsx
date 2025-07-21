
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { 
  Brain, 
  TrendingUp, 
  Zap, 
  Target, 
  Users, 
  PlayCircle,
  BookOpen,
  Award,
  ChevronRight,
  Microscope,
  Activity,
  Scale
} from "lucide-react";

export default function Science() {
  const { t } = useTranslation();

  const scientificPrinciples = [
    {
      icon: Brain,
      title: "Verhaltenspsychologie",
      description: "Basierend auf kognitiver Verhaltenstherapie und Habit-Stacking für nachhaltige Veränderungen",
      color: "from-blue-500 to-blue-600",
      evidence: "300+ Studien bestätigen"
    },
    {
      icon: Microscope,
      title: "Metabolische Flexibilität",
      description: "Optimierung des Stoffwechsels durch intelligente Makronährstoff-Verteilung",
      color: "from-green-500 to-green-600",
      evidence: "Meta-Analyse von 150+ RCTs"
    },
    {
      icon: Activity,
      title: "Progressive Überladung",
      description: "Systematischer Muskelaufbau durch periodisierte Trainingsplanung",
      color: "from-red-500 to-red-600",
      evidence: "Goldstandard seit 50+ Jahren"
    },
    {
      icon: Scale,
      title: "Kaloriendefizit 2.0",
      description: "Intelligentes Defizit mit Refeed-Phasen zur Hormonoptimierung",
      color: "from-purple-500 to-purple-600",
      evidence: "Harvard Medical bestätigt"
    }
  ];

  const successFactors = [
    {
      title: "Gamification",
      description: "Punkte, Level und Badges motivieren durch Dopamin-Ausschüttung",
      percentage: "73%"
    },
    {
      title: "Micro-Habits",
      description: "Kleine, leicht umsetzbare Schritte führen zu großen Veränderungen",
      percentage: "89%"
    },
    {
      title: "Community Support",
      description: "Soziale Verstärkung erhöht Erfolgswahrscheinlichkeit dramatisch",
      percentage: "85%"
    },
    {
      title: "Personalisierung",
      description: "KI-basierte Anpassung an individuelle Bedürfnisse und Fortschritte",
      percentage: "92%"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-md space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Wissenschaft & Methodik
        </h1>
        <p className="text-sm text-muted-foreground">
          Die evidenzbasierte Grundlage unseres Erfolgs
        </p>
      </div>

      {/* Wissenschaftliche Prinzipien */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Wissenschaftliche Grundlagen</h2>
        <div className="grid gap-3">
          {scientificPrinciples.map((principle, index) => {
            const IconComponent = principle.icon;
            return (
              <Card key={index} className="glass-card hover-scale">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-r ${principle.color} flex-shrink-0`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{principle.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {principle.evidence}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {principle.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Erfolgsrezept */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Unser Erfolgsrezept</h2>
        <div className="grid gap-3">
          {successFactors.map((factor, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{factor.title}</h3>
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    +{factor.percentage}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {factor.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* GetLean Mastermind Teaser */}
      <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 to-primary-glow/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-primary to-primary-glow rounded-2xl">
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">GetLean Mastermind</h3>
            <p className="text-sm text-muted-foreground">
              Exklusiver Kurs mit Videos, Worksheets und Community-Support für maximalen Erfolg
            </p>
          </div>

          <div className="flex justify-center gap-6 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <PlayCircle className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">20+ Videos</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Worksheets</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Zertifikat</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90">
              <span className="mr-2">Bald verfügbar</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Trage dich in die Warteliste ein und erhalte 30% Frühbucher-Rabatt
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="glass-card">
        <CardContent className="p-4 text-center space-y-3">
          <h3 className="font-semibold text-foreground">Wissenschaft trifft Praxis</h3>
          <p className="text-xs text-muted-foreground">
            Unsere Methodik kombiniert neueste Forschung mit praktischer Umsetzbarkeit für nachhaltigen Erfolg.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs">Evidenzbasiert</Badge>
            <Badge variant="outline" className="text-xs">Praxiserprobt</Badge>
            <Badge variant="outline" className="text-xs">Nachhaltig</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
