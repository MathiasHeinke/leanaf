
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MessageSquare } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MealData {
  id: string;
  text: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_type?: string;
}

interface MealEditFormProps {
  meal: MealData;
  onSave: () => void;
  onCancel: () => void;
}

export const MealEditForm = ({ meal, onSave, onCancel }: MealEditFormProps) => {
  const { t } = useTranslation();
  const [editValues, setEditValues] = useState({
    text: meal.text,
    meal_type: meal.meal_type || 'other',
    calories: meal.calories.toString(),
    protein: meal.protein.toString(),
    carbs: meal.carbs.toString(),
    fats: meal.fats.toString()
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  const handleSave = async () => {
    try {
      const updates = {
        text: editValues.text,
        meal_type: editValues.meal_type,
        calories: parseFloat(editValues.calories) || 0,
        protein: parseFloat(editValues.protein) || 0,
        carbs: parseFloat(editValues.carbs) || 0,
        fats: parseFloat(editValues.fats) || 0
      };

      const { error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', meal.id);

      if (error) {
        console.error('Error updating meal:', error);
        toast.error('Fehler beim Speichern der Mahlzeit');
        return;
      }

      toast.success('Mahlzeit erfolgreich aktualisiert');
      onSave();
    } catch (error) {
      console.error('Error updating meal:', error);
      toast.error('Fehler beim Speichern der Mahlzeit');
    }
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
            title: editValues.text,
            calories: parseFloat(editValues.calories) || 0,
            protein: parseFloat(editValues.protein) || 0,
            carbs: parseFloat(editValues.carbs) || 0,
            fats: parseFloat(editValues.fats) || 0,
            description: editValues.text
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.needsAdjustment && data.adjustments) {
        // Apply suggested adjustments
        if (data.adjustments.calories !== null) {
          setEditValues(prev => ({ ...prev, calories: data.adjustments.calories.toString() }));
        }
        if (data.adjustments.protein !== null) {
          setEditValues(prev => ({ ...prev, protein: data.adjustments.protein.toString() }));
        }
        if (data.adjustments.carbs !== null) {
          setEditValues(prev => ({ ...prev, carbs: data.adjustments.carbs.toString() }));
        }
        if (data.adjustments.fats !== null) {
          setEditValues(prev => ({ ...prev, fats: data.adjustments.fats.toString() }));
        }
      }

      toast.success(data.message);
      setVerificationMessage('');
      setShowVerification(false);
    } catch (error: any) {
      console.error('Error verifying meal:', error);
      toast.error('Fehler bei der Überprüfung');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="p-4 border-primary/50 bg-primary/5">
      <div className="space-y-4">
        {/* Meal Description */}
        <div>
          <Label htmlFor="text">Beschreibung</Label>
          <Textarea
            id="text"
            value={editValues.text}
            onChange={(e) => setEditValues(prev => ({ ...prev, text: e.target.value }))}
            className="min-h-[60px]"
          />
        </div>

        {/* Meal Type */}
        <div>
          <Label>Mahlzeit-Typ</Label>
          <Select value={editValues.meal_type} onValueChange={(value) => setEditValues(prev => ({ ...prev, meal_type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">{t('mealTypes.breakfast')}</SelectItem>
              <SelectItem value="lunch">{t('mealTypes.lunch')}</SelectItem>
              <SelectItem value="dinner">{t('mealTypes.dinner')}</SelectItem>
              <SelectItem value="snack">{t('mealTypes.snack')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Nutritional Values */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="calories">Kalorien</Label>
            <NumericInput
              value={editValues.calories}
              onChange={(value) => setEditValues(prev => ({ ...prev, calories: value }))}
              allowDecimals={false}
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="protein">Protein (g)</Label>
            <NumericInput
              value={editValues.protein}
              onChange={(value) => setEditValues(prev => ({ ...prev, protein: value }))}
              allowDecimals={true}
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="carbs">Kohlenhydrate (g)</Label>
            <NumericInput
              value={editValues.carbs}
              onChange={(value) => setEditValues(prev => ({ ...prev, carbs: value }))}
              allowDecimals={true}
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="fats">Fette (g)</Label>
            <NumericInput
              value={editValues.fats}
              onChange={(value) => setEditValues(prev => ({ ...prev, fats: value }))}
              allowDecimals={true}
              min={0}
            />
          </div>
        </div>

        {/* AI Verification */}
        <div className="border-t pt-3">
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

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Speichern
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
        </div>
      </div>
    </Card>
  );
};
