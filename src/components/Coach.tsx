import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MessageCircle, 
  ChefHat, 
  Lightbulb, 
  Phone,
  Loader2
} from "lucide-react";

interface CoachProps {
  onClose: () => void;
}

const Coach = ({ onClose }: CoachProps) => {
  const [recommendations, setRecommendations] = useState<string>('');
  const [userContext, setUserContext] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      generateRecommendations();
    }
  }, [user]);

  const generateRecommendations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-recipes', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) throw error;

      setRecommendations(data.recommendations);
      setUserContext(data.userContext);
      
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast.error('Fehler beim Erstellen der Empfehlungen');
    } finally {
      setLoading(false);
    }
  };

  const requestPersonalSession = () => {
    toast.success('Anfrage für persönliches Gespräch wurde gesendet! 📞');
    // Hier könnte eine echte Terminbuchung implementiert werden
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Dein Ernährungs-Coach
          </h1>
        </div>

        {/* Personal Session Request Button */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Persönliche Beratung</h3>
                <p className="text-muted-foreground">
                  Möchtest du eine individuelle Ernährungsberatung? 
                  Vereinbare ein persönliches Gespräch mit unserem Expertenteam.
                </p>
              </div>
              <Button 
                onClick={requestPersonalSession}
                className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Gespräch anfordern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Overview */}
        {userContext && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Deine aktuellen Daten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Tagesziel Kalorien</div>
                  <div className="text-2xl font-bold text-primary">{userContext.goals.calories} kcal</div>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Ø Kalorien (7 Tage)</div>
                  <div className="text-2xl font-bold text-blue-600">{userContext.avgCalories} kcal</div>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Mahlzeiten diese Woche</div>
                  <div className="text-2xl font-bold text-green-600">{userContext.totalMeals}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Recommendations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Personalisierte Empfehlungen
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateRecommendations}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Neu generieren
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Erstelle personalisierte Empfehlungen...</span>
              </div>
            ) : recommendations ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {recommendations}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Klicke auf "Neu generieren" um personalisierte Empfehlungen zu erhalten</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            💡 Die Empfehlungen basieren auf deinen Profildaten, Zielen und aktuellen Essgewohnheiten.
            Für detaillierte Beratung nutze den "Persönliches Gespräch" Button.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Coach;