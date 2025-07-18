import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { MealInput } from "@/components/MealInput";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Pages where floating meal input should be shown (exclude coach page)
  const showMealInput = ['/', '/history'].includes(location.pathname);
  
  const mealInputProps = useGlobalMealInput();

  const handleConfirmMeal = async () => {
    if (!mealInputProps.analyzedMealData || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealInputProps.selectedMealType,
          text: mealInputProps.analyzedMealData.title,
          calories: mealInputProps.analyzedMealData.total.calories,
          protein: mealInputProps.analyzedMealData.total.protein,
          carbs: mealInputProps.analyzedMealData.total.carbs,
          fats: mealInputProps.analyzedMealData.total.fats,
        });

      if (error) {
        console.error('Error saving meal:', error);
        toast.error('Fehler beim Speichern der Mahlzeit');
        return;
      }

      toast.success('Mahlzeit erfolgreich gespeichert');
      
      // Reset the form
      mealInputProps.setInputText('');
      mealInputProps.setUploadedImages([]);
      mealInputProps.setShowConfirmationDialog(false);
      mealInputProps.setAnalyzedMealData(null);
      
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Fehler beim Speichern der Mahlzeit');
    }
  };

  // Don't show header on auth page
  if (location.pathname === '/auth' || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20">
      <GlobalHeader />
      <main className="container mx-auto px-4 pb-6 max-w-md">
        {children}
      </main>
      
      {/* Global floating meal input - only on specific pages */}
      {showMealInput && user && (
        <MealInput 
          inputText={mealInputProps.inputText}
          setInputText={mealInputProps.setInputText}
          onSubmitMeal={mealInputProps.handleSubmitMeal}
          onPhotoUpload={mealInputProps.handlePhotoUpload}
          onVoiceRecord={mealInputProps.handleVoiceRecord}
          isAnalyzing={mealInputProps.isAnalyzing}
          isRecording={mealInputProps.isRecording}
          isProcessing={mealInputProps.isProcessing}
          uploadedImages={mealInputProps.uploadedImages}
          onRemoveImage={mealInputProps.removeImage}
        />
      )}
      
      {/* Confirmation Dialog */}
      <AlertDialog open={mealInputProps.showConfirmationDialog} onOpenChange={mealInputProps.setShowConfirmationDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Mahlzeit bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Bitte überprüfen Sie die analysierten Nährwerte und bestätigen Sie die Mahlzeit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {mealInputProps.analyzedMealData && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{mealInputProps.analyzedMealData.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Kalorien</p>
                      <p>{mealInputProps.analyzedMealData.total.calories} kcal</p>
                    </div>
                    <div>
                      <p className="font-medium">Protein</p>
                      <p>{mealInputProps.analyzedMealData.total.protein}g</p>
                    </div>
                    <div>
                      <p className="font-medium">Kohlenhydrate</p>
                      <p>{mealInputProps.analyzedMealData.total.carbs}g</p>
                    </div>
                    <div>
                      <p className="font-medium">Fette</p>
                      <p>{mealInputProps.analyzedMealData.total.fats}g</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="font-medium mb-2">Lebensmittel:</p>
                    <div className="space-y-1">
                      {mealInputProps.analyzedMealData.items.map((item: any, index: number) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {item.name} - {item.amount} ({item.calories} kcal)
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Mahlzeit-Typ</label>
                <Select value={mealInputProps.selectedMealType} onValueChange={mealInputProps.setSelectedMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen Sie einen Mahlzeit-Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Frühstück</SelectItem>
                    <SelectItem value="lunch">Mittagessen</SelectItem>
                    <SelectItem value="dinner">Abendessen</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => mealInputProps.setShowConfirmationDialog(false)}
            >
              Abbrechen
            </Button>
            <Button onClick={handleConfirmMeal}>
              Mahlzeit speichern
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};