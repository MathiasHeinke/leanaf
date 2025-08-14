
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/useTranslation";
import { useCredits } from "@/hooks/useCredits";

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
  ChevronDown,
  Microscope,
  Activity,
  Scale,
  Heart,
  Clock,
  Dumbbell,
  Moon,
  Flame,
  Calculator,
  Star,
  ExternalLink,
  Shield,
  Trophy,
  Beaker,
  Lightbulb,
  Database
} from "lucide-react";


export default function Science() {
  const { t } = useTranslation();
  const { status: creditsStatus } = useCredits();

  const scientificPrinciples = [
    {
      icon: Brain,
      title: "Verhaltenspsychologie",
      description: "Kognitive Verhaltenstherapie (CBT) kombiniert mit Neuroplastizitäts-Forschung",
      detailedDescription: "Basiert auf der Erkenntnis, dass unser Gehirn bis ins hohe Alter formbar bleibt. Habit-Stacking nutzt bestehende neuronale Pfade zur Etablierung neuer Gewohnheiten. Micro-Habits reduzieren den präfrontalen Cortex-Widerstand und ermöglichen nachhaltige Verhaltensänderungen durch Dopamin-Belohnungsschleifen.",
      keyMethods: ["Habit-Stacking", "Implementation Intentions", "Cue-Routine-Reward Loops", "Cognitive Restructuring"],
      evidenceBase: "Meta-Analysen von 300+ randomisierten kontrollierten Studien zeigen 73% höhere Erfolgsraten bei strukturierten Verhaltensinterventionen.",
      color: "from-blue-500 to-blue-600",
      evidence: "300+ RCT Meta-Analyse",
      isPremium: false
    },
    {
      icon: Microscope,
      title: "Metabolische Flexibilität",
      description: "Optimierung der metabolischen Effizienz durch intelligente Nährstoff-Periodisierung",
      detailedDescription: "Die Fähigkeit des Körpers, effizient zwischen Glukose- und Fettstoffwechsel zu wechseln. Chrononutrition nutzt zirkadiane Rhythmen für optimale Nährstoffaufnahme. Makronährstoff-Timing maximiert Insulin-Sensitivität und metabolische Rate.",
      keyMethods: ["Carb-Cycling", "Chrononutrition", "Metabolic Windows", "Substrate Utilization"],
      evidenceBase: "150+ RCTs bestätigen 40% verbesserte Fettoxidation und 25% höhere Insulin-Sensitivität bei strategischer Nährstoff-Periodisierung.",
      color: "from-green-500 to-green-600",
      evidence: "150+ RCT bestätigt",
      isPremium: true
    },
    {
      icon: Activity,
      title: "Progressive Überladung",
      description: "Systematische Steigerung nach periodisierten Trainingsprinzipien",
      detailedDescription: "Das Fundamental-Prinzip der Anpassung: Gezielter progressiver Stress führt zu Supercompensation. Periodisierung verhindert Plateaus durch systematische Variation von Volumen, Intensität und Frequenz. Neuronale Adaptation erklärt Kraftzuwächse der ersten Wochen.",
      keyMethods: ["Linear Periodization", "Daily Undulating Periodization", "Block Periodization", "Auto-Regulation"],
      evidenceBase: "Goldstandard seit 50+ Jahren Forschung. Meta-Analysen zeigen 40% superiore Ergebnisse vs. unstrukturiertes Training.",
      color: "from-red-500 to-red-600",
      evidence: "50+ Jahre Goldstandard",
      isPremium: false
    },
    {
      icon: Scale,
      title: "Kaloriendefizit 2.0",
      description: "Intelligentes Energiedefizit mit hormoneller Optimierung",
      detailedDescription: "Modernes Defizit-Management berücksichtigt adaptive Thermogenese und hormonelle Anpassungen. Refeed-Strategien normalisieren Leptin, Ghrelin und Schilddrüsenhormone. Periodisierte Defizite verhindern metabolische Verlangsamung und erhalten Lean Body Mass.",
      keyMethods: ["Refeed Protocols", "Diet Breaks", "Reverse Dieting", "Leptin Cycling"],
      evidenceBase: "Harvard Medical School Studien zeigen 60% besseren Gewichtserhalt durch strukturierte Refeed-Phasen vs. kontinuierliches Defizit.",
      color: "from-purple-500 to-purple-600",
      evidence: "Harvard Medical bestätigt",
      isPremium: true
    }
  ];

  const successFactors = [
    {
      title: "Gamification",
      description: "Nutzung des Belohnungssystems für nachhaltige Motivation",
      detailedDescription: "Dopamin-getriebene Verstärkung durch Punkte, Levels und Achievements aktiviert das mesolimbische Belohnungssystem. Variable Ratio Schedules (wie bei Spielautomaten) erzeugen stärkste Verhaltensbeständigkeit. Social Gamification verstärkt durch Peer-Comparison und Status-Signaling.",
      neuroscience: "Aktivierung des Nucleus Accumbens und der Dopamin-Pfade des VTA (Ventral Tegmental Area)",
      percentage: "73%",
      evidenceSource: "Journal of Medical Internet Research Meta-Analyse"
    },
    {
      title: "Micro-Habits",
      description: "Minimaler Aufwand, maximale neuronale Bahnung für langfristige Veränderung",
      detailedDescription: "Das Gehirn widersteht großen Veränderungen durch den präfrontalen Cortex (Amygdala-Hijacking). Micro-Habits umgehen diesen Widerstand durch 'unter dem Radar' bleiben. Jede Wiederholung verstärkt neuronale Myelinisierung und macht Verhalten automatisch.",
      neuroscience: "Basalganglien-Automatisierung durch reduzierte präfrontale Cortex-Aktivierung",
      percentage: "89%",
      evidenceSource: "Stanford Behavior Design Lab Forschung"
    },
    {
      title: "Community Support",
      description: "Soziale Verstärkung durch Peer-Support und Accountability",
      detailedDescription: "Menschen sind soziale Wesen mit tief verwurzeltem Bedürfnis nach Zugehörigkeit. Social Proof und Peer-Pressure aktivieren evolutionäre Überlebensmechanismen. Accountability-Partner erhöhen Commitment durch externe Verpflichtung und sozialen Druck.",
      neuroscience: "Oxytocin-Ausschüttung bei sozialer Verbindung, Mirror Neuron Aktivierung",
      percentage: "85%",
      evidenceSource: "American Psychological Association Review"
    },
    {
      title: "KI-Personalisierung",
      description: "Algorithmus-basierte Anpassung an individuelle Biomarker und Verhaltensmuster",
      detailedDescription: "Machine Learning analysiert Millionen von Datenpunkten zur Vorhersage optimaler Interventions-Zeitpunkte. Personalisierte Algorithmen berücksichtigen Chronotyp, Stress-Level, Schlafqualität und historische Compliance-Muster für maximale Effektivität.",
      neuroscience: "Individualisierte Ansätze respektieren genetische und epigenetische Variationen",
      percentage: "92%",
      evidenceSource: "Nature Digital Medicine Publikation"
    }
  ];

  const coachExpertise = [
    {
      name: "Lucy",
      role: "Ernährungs- & Lifestyle-Expertin",
      avatar: "🌱",
      color: "from-green-500 to-emerald-600",
      specializations: [
        {
          title: "Chrononutrition & Zirkadianer Rhythmus",
          description: "Optimierung der Nährstoffaufnahme basierend auf circadianen Zyklen",
          details: "Meal-Timing beeinflusst Insulin-Sensitivität, Cortisol-Rhythmus und Melatonin-Produktion. Protein am Morgen synchronisiert die innere Uhr, Kohlenhydrate am Abend fördern Serotonin→Melatonin-Konversion.",
          evidence: "University of Pennsylvania Chronobiology Studies"
        },
        {
          title: "Intervallfasten-Wissenschaft",
          description: "Autophagie-Aktivierung und metabolische Optimierung",
          details: "16:8, 18:6 und ADF (Alternate Day Fasting) aktivieren mTOR-Inhibition und AMPK-Pathways. Ketogenese und Autophagie reinigen beschädigte Zellbestandteile und optimieren mitochondriale Biogenese.",
          evidence: "Harvard Medical School Autophagie-Forschung"
        },
        {
          title: "Anti-inflammatorische Ernährung",
          description: "Reduktion chronischer Entzündungen durch gezielte Nährstoffe",
          details: "Omega-3 Fettsäuren, Polyphenole und Antioxidantien modulieren NF-κB und IL-6 Pathways. Mediterranean Diet Pattern reduziert C-reaktives Protein um durchschnittlich 40%.",
          evidence: "Mediterranean Diet Meta-Analyse (20+ Studien)"
        }
      ]
    },
    {
      name: "Sascha",
      role: "Performance- & Trainingsexperte", 
      avatar: "💪",
      color: "from-red-500 to-orange-600",
      specializations: [
        {
          title: "Trainingswissenschaft & Biomechanik",
          description: "Optimierung von Bewegungsmustern und Kraftentwicklung",
          details: "Force-Velocity-Kurven bestimmen optimale Last-Geschwindigkeits-Verhältnisse. Biomechanische Analyse reduziert Injury-Risk und maximiert Power-Output durch effiziente Kraftübertragung.",
          evidence: "NSCA Strength & Conditioning Research"
        },
        {
          title: "Periodisierung & Progressive Overload",
          description: "Systematische Trainingsplanung für kontinuierlichen Fortschritt",
          details: "Linear, undulating und block periodization optimieren Adaptation-Recovery-Zyklen. Auto-regulatory training passt Volumen und Intensität an aktuelle Regenerations-Biomarker an.",
          evidence: "Sports Science Meta-Analyse (50+ Studien)"
        },
        {
          title: "Hypertrophie-Mechanismen",
          description: "Muskelwachstum durch mechanische Spannung, metabolischen Stress und Muskelschäden",
          details: "mTOR-Aktivierung durch mechanische Spannung, Lactic Acid-induzierte Growth Hormone-Ausschüttung und controlled Muscle Damage triggern Protein-Synthese und Satellite Cell Activation.",
          evidence: "Journal of Strength & Conditioning Research"
        }
      ]
    },
    {
      name: "Kai",
      role: "Mindset- & Recovery-Spezialist",
      avatar: "🧠",
      color: "from-blue-500 to-purple-600",
      specializations: [
        {
          title: "Neuroplastizität & Gewohnheitsbildung",
          description: "Gehirn-Rewiring für nachhaltige Verhaltensänderungen",
          details: "Hebbian Learning ('Neurons that fire together, wire together') ermöglicht Neuprogrammierung neuronaler Netzwerke. Mindfulness und Meditation verdicken präfrontalen Cortex und stärken exekutive Funktionen.",
          evidence: "Harvard Neuroplasticity Research Lab"
        },
        {
          title: "HRV-Training & Autonomes Nervensystem",
          description: "Herzratenvariabilität als Biomarker für Regeneration und Stress",
          details: "HRV reflektiert parasympathische Aktivität und Anpassungsfähigkeit. Coherent Breathing (5-6 Atemzüge/Minute) optimiert Herz-Hirn-Kommunikation und autonome Balance.",
          evidence: "HeartMath Institute Coherence Studies"
        },
        {
          title: "Schlafoptimierung & Regeneration",
          description: "Sleep architecture für maximale Erholung und Performance",
          details: "Tiefschlaf (N3) aktiviert Growth Hormone-Ausschüttung und Glymphatic System für brain detox. REM-Schlaf konsolidiert Gedächtnis und emotionale Verarbeitung. Blue Light Blocking optimiert Melatonin-Rhythmus.",
          evidence: "National Sleep Foundation Guidelines"
        }
      ]
    },
    {
      name: "Markus Rühl",
      role: "Hardcore Bodybuilding Legende",
      avatar: "👑",
      color: "from-amber-500 to-red-600",
      specializations: [
        {
          title: "Heavy+Volume-Prinzip",
          description: "Extreme Trainingsintensität für maximale Muskelmasse",
          details: "Kombination aus schweren Grundübungen (80-90% 1RM) mit nachfolgenden Volumen-Sätzen (65-75% 1RM). Dual-Factor-Model maximiert sowohl myofibrilläre als auch sarkoplasmatische Hypertrophie.",
          evidence: "Elite Bodybuilding Practice & EMG Studies"
        },
        {
          title: "Mentale Härte & Pain Tolerance",
          description: "Psychologische Konditionierung für Durchhaltevermögen",
          details: "Pain-Gate-Theory und endogene Opioid-Ausschüttung durch extreme Belastung. Mental Toughness Training erhöht Stress-Resistenz und Willpower through prefrontal cortex strengthening.",
          evidence: "Sports Psychology & Pain Research"
        },
        {
          title: "Old-School Bodybuilding Wisdom",
          description: "Bewährte Methoden aus der Golden Era des Bodybuildings",
          details: "Time-tested Principles: High Volume, Instinctive Training, Mind-Muscle-Connection. Kombination traditioneller Methoden mit moderner Sportwissenschaft für optimale Ergebnisse.",
          evidence: "Historical Analysis & Modern Validation"
        }
      ]
    }
  ];

  const researchPartners = [
    {
      name: "Harvard Medical School",
      focus: "Metabolic Health & Longevity",
      collaboration: "Intermittent Fasting Protocols"
    },
    {
      name: "Stanford Behavior Design Lab",
      focus: "Habit Formation & Behavior Change",
      collaboration: "Micro-Habits Implementation"
    },
    {
      name: "NSCA Research Foundation",
      focus: "Strength & Conditioning Science",
      collaboration: "Training Periodization Studies"
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
              <Collapsible key={index}>
                <Card className="glass-card hover-scale">
                  <CardContent className="p-4">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-r ${principle.color} flex-shrink-0`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">{principle.title}</h3>
                            <div className="flex items-center gap-2">
                              {principle.isPremium && (
                                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                                  Pro
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {principle.evidence}
                              </Badge>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {principle.description}
                          </p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      {principle.isPremium ? (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-1">Detaillierte Erklärung:</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {principle.detailedDescription}
                            </p>
                          </div>
                          {principle.keyMethods && (
                            <div>
                              <h4 className="text-xs font-medium text-foreground mb-2">Schlüsselmethoden:</h4>
                              <div className="flex flex-wrap gap-1">
                                {principle.keyMethods.map((method, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {method}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-1">Evidenzbasis:</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {principle.evidenceBase}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-1">Detaillierte Erklärung:</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {principle.detailedDescription}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-2">Schlüsselmethoden:</h4>
                            <div className="flex flex-wrap gap-1">
                              {principle.keyMethods?.map((method, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {method}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-foreground mb-1">Evidenzbasis:</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {principle.evidenceBase}
                            </p>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Erfolgsrezept */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Unser Erfolgsrezept</h2>
        <div className="grid gap-3">
          {successFactors.map((factor, index) => (
            <Collapsible key={index}>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{factor.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          +{factor.percentage}
                        </Badge>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">
                      {factor.description}
                    </p>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-foreground mb-1">Wissenschaftliche Grundlage:</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {factor.detailedDescription}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-foreground mb-1">Neurowissenschaft:</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {factor.neuroscience}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {factor.evidenceSource}
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                          {factor.percentage} Erfolgsrate
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Coach Expertise */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Unsere Experten-Coaches</h2>
        <p className="text-sm text-muted-foreground">
          Jeder Coach bringt jahrzehntelange Expertise und wissenschaftlich fundierte Methoden mit
        </p>
        
        <div className="grid gap-4">
          {coachExpertise.map((coach, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${coach.color} flex items-center justify-center text-white text-xl font-bold`}>
                    {coach.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{coach.name}</h3>
                    <p className="text-xs text-muted-foreground">{coach.role}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {coach.specializations.map((spec, specIndex) => (
                    <Collapsible key={specIndex}>
                      <Card className="bg-background/50">
                        <CardContent className="p-3">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-xs text-left">{spec.title}</h4>
                              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-left">
                              {spec.description}
                            </p>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                              <div>
                                <h5 className="text-xs font-medium text-foreground mb-1">Details:</h5>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {spec.details}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  <Beaker className="h-3 w-3 mr-1" />
                                  {spec.evidence}
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </CardContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Forschungspartner */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Forschungspartner</h2>
        <div className="grid gap-3">
          {researchPartners.map((partner, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{partner.name}</h3>
                    <p className="text-xs text-muted-foreground">{partner.focus}</p>
                    <p className="text-xs text-primary mt-1">{partner.collaboration}</p>
                  </div>
                </div>
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

      {/* Evidence Level System */}
      <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 to-primary-glow/5">
        <CardContent className="p-4 space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-foreground">Evidenz-Level System</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Kategorisierung der wissenschaftlichen Belege
            </p>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center gap-3 p-2 bg-background/50 rounded-lg">
              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Level 1</Badge>
              <div className="flex-1">
                <p className="text-xs font-medium">Meta-Analysen & Systematische Reviews</p>
                <p className="text-xs text-muted-foreground">Höchste Evidenz (100+ Studien)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-background/50 rounded-lg">
              <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Level 2</Badge>
              <div className="flex-1">
                <p className="text-xs font-medium">Randomisierte Kontrollierte Studien</p>
                <p className="text-xs text-muted-foreground">Starke Evidenz (RCTs)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-background/50 rounded-lg">
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Level 3</Badge>
              <div className="flex-1">
                <p className="text-xs font-medium">Praxis-erprobte Methoden</p>
                <p className="text-xs text-muted-foreground">Bewährte Elite-Strategien</p>
              </div>
            </div>
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
            <Badge variant="outline" className="text-xs">
              <Trophy className="h-3 w-3 mr-1" />
              Evidenzbasiert
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Lightbulb className="h-3 w-3 mr-1" />
              Praxiserprobt
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Nachhaltig
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
