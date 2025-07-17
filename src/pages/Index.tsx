import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlobalHeader } from "@/components/GlobalHeader";
import { RandomQuote } from "@/components/RandomQuote";
import { 
  Camera, 
  ImagePlus, 
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  Target,
  Calendar,
  Flame,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus
} from "lucide-react";

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: Date;
  meal_type?: string;
}

interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface ProfileData {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activity_level: string;
  goal: string;
  target_weight: number;
}

const Index = () => {
  const [inputText, setInputText] = useState("");
  const [dailyMeals, setDailyMeals] = useState<MealData[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({ calories: 2000, protein: 150, carbs: 250, fats: 65 });
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [analyzedMealData, setAnalyzedMealData] = useState<any>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        const profile: ProfileData = {
          weight: Number(profileData.weight) || 70,
          height: Number(profileData.height) || 170,
          age: Number(profileData.age) || 30,
          gender: profileData.gender || 'male',
          activity_level: profileData.activity_level || 'moderate',
          goal: profileData.goal || 'maintain',
          target_weight: Number(profileData.target_weight) || Number(profileData.weight) || 70,
        };

        setProfileData(profile);

        // Load daily goals
        const { data: dailyGoalsData, error: dailyGoalsError } = await supabase
          .from('daily_goals')
          .select('*')
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!dailyGoalsError && dailyGoalsData) {
          const goals: DailyGoal = {
            calories: Number(dailyGoalsData.calories) || 2000,
            protein: Number(dailyGoalsData.protein) || 150,
            carbs: Number(dailyGoalsData.carbs) || 250,
            fats: Number(dailyGoalsData.fats) || 65,
          };
          setDailyGoal(goals);
        }
      }

      // Load today's meals
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', startOfTomorrow.toISOString())
        .order('created_at', { ascending: false });

      if (mealsError) throw mealsError;

      if (mealsData) {
        const formattedMeals = mealsData.map(meal => ({
          id: meal.id,
          text: meal.text,
          calories: Number(meal.calories),
          protein: Number(meal.protein),
          carbs: Number(meal.carbs),
          fats: Number(meal.fats),
          timestamp: new Date(meal.created_at),
          meal_type: meal.meal_type,
        }));
        setDailyMeals(formattedMeals);
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Bild zu groß. Maximale Dateigröße: 5MB');
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('meal-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('meal-images')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      } catch (error: any) {
        console.error('Upload error:', error);
        toast.error('Fehler beim Hochladen des Bildes');
      }
    }

    setUploadedImages(prev => [...prev, ...newImages]);
    toast.success(`${newImages.length} Bild(er) hochgeladen`);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzeMeal = async () => {
    if (!inputText.trim() && uploadedImages.length === 0) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal', {
        body: { text: inputText, images: uploadedImages }
      });

      if (error) throw error;

      setAnalyzedMealData(data);
      toast.success('Mahlzeit analysiert!');
    } catch (error: any) {
      console.error('Error analyzing meal:', error);
      toast.error('Fehler bei der Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !analyzedMealData || isVerifying) return;
    
    setIsVerifying(true);
    
    try {
      const userMessage = { role: 'user', content: chatInput };
      const newMessages = [...chatMessages, userMessage];
      setChatMessages(newMessages);
      setChatInput('');
      
      const { data, error } = await supabase.functions.invoke('verify-meal', {
        body: { 
          message: chatInput,
          mealData: {
            calories: analyzedMealData.total.calories,
            protein: analyzedMealData.total.protein,
            carbs: analyzedMealData.total.carbs,
            fats: analyzedMealData.total.fats,
            description: inputText
          },
          conversationHistory: chatMessages
        }
      });
      
      if (error) throw error;
      
      const assistantMessage = { role: 'assistant', content: data.message };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Apply adjustments if needed
      if (data.needsAdjustment && data.adjustments) {
        const updatedMealData = { ...analyzedMealData };
        
        if (data.adjustments.calories !== null) {
          updatedMealData.total.calories = data.adjustments.calories;
        }
        if (data.adjustments.protein !== null) {
          updatedMealData.total.protein = data.adjustments.protein;
        }
        if (data.adjustments.carbs !== null) {
          updatedMealData.total.carbs = data.adjustments.carbs;
        }
        if (data.adjustments.fats !== null) {
          updatedMealData.total.fats = data.adjustments.fats;
        }
        
        setAnalyzedMealData(updatedMealData);
        toast.success('Nährwerte wurden angepasst!');
      }
      
    } catch (error: any) {
      console.error('Error in chat verification:', error);
      toast.error('Fehler beim Chatten mit dem Assistenten');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmMeal = async () => {
    if (!inputText.trim() || !analyzedMealData || !selectedMealType) return;
    
    setIsAnalyzing(true);
    
    try {
      const newMeal = {
        user_id: user?.id,
        text: inputText,
        calories: Math.round(analyzedMealData.total.calories),
        protein: Math.round(analyzedMealData.total.protein),
        carbs: Math.round(analyzedMealData.total.carbs),
        fats: Math.round(analyzedMealData.total.fats),
        meal_type: selectedMealType,
      };

      const { data: insertedMeal, error: insertError } = await supabase
        .from('meals')
        .insert([newMeal])
        .select()
        .single();

      if (insertError) throw insertError;

      // Save image references
      if (uploadedImages.length > 0) {
        const imageInserts = uploadedImages.map(imageUrl => ({
          user_id: user?.id,
          meal_id: insertedMeal.id,
          image_url: imageUrl
        }));

        const { error: imageError } = await supabase
          .from('meal_images')
          .insert(imageInserts);

        if (imageError) {
          console.error('Error saving image references:', imageError);
        }
      }

      const formattedMeal: MealData = {
        id: insertedMeal.id,
        text: insertedMeal.text,
        calories: Number(insertedMeal.calories),
        protein: Number(insertedMeal.protein),
        carbs: Number(insertedMeal.carbs),
        fats: Number(insertedMeal.fats),
        timestamp: new Date(insertedMeal.created_at),
        meal_type: insertedMeal.meal_type,
      };

      setDailyMeals(prev => [formattedMeal, ...prev]);
      
      // Reset form
      setInputText("");
      setAnalyzedMealData(null);
      setUploadedImages([]);
      setChatMessages([]);
      setSelectedMealType('');
      
      toast.success('Mahlzeit erfolgreich hinzugefügt!');
      
    } catch (error: any) {
      console.error('Error saving meal:', error);
      toast.error('Fehler beim Speichern der Mahlzeit');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddWeight = async () => {
    if (!user || !newWeight) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(newWeight),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ weight: parseFloat(newWeight) })
        .eq('user_id', user.id);

      setNewWeight('');
      toast.success('Gewicht erfolgreich hinzugefügt!');
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Fehler beim Hinzufügen des Gewichts');
    }
  };

  // Calculate daily totals
  const dailyTotals = dailyMeals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      protein: totals.protein + meal.protein,
      carbs: totals.carbs + meal.carbs,
      fats: totals.fats + meal.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const calorieProgress = (dailyTotals.calories / dailyGoal.calories) * 100;
  const proteinProgress = (dailyTotals.protein / dailyGoal.protein) * 100;
  const carbsProgress = (dailyTotals.carbs / dailyGoal.carbs) * 100;
  const fatsProgress = (dailyTotals.fats / dailyGoal.fats) * 100;

  const remainingCalories = dailyGoal.calories - dailyTotals.calories;
  const caloriesExceeded = dailyTotals.calories > dailyGoal.calories;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <GlobalHeader />
      
      <div className="max-w-sm mx-auto px-4 pt-16 pb-6">
        {/* Daily Progress */}
        <Card className="p-4 mb-4 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold">Tagesfortschritt</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Warning for exceeded calories */}
          {caloriesExceeded && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 text-sm font-medium">
                Achtung: Du hast dein Kalorienziel um {Math.abs(remainingCalories)} kcal überschritten!
              </span>
            </div>
          )}
          
          {/* Calorie Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Kalorien</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${caloriesExceeded ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                  {dailyTotals.calories}/{dailyGoal.calories} kcal
                </span>
                {remainingCalories > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <Progress 
              value={Math.min(calorieProgress, 100)} 
              className={`h-3 mb-2 ${caloriesExceeded ? '[&>div]:bg-red-500' : ''}`} 
            />
            <div className="flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3" />
              <span className={remainingCalories > 0 ? "text-green-600" : "text-red-600"}>
                {remainingCalories > 0 
                  ? `${remainingCalories} kcal verbleibend`
                  : `${Math.abs(remainingCalories)} kcal überschritten`
                }
              </span>
            </div>
          </div>

          {/* Macro Overview */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-xl border bg-protein-light border-protein/20">
              <div className="text-xs font-medium mb-1 text-protein">Protein</div>
              <div className="font-bold mb-2 text-protein">{dailyTotals.protein}g</div>
              <Progress value={Math.min(proteinProgress, 100)} className="h-1" />
            </div>
            <div className="text-center p-2 rounded-xl border bg-carbs-light border-carbs/20">
              <div className="text-xs font-medium mb-1 text-carbs">Kohlenhydrate</div>
              <div className="font-bold mb-2 text-carbs">{dailyTotals.carbs}g</div>
              <Progress value={Math.min(carbsProgress, 100)} className="h-1" />
            </div>
            <div className="text-center p-2 rounded-xl border bg-fats-light border-fats/20">
              <div className="text-xs font-medium mb-1 text-fats">Fette</div>
              <div className="font-bold mb-2 text-fats">{dailyTotals.fats}g</div>
              <Progress value={Math.min(fatsProgress, 100)} className="h-1" />
            </div>
          </div>

          {/* Quick Weight Input */}
          <div className="mt-4">
            <div className="flex gap-2">
              <Input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Aktuelles Gewicht"
                className="flex-1"
              />
              <Button onClick={handleAddWeight} disabled={!newWeight}>
                <Plus className="h-4 w-4 mr-2" />
                Eintragen
              </Button>
            </div>
          </div>
        </Card>

        {/* Meal Input Form */}
        <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mahlzeit für {new Date().toLocaleDateString('de-DE')} hinzufügen</h2>
            </div>
            
            {/* Chat with AI Assistant */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Chat mit KI-Assistent</span>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-2 bg-muted/30 p-3 rounded-lg">
                {chatMessages.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    Frage mich nach Details zu deiner Mahlzeit!<br />
                    z.B. "Das waren nur 100g Reis" oder "Mit extra Olivenöl"
                  </div>
                ) : (
                  chatMessages.map((msg, index) => (
                    <div key={index} className={`text-sm p-2 rounded ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-background mr-4'
                    }`}>
                      {msg.content}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Frage nach Details zur Mahlzeit..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleChatSubmit();
                    }
                  }}
                />
                <Button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isVerifying}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="mealDescription">Beschreibung:</Label>
              <Textarea
                id="mealDescription"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Beschreibe deine Mahlzeit..."
                className="min-h-[100px]"
              />
            </div>
            
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Bilder hinzufügen:</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  multiple
                  className="hidden"
                  id="camera-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('camera-input')?.click()}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Kamera
                </Button>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  multiple
                  className="hidden"
                  id="gallery-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('gallery-input')?.click()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Galerie
                </Button>
              </div>
              
              {/* Display uploaded images */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Mahlzeit ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => removeImage(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Meal type selection */}
            <div className="space-y-2">
              <Label htmlFor="mealType">Mahlzeit-Typ:</Label>
              <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                <SelectTrigger>
                  <SelectValue placeholder="Wähle einen Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Frühstück</SelectItem>
                  <SelectItem value="lunch">Mittagessen</SelectItem>
                  <SelectItem value="dinner">Abendessen</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Analyze button */}
            <Button
              onClick={handleAnalyzeMeal}
              disabled={(!inputText.trim() && uploadedImages.length === 0) || isAnalyzing}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Analysiere...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Mahlzeit analysieren
                </>
              )}
            </Button>
            
            {/* Display analysis results */}
            {analyzedMealData && (
              <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg border">
                <div className="font-medium text-sm">Analysierte Nährwerte:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Kalorien:</div>
                  <div>{Math.round(analyzedMealData.total.calories)} kcal</div>
                  <div className="font-medium">Protein:</div>
                  <div>{Math.round(analyzedMealData.total.protein)}g</div>
                  <div className="font-medium">Kohlenhydrate:</div>
                  <div>{Math.round(analyzedMealData.total.carbs)}g</div>
                  <div className="font-medium">Fett:</div>
                  <div>{Math.round(analyzedMealData.total.fats)}g</div>
                </div>
                
                <Button
                  onClick={handleConfirmMeal}
                  disabled={!selectedMealType}
                  className="w-full"
                >
                  Mahlzeit bestätigen und speichern
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Today's Meals */}
        <div className="mt-4 space-y-3">
          {dailyMeals.length > 0 ? (
            dailyMeals.map((meal) => (
              <Card key={meal.id} className="p-4 bg-gradient-to-r from-card to-card/80">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium capitalize">{meal.meal_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {meal.timestamp.toLocaleTimeString('de-DE', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{meal.text}</p>
                    <div className="flex gap-4 text-xs">
                      <span>{meal.calories} kcal</span>
                      <span>{meal.protein}g P</span>
                      <span>{meal.carbs}g K</span>
                      <span>{meal.fats}g F</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center bg-gradient-to-r from-card to-card/80">
              <p className="text-muted-foreground">
                Füge deine erste Mahlzeit hinzu
              </p>
            </Card>
          )}
        </div>

        {/* Quote Section */}
        <div className="mt-4">
          <RandomQuote 
            userGender={profileData?.gender} 
            fallbackText=""
            refreshTrigger={0}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;