import { useNavigate } from "react-router-dom";
import { Dna, TestTube, TrendingUp, Activity, Scale, ChevronRight, Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const bioDataModules = [
  { 
    icon: TestTube, 
    title: "Blutwerte & Hormone", 
    description: "Tracke Laborwerte für optimale Gesundheit",
    url: "/bloodwork",
    available: true,
  },
  { 
    icon: TrendingUp, 
    title: "Transformation", 
    description: "Progress-Fotos und Körper-Entwicklung",
    url: "/transformation",
    available: true,
  },
  { 
    icon: Activity, 
    title: "Bio-Age", 
    description: "Biologisches Alter und Aging-Marker",
    url: null,
    available: false,
  },
  { 
    icon: Scale, 
    title: "Körperkomposition", 
    description: "Muskelmasse, Fettanteil, Umfänge",
    url: null,
    available: false,
  },
];

export default function BioDataPage() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Dna className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Bio-Daten Hub</h1>
            <Badge variant="outline" className="text-xs">Layer 3</Badge>
          </div>
          <p className="text-muted-foreground">
            Zentrale Übersicht deiner biologischen Daten und Gesundheitsmarker
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Der Bio-Daten Hub aggregiert alle deine biologischen Messwerte an einem Ort. 
            Von Blutwerten über Körperkomposition bis zum biologischen Alter – 
            hier siehst du das große Bild deiner Gesundheit.
          </p>
        </CardContent>
      </Card>

      {/* Module Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {bioDataModules.map((module) => (
          <Card 
            key={module.title}
            className={`relative transition-all ${
              module.available 
                ? "cursor-pointer hover:border-primary/50 hover:shadow-md" 
                : "opacity-60"
            }`}
            onClick={() => module.available && module.url && navigate(module.url)}
          >
            {!module.available && (
              <Badge 
                variant="secondary" 
                className="absolute top-3 right-3 text-xs"
              >
                Soon
              </Badge>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${module.available ? "bg-primary/10" : "bg-muted"}`}>
                  <module.icon className={`h-5 w-5 ${module.available ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    {module.title}
                    {module.available && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{module.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Features Note */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="flex items-center gap-4 py-4">
          <Construction className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Bio-Age und Körperkomposition werden bald verfügbar sein. 
            Diese Module werden deine Blutwerte und andere Marker zu einem 
            ganzheitlichen Gesundheitsbild zusammenführen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
