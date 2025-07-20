
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, MessageSquare } from "lucide-react";
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

  const [mealDate, setMealDate] = useState<Date>(new Date());
  const [coachPersonality, setCoachPersonality] = useState<string>('motivierend');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
        
        if (error) return;
        if (data?.coach_personality) {
          setCoachPersonality(data.coach_personality);
        }
      } catch (error) {
        // Silent fail
      }
    };

    fetchCoachPersonality();
  }, [user?.id]);

  // Initialize editable values
  useEffect(() => {
    if (analyzedMealData && isOpen && typeof analyzedMealData === 'object') {
      const newValues = {
        calories: Number(analyzedMealData.calories) || 0,
        protein: Number(analyzedMealData.protein) || 0,
        carbs: Number(analyzedMealData.carbs) || 0,
        fats: Number(analyzedMealData.fats) || 0,
        title: String(analyzedMealData.title || analyzedMealData.name || "Analysierte Mahlzeit")
      };
      
      setEditableValues(newValues);
      setMealDate(new Date());
    }
  }, [analyzedMealData, isOpen]);

  const getValueWarnings = () => {
    const warnings = [];
    if (editableValues.calories > 1200) warnings.push("Sehr hohe Kalorienzahl");
    if (editableValues.calories < 50) warnings.push("Sehr niedrige Kalorienzahl");
    if (editableValues.protein > 60) warnings.push("Sehr hoher Proteinwert");
    if (editableValues.carbs > 150) warnings.push("Sehr hohe Kohlenhydrate");
    if (editableValues.fats > 80) warnings.push("Sehr hohe Fettwerte");
    return warnings;
  };

  const handleVerifyWithAI = async () => {
    if (!verificationMessage.trim()) {
      toast.error('Bitte geben Sie eine Nachricht ein');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-meal', {
        body: {
          message: verificationMessage,
          mealData: {
            title: editableValues.title,
            calories: editableValues.calories,
            protein: editableValues.protein,
            carbs: editableValues.carbs,
            fats: editableValues.fats,
            description: editableValues.title,
            confidence: analyzedMealData?.confidence
          }
        }
      });

      if (error) throw error;

      if (data.needsAdjustment && data.adjustments) {
        if (data.adjustments.calories !== null) {
          setEditableValues(prev => ({ ...prev, calories: data.adjustments.calories }));
        }
        if (data.adjustments.protein !== null) {
          setEditableValues(prev => ({ ...prev, protein: data.adjustments.protein }));
        }
        if (data.adjustments.carbs !== null) {
          setEditableValues(prev => ({ ...prev, carbs: data.adjustments.carbs }));
        }
        if (data.adjustments.fats !== null) {
          setEditableValues(prev => ({ ...prev, fats: data.adjustments.fats }));
        }
      }

      setVerificationMessage('');
      setShowVerification(false);
    } catch (error: any) {
      toast.error('Fehler bei der Überprüfung');
    } finally {
      setIsVerifying(false);
    }
  };

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
        return `🚀 ${mealTitle}! Tolle Auswahl! Diese Mahlzeit bringt dich deinen Zielen näher.`;
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
      const localDate = new Date(mealDate);
      localDate.setHours(12, 0, 0, 0);
      
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
        toast.error('Fehler beim Speichern');
        return;
      }

      triggerDataRefresh();
      onSuccess();
      onClose();
      
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const warnings = getValueWarnings();
  const confidence = analyzedMealData?.confidence;
  const shouldRender = isOpen && analyzedMealData;

  if (!shouldRender) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border border-border/50 shadow-2xl z-[9999]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('meal.confirm')}</AlertDialogTitle>
          <AlertDialogDescription>
            {getCoachComment()}
          </AlertDialogDescription>
          
          {confidence === 'low' && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Bitte Nährwerte prüfen
              </div>
            </div>
          )}
          
          {warnings.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Auffällige Werte: {warnings.join(', ')}
              </div>
            </div>
          )}
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('meal.title')}</Label>
            <Input
              id="title"
              value={editableValues.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t('meal.title')}
            />
          </div>

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
              
              <div className="mt-4 pt-4 border-t">
                {!showVerification ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVerification(true)}
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mit KI überprüfen
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="verification">Nachricht an KI (z.B. "Das war eine kleinere Portion")</Label>
                    <Textarea
                      id="verification"
                      value={verificationMessage}
                      onChange={(e) => setVerificationMessage(e.target.value)}
                      placeholder="Beschreiben Sie was angepasst werden soll..."
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleVerifyWithAI}
                        disabled={isVerifying}
                        className="flex-1"
                      >
                        {isVerifying ? 'Überprüfe...' : 'Überprüfen'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVerification(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
