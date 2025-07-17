import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Settings from "@/components/Settings";
import History from "@/components/History";
import Coach from "@/components/Coach";
import { 
  Camera, 
  Mic, 
  Type, 
  Plus, 
  Target, 
  Calendar,
  Flame,
  Activity,
  Zap,
  Heart,
  Settings as SettingsIcon,
  History as HistoryIcon,
  MessageCircle,
  Menu
} from "lucide-react";

interface NutritionData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  meal_type?: string;
}

const Index = () => {
  const [inputMode, setInputMode] = useState<'photo' | 'voice' | 'text' | null>(null);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [dailyMeals, setDailyMeals] = useState<NutritionData[]>([]);
  const [dailyGoal, setDailyGoal] = useState(1500); // Standard Ziel
  const [currentView, setCurrentView] = useState<'main' | 'settings' | 'history' | 'coach'>('main');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Berechne Tagessummen
  const dailyTotals = dailyMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fats: totals.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const calorieProgress = (dailyTotals.calories / dailyGoal) * 100;

  const handleSubmitMeal = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Eingabe erforderlich",
        description: "Bitte beschreibe deine Mahlzeit.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('https://gzczjscctgyxjyodhnhk.functions.supabase.co/analyze-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Analyse');
      }

      const data = await response.json();
      
      const newMeal: NutritionData = {
        id: Date.now().toString(),
        text: inputText,
        calories: Math.round(data.total.calories),
        protein: Math.round(data.total.protein),
        carbs: Math.round(data.total.carbs),
        fats: Math.round(data.total.fats),
        timestamp: new Date(),
        meal_type: getCurrentMealType()
      };

      setDailyMeals(prev => [...prev, newMeal]);
      setInputText("");
      setInputMode(null);
      
      toast({
        title: "Mahlzeit erfasst! 🍽️",
        description: `${newMeal.calories} kcal hinzugefügt`
      });
    } catch (error) {
      toast({
        title: "Fehler bei der Analyse",
        description: "Die Mahlzeit konnte nicht analysiert werden. Versuche es erneut.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCurrentMealType = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "Frühstück";
    if (hour < 15) return "Mittag";
    if (hour < 19) return "Abendessen";
    return "Snack";
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    // Hier würde die Spracherkennung implementiert
    toast({
      title: isRecording ? "Aufnahme gestoppt" : "Sprachaufnahme gestartet",
      description: isRecording ? "Verarbeite Spracheingabe..." : "Sprich jetzt deine Mahlzeit...",
    });
  };

  const handlePhotoUpload = () => {
    // Hier würde die Foto-Upload Logik stehen
    toast({
      title: "Foto-Upload",
      description: "Foto-Analyse wird implementiert...",
    });
  };

  // Render different views based on currentView
  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <Settings 
            dailyGoal={dailyGoal} 
            onGoalChange={setDailyGoal} 
            onClose={() => setCurrentView('main')} 
          />
        </div>
      </div>
    );
  }

  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <History 
            onClose={() => setCurrentView('main')} 
            dailyGoal={dailyGoal}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'coach') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <Coach 
            onClose={() => setCurrentView('main')} 
            dailyTotals={dailyTotals}
            dailyGoal={dailyGoal}
            mealsCount={dailyMeals.length}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-6 max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-primary to-primary-glow p-3 rounded-2xl">
              <Activity className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            KaloTracker
          </h1>
          <p className="text-muted-foreground mt-2">
            Erfasse deine Mahlzeiten per Foto, Sprache oder Text
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-2 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentView('history')}
            className="flex-1"
          >
            <HistoryIcon className="h-4 w-4 mr-2" />
            Verlauf
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentView('coach')}
            className="flex-1"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Coach
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentView('settings')}
            className="flex-1"
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Ziel
          </Button>
        </div>

        {/* Tages-Dashboard */}
        <Card className="p-6 mb-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold">Heute</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('de-DE')}
            </div>
          </div>
          
          {/* Kalorien Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Kalorien</span>
              <span className="text-sm text-muted-foreground">
                {dailyTotals.calories}/{dailyGoal} kcal
              </span>
            </div>
            <Progress value={calorieProgress} className="h-3 mb-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3 w-3" />
              {dailyGoal - dailyTotals.calories > 0 
                ? `${dailyGoal - dailyTotals.calories} kcal verbleibend`
                : `${dailyTotals.calories - dailyGoal} kcal über Ziel`
              }
            </div>
          </div>

          {/* Makro-Übersicht */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-xl bg-protein-light border border-protein/20">
              <div className="text-xs text-protein font-medium mb-1">Protein</div>
              <div className="font-bold text-protein">{dailyTotals.protein}g</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-carbs-light border border-carbs/20">
              <div className="text-xs text-carbs font-medium mb-1">Kohlenhydr.</div>
              <div className="font-bold text-carbs">{dailyTotals.carbs}g</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-fats-light border border-fats/20">
              <div className="text-xs text-fats font-medium mb-1">Fette</div>
              <div className="font-bold text-fats">{dailyTotals.fats}g</div>
            </div>
          </div>
        </Card>

        {/* Eingabe-Modi */}
        {!inputMode && (
          <div className="space-y-4 mb-6">
            <h2 className="text-lg font-semibold text-center mb-4">
              Neue Mahlzeit hinzufügen
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="hero" 
                size="card" 
                onClick={() => setInputMode('photo')}
                className="justify-start"
              >
                <Camera className="h-6 w-6" />
                Foto aufnehmen
              </Button>
              
              <Button 
                variant="warm" 
                size="card" 
                onClick={() => setInputMode('voice')}
                className="justify-start"
              >
                <Mic className="h-6 w-6" />
                Spracheingabe
              </Button>
              
              <Button 
                variant="soft" 
                size="card" 
                onClick={() => setInputMode('text')}
                className="justify-start"
              >
                <Type className="h-6 w-6" />
                Text eingeben
              </Button>
            </div>
          </div>
        )}

        {/* Eingabe-Interface */}
        {inputMode && (
          <Card className="p-6 mb-6 border-2 border-primary/20 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {inputMode === 'photo' && 'Foto aufnehmen'}
                {inputMode === 'voice' && 'Spracheingabe'}
                {inputMode === 'text' && 'Mahlzeit beschreiben'}
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setInputMode(null)}
              >
                Abbrechen
              </Button>
            </div>

            {inputMode === 'photo' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                  <p className="text-muted-foreground mb-4">
                    Foto von deiner Mahlzeit aufnehmen
                  </p>
                  <Button variant="hero" onClick={handlePhotoUpload}>
                    Kamera öffnen
                  </Button>
                </div>
              </div>
            )}

            {inputMode === 'voice' && (
              <div className="space-y-4">
                <div className="text-center p-8">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                    isRecording ? 'bg-red-100 border-4 border-red-500 animate-pulse' : 'bg-primary/10'
                  }`}>
                    <Mic className={`h-8 w-8 ${isRecording ? 'text-red-500' : 'text-primary'}`} />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {isRecording ? 'Hört zu...' : 'Sprich deine Mahlzeit'}
                  </p>
                  <Button 
                    variant={isRecording ? "destructive" : "hero"} 
                    onClick={handleVoiceRecord}
                  >
                    {isRecording ? 'Stop' : 'Aufnahme starten'}
                  </Button>
                </div>
                {inputText && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Erkannter Text:</label>
                    <Textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Erkannter Text wird hier angezeigt..."
                      className="min-h-[100px]"
                    />
                  </div>
                )}
              </div>
            )}

            {inputMode === 'text' && (
              <div className="space-y-4">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="z.B. 300g Frosta Curry, 2 Eier, 125g Magerquark..."
                  className="min-h-[120px] text-base"
                />
                <div className="text-xs text-muted-foreground">
                  💡 Tipp: Je genauer du die Mengen angibst, desto präziser wird die Berechnung
                </div>
              </div>
            )}

            {inputText && (
              <div className="mt-6 pt-4 border-t">
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={handleSubmitMeal} 
                  className="w-full"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Mahlzeit analysieren
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Heutige Mahlzeiten */}
        {dailyMeals.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Heutige Mahlzeiten</h3>
            
            {dailyMeals.map((meal) => (
              <Card key={meal.id} className="p-4 shadow-sm border-l-4 border-l-primary">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {meal.meal_type && (
                      <Badge variant="secondary">{meal.meal_type}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {meal.timestamp.toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <Zap className="h-4 w-4" />
                    {meal.calories} kcal
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {meal.text}
                </p>
                
                <div className="flex justify-between text-xs">
                  <span className="text-protein">P: {meal.protein}g</span>
                  <span className="text-carbs">K: {meal.carbs}g</span>
                  <span className="text-fats">F: {meal.fats}g</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {dailyMeals.length === 0 && !inputMode && (
          <Card className="p-8 text-center border-dashed border-2 border-muted">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Noch keine Mahlzeiten heute</h3>
            <p className="text-muted-foreground text-sm">
              Füge deine erste Mahlzeit hinzu, um mit dem Tracking zu beginnen.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
