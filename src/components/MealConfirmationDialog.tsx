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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";

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
  const { t } = useTranslation();

  // State for editable nutritional values
  const [editableValues, setEditableValues] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    title: ""
  });

  // State for meal date
  const [mealDate, setMealDate] = useState<Date>(new Date());
  
  // State for coach personality
  const [coachPersonality, setCoachPersonality] = useState<string>('motivierend');

  // Fetch user's coach personality
  useEffect(() => {
    const fetchCoachPersonality = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('coach_personality')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching coach personality:', error);
          return;
        }
        
        if (data?.coach_personality) {
          setCoachPersonality(data.coach_personality);
        }
      } catch (error) {
        console.error('Error fetching coach personality:', error);
      }
    };

    fetchCoachPersonality();
  }, [user?.id]);

  // Initialize editable values when dialog opens
  useEffect(() => {
    if (analyzedMealData && isOpen) {
      setEditableValues({
        calories: analyzedMealData.total.calories || 0,
        protein: analyzedMealData.total.protein || 0,
        carbs: analyzedMealData.total.carbs || 0,
        fats: analyzedMealData.total.fats || 0,
        title: analyzedMealData.title || ""
      });
      setMealDate(new Date());
    }
  }, [analyzedMealData, isOpen]);

  // Generate coach comment based on personality
  const getCoachComment = () => {
    const mealTitle = analyzedMealData?.title || t('meal.title').toLowerCase();
    
    switch (coachPersonality) {
      case 'hart':
        return `💪 ${mealTitle}? Solide Wahl! Prüf die Nährwerte und dann ran an die Arbeit - deine Ziele warten nicht!`;
      case 'soft':
        return `🌟 ${mealTitle} sieht wunderbar aus! Schau dir die Nährwerte in Ruhe an - du machst das großartig.`;
      case 'lustig':
        return `😄 ${mealTitle}! Nicht schlecht für einen Anfänger! 😉 Check die Nährwerte und lass uns weitermachen!`;
      case 'ironisch':
        return `🤔 ${mealTitle}... interessante Wahl. Schau dir mal die Nährwerte an - vielleicht überrascht es dich.`;
      case 'motivierend':
      default:
        return `🚀 ${mealTitle}! Tolle Auswahl! Diese Mahlzeit bringt dich deinen Zielen näher. Schau dir die Nährwerte an und passe sie bei Bedarf an.`;
    }
  };

  const handleValueChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditableValues(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleTitleChange = (value: string) => {
    setEditableValues(prev => ({
      ...prev,
      title: value
    }));
  };

  const handleConfirmMeal = async () => {
    if (!user?.id) return;
    
    try {
      // Create a timestamp that preserves the local date without timezone conversion
      const localDate = new Date(mealDate);
      localDate.setHours(12, 0, 0, 0); // Set to midday to avoid timezone issues
      
      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: selectedMealType,
          text: editableValues.title,
          calories: editableValues.calories,
          protein: editableValues.protein,
          carbs: editableValues.carbs,
          fats: editableValues.fats,
          created_at: localDate.toISOString(),
        });

      if (error) {
        console.error('Error saving meal:', error);
        toast.error(t('meal.saveError'));
        return;
      }

      toast.success(t('meal.saveSuccess'));
      triggerDataRefresh(); // Trigger data refresh across all components
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error(t('meal.saveError'));
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('meal.confirm')}</AlertDialogTitle>
          <AlertDialogDescription>
            {getCoachComment()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          {/* Editable Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('meal.title')}</Label>
            <Input
              id="title"
              value={editableValues.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t('meal.title')}
            />
          </div>

          {/* Editable Nutritional Values */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('meal.nutrition')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">{t('meal.calories')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="calories"
                      type="number"
                      value={editableValues.calories}
                      onChange={(e) => handleValueChange('calories', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">kcal</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="protein">{t('meal.protein')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      value={editableValues.protein}
                      onChange={(e) => handleValueChange('protein', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="carbs">{t('meal.carbs')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      value={editableValues.carbs}
                      onChange={(e) => handleValueChange('carbs', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fats">{t('meal.fats')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fats"
                      type="number"
                      step="0.1"
                      value={editableValues.fats}
                      onChange={(e) => handleValueChange('fats', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meal Type and Date Selection - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('meal.type')}</Label>
              <Select value={selectedMealType} onValueChange={onMealTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('meal.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">{t('meal.breakfast')}</SelectItem>
                  <SelectItem value="lunch">{t('meal.lunch')}</SelectItem>
                  <SelectItem value="dinner">{t('meal.dinner')}</SelectItem>
                  <SelectItem value="snack">{t('meal.snack')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('meal.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !mealDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {mealDate ? format(mealDate, "dd.MM.yyyy", { locale: de }) : "Datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={mealDate}
                    onSelect={(date) => date && setMealDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('meal.cancel')}
          </Button>
          <Button onClick={handleConfirmMeal}>
            {t('meal.save')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};