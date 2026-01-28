import { Utensils, Construction, CalendarDays, BookOpen, Repeat, Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const upcomingFeatures = [
  { icon: CalendarDays, title: "Wochenplan erstellen", description: "Plane deine Mahlzeiten für die ganze Woche" },
  { icon: BookOpen, title: "Rezept-Bibliothek", description: "Speichere und organisiere deine Lieblingsrezepte" },
  { icon: Repeat, title: "Wiederkehrende Mahlzeiten", description: "Automatisiere regelmäßige Mahlzeiten" },
  { icon: Calculator, title: "Makro-Strategien", description: "Definiere Verteilungsregeln für deine Ziele" },
];

export default function NutritionPlannerPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Utensils className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Meal Architect</h1>
            <Badge variant="outline" className="text-xs">Layer 3</Badge>
          </div>
          <p className="text-muted-foreground">
            Erstelle Ernährungspläne und definiere deine Mahlzeiten-Strategie
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-dashed border-2 bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Construction className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground max-w-md">
            Der Meal Architect gibt dir volle Kontrolle über deine Ernährungsplanung – 
            von Wochenplänen bis zu automatisierten Meal-Preps.
          </p>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-muted-foreground">Was kommt:</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcomingFeatures.map((feature) => (
            <Card key={feature.title} className="bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-medium">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
