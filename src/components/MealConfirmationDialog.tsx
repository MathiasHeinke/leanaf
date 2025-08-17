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
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { secureLogger } from "@/utils/secureLogger";

interface MealConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  analyzedMealData: any;
  selectedMealType: string;
  onMealTypeChange: (type: string) => void;
  onSuccess: () => void;
  uploadedImages?: string[];
  selectedDate?: Date; // Add selectedDate prop
}

export const MealConfirmationDialog = ({
  isOpen,
  onClose,
  analyzedMealData,
  selectedMealType,
  onMealTypeChange,
  onSuccess,
  uploadedImages = [],
  selectedDate = new Date() // Default to today if not provided
}: MealConfirmationDialogProps) => {
  // Debug uploaded images when dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('🖼️ MealConfirmationDialog opened with uploadedImages:', uploadedImages);
      console.log('🖼️ uploadedImages length:', uploadedImages.length);
      console.log('🖼️ uploadedImages type:', typeof uploadedImages);
    }
  }, [isOpen, uploadedImages]);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { evaluateMeal } = usePointsSystem();

  // State for editable nutritional values
  const [editableValues, setEditableValues] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    title: ""
  });

  const [mealDate, setMealDate] = useState<Date>(selectedDate);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [mealEvaluation, setMealEvaluation] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  

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
      setMealDate(selectedDate);
    }
  }, [analyzedMealData, isOpen]);

  const getValueWarnings = () => {
    const warnings = [];
    if (editableValues.calories > 800) warnings.push("Sehr hohe Kalorienzahl");
    if (editableValues.calories < 50) warnings.push("Sehr niedrige Kalorienzahl");
    if (editableValues.protein > 80) warnings.push("Sehr hoher Proteinwert");
    if (editableValues.carbs > 150) warnings.push("Sehr hohe Kohlenhydrate");
    if (editableValues.fats > 60) warnings.push("Sehr hohe Fettwerte");
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
          },
          images: uploadedImages
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
      toast.success('Werte wurden überprüft und angepasst');
    } catch (error: any) {
      toast.error('Fehler bei der Überprüfung: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setIsVerifying(false);
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
    secureLogger.debug('handleConfirmMeal started');
    secureLogger.debug('Meal confirmation data', {
      hasUserId: !!user?.id,
      mealType: selectedMealType,
      mealDate: mealDate,
      imageCount: uploadedImages.length
    });
    
    if (!user?.id) {
      secureLogger.error('Authentication error: No user ID found');
      toast.error('Benutzer nicht authentifiziert');
      return;
    }
    
    try {
      // Prepare meal data with validation
      const mealPayload = {
        user_id: user.id,
        meal_type: selectedMealType || 'other',
        text: editableValues.title || 'Unbenannte Mahlzeit',
        calories: Number(editableValues.calories) || 0,
        protein: Number(editableValues.protein) || 0,
        carbs: Number(editableValues.carbs) || 0,
        fats: Number(editableValues.fats) || 0,
        date: mealDate.toISOString().split('T')[0] // Use selected date
      };

      secureLogger.debug('Meal payload prepared');
      secureLogger.debug('About to insert meal');
      
      // Insert meal with retry mechanism
      let mealData = null;
      let insertError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          secureLogger.debug(`Insert attempt ${attempt}/3`);
          
          const { data, error } = await supabase
            .from('meals')
            .insert(mealPayload)
            .select()
            .maybeSingle();

          if (error) {
            secureLogger.error(`Insert error (attempt ${attempt})`, error);
            insertError = error;
            
            if (attempt === 3) {
              throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }

          secureLogger.debug('Meal insert successful');
          mealData = data;
          break;
          
        } catch (networkError) {
          secureLogger.error(`Network error (attempt ${attempt})`, networkError);
          insertError = networkError;
          
          if (attempt === 3) {
            throw networkError;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      if (!mealData) {
        throw insertError || new Error('Failed to insert meal after retries');
      }

      secureLogger.debug('Meal saved successfully', { mealId: mealData.id });

      // Save uploaded images if any
      if (uploadedImages.length > 0) {
        secureLogger.debug('Processing uploaded images', { imageCount: uploadedImages.length });
        
        const imageInserts = uploadedImages.map(imageUrl => ({
          user_id: user.id,
          meal_id: mealData.id,
          image_url: imageUrl
        }));

        secureLogger.debug('Image inserts prepared');

        try {
          const { error: imagesError } = await supabase
            .from('meal_images')
            .insert(imageInserts);

          if (imagesError) {
            secureLogger.error('Error saving meal images', imagesError);
            toast.error('Mahlzeit gespeichert, aber Bilder konnten nicht verknüpft werden');
          } else {
            secureLogger.debug('Images saved successfully');
          }
        } catch (imageNetworkError) {
          secureLogger.error('Network error saving images', imageNetworkError);
          toast.error('Mahlzeit gespeichert, aber Bilder konnten nicht verknüpft werden');
        }
      }

      // Evaluate meal quality and award bonus points
      secureLogger.debug('Starting meal evaluation');
      setIsEvaluating(true);
      
      if (evaluateMeal) {
        try {
          const evaluationResult = await evaluateMeal(mealData.id, {
            text: editableValues.title,
            calories: editableValues.calories,
            protein: editableValues.protein,
            carbs: editableValues.carbs,
            fats: editableValues.fats,
            meal_type: selectedMealType,
            images: uploadedImages.length > 0 ? uploadedImages.map((url, index) => ({ id: `temp-${index}`, image_url: url })) : []
          });
          
          if (evaluationResult) {
            setMealEvaluation(evaluationResult);
            secureLogger.debug('Meal evaluation completed', { hasResult: !!evaluationResult });
          }
        } catch (evaluationError) {
          secureLogger.warn('Meal evaluation failed', evaluationError);
          // Show fallback success message if evaluation fails
          const fallbackMessage = uploadedImages.length > 0 
            ? `Mahlzeit gespeichert! (+${uploadedImages.length > 0 ? '5' : '3'} Punkte)` 
            : 'Mahlzeit gespeichert! (+3 Punkte)';
          toast.success(fallbackMessage);
        } finally {
          setIsEvaluating(false);
        }
      }

      secureLogger.debug('Triggering data refresh');
      triggerDataRefresh();
      
      secureLogger.debug('Showing success message');
      const successMessage = uploadedImages.length > 0 
        ? `Mahlzeit erfolgreich gespeichert mit ${uploadedImages.length} Bild(ern)` 
        : 'Mahlzeit erfolgreich gespeichert';
      
      toast.success(successMessage);
      
      secureLogger.debug('Calling onSuccess callback');
      onSuccess();
      
      secureLogger.debug('Closing dialog');
      onClose();
      
      secureLogger.debug('handleConfirmMeal completed successfully');
      
    } catch (error: any) {
      secureLogger.error('Critical error in handleConfirmMeal', error);
      
      let errorMessage = 'Fehler beim Speichern der Mahlzeit';
      
      // Specific error handling
      if (error.message?.includes('violates row-level security')) {
        errorMessage = 'Sicherheitsfehler - bitte erneut anmelden';
      } else if (error.message?.includes('Load failed')) {
        errorMessage = 'Netzwerkfehler - bitte Internetverbindung prüfen';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Zeitüberschreitung - bitte erneut versuchen';
      } else if (error.code) {
        errorMessage = `Datenbankfehler (${error.code}): ${error.message}`;
      } else if (error.message) {
        errorMessage = `Fehler: ${error.message}`;
      }
      
      secureLogger.debug('Showing error toast', { errorMessage });
      toast.error(errorMessage);
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
          
          {confidence === 'low' && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Bitte Nährwerte prüfen - niedrige Vertrauenswürdigkeit
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

          {uploadedImages.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <div className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                📸 Bilder werden mit der Mahlzeit gespeichert ({uploadedImages.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadedImages.map((imageUrl, index) => {
                  console.log('🖼️ Rendering thumbnail:', { index, imageUrl, type: typeof imageUrl });
                  return (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Mahlzeit ${index + 1}`}
                      className="w-12 h-12 object-cover rounded border"
                      onLoad={() => console.log('✅ Image loaded:', imageUrl)}
                      onError={(e) => {
                        console.error('❌ Image failed to load:', imageUrl, e);
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.display = 'flex';
                        e.currentTarget.style.alignItems = 'center';
                        e.currentTarget.style.justifyContent = 'center';
                        e.currentTarget.innerHTML = '🖼️';
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Meal Evaluation Results */}
          {mealEvaluation && (
            <div className="mt-2 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">🏆 Qualitätsbewertung</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < mealEvaluation.quality_score
                            ? 'bg-primary'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                    <span className="text-sm font-bold ml-1">
                      {mealEvaluation.quality_score}/10
                    </span>
                  </div>
                </div>
                {mealEvaluation.bonus_points > 0 && (
                  <div className="flex items-center gap-1 bg-secondary/20 px-2 py-1 rounded-full">
                    <span className="text-xs">⭐</span>
                    <span className="text-xs font-medium">
                      +{mealEvaluation.bonus_points}BP
                    </span>
                  </div>
                )}
              </div>
              
              {mealEvaluation.ai_feedback && (
                <div className="text-sm text-muted-foreground italic">
                  "{mealEvaluation.ai_feedback}"
                </div>
              )}
            </div>
          )}

          {/* Evaluation Loading */}
          {isEvaluating && (
            <div className="mt-2 p-3 bg-muted/20 border border-muted/40 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">
                  Bewerte Mahlzeitqualität...
                </span>
              </div>
            </div>
          )}
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              id="title"
              value={editableValues.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t('meal.title')}
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">{t('meal.calories')}</Label>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      id="calories"
                      value={editableValues.calories}
                      onChange={(value) => handleValueChange('calories', value)}
                      allowDecimals={false}
                      min={0}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">kcal</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="protein">{t('meal.protein')}</Label>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      id="protein"
                      value={editableValues.protein}
                      onChange={(value) => handleValueChange('protein', value)}
                      allowDecimals={true}
                      min={0}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="carbs">{t('meal.carbs')}</Label>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      id="carbs"
                      value={editableValues.carbs}
                      onChange={(value) => handleValueChange('carbs', value)}
                      allowDecimals={true}
                      min={0}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fats">{t('meal.fats')}</Label>
                  <div className="flex items-center gap-2">
                    <NumericInput
                      id="fats"
                      value={editableValues.fats}
                      onChange={(value) => handleValueChange('fats', value)}
                      allowDecimals={true}
                      min={0}
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
        
        <AlertDialogFooter className="gap-2">
          {/* Cancel Button */}
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isEvaluating}
          >
            {t('meal.cancel')}
          </Button>
          
          {/* Confirm Button */}
          <Button 
            onClick={handleConfirmMeal}
            disabled={isEvaluating}
            className="bg-primary hover:bg-primary/90"
          >
            {isEvaluating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Bewerte...
              </>
            ) : (
              t('meal.save')
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
