import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MealConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analyzedMealData: any;
  selectedMealType: string;
  onMealTypeChange: (type: string) => void;
  onSuccess: () => void;
}

export const MealConfirmationDialog = ({
  isOpen,
  onClose,
  analyzedMealData,
  selectedMealType,
  onMealTypeChange,
  onSuccess
}: MealConfirmationDialogProps) => {
  const { user } = useAuth();

  const handleConfirmMeal = async () => {
    if (!analyzedMealData || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: selectedMealType,
          text: analyzedMealData.title,
          calories: analyzedMealData.total.calories,
          protein: analyzedMealData.total.protein,
          carbs: analyzedMealData.total.carbs,
          fats: analyzedMealData.total.fats,
        });

      if (error) {
        console.error('Error saving meal:', error);
        toast.error('Fehler beim Speichern der Mahlzeit');
        return;
      }

      toast.success('Mahlzeit erfolgreich gespeichert');
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Fehler beim Speichern der Mahlzeit');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Mahlzeit bestätigen</AlertDialogTitle>
          <AlertDialogDescription>
            Bitte überprüfen Sie die analysierten Nährwerte und bestätigen Sie die Mahlzeit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {analyzedMealData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{analyzedMealData.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Kalorien</p>
                    <p>{analyzedMealData.total.calories} kcal</p>
                  </div>
                  <div>
                    <p className="font-medium">Protein</p>
                    <p>{analyzedMealData.total.protein}g</p>
                  </div>
                  <div>
                    <p className="font-medium">Kohlenhydrate</p>
                    <p>{analyzedMealData.total.carbs}g</p>
                  </div>
                  <div>
                    <p className="font-medium">Fette</p>
                    <p>{analyzedMealData.total.fats}g</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="font-medium mb-2">Lebensmittel:</p>
                  <div className="space-y-1">
                    {analyzedMealData.items.map((item: any, index: number) => (
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
              <Select value={selectedMealType} onValueChange={onMealTypeChange}>
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
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirmMeal}>
            Mahlzeit speichern
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};