import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { Camera, Mic, SendHorizontal, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { triggerDataRefresh } from "@/hooks/useDataRefresh";
import { usePointsSystem } from "@/hooks/usePointsSystem";
import { getMealBasePoints } from "@/utils/mealPointsHelper";
interface QuickMealSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickMealSheet: React.FC<QuickMealSheetProps> = ({ open, onOpenChange }) => {
  const {
    inputText,
    setInputText,
    uploadedImages,
    handlePhotoUpload,
    handleVoiceRecord,
    handleSubmitMeal,
    isAnalyzing,
    isRecording,
    showConfirmationDialog,
    analyzedMealData,
    closeDialog,
    resetForm,
    removeImage,
  } = useGlobalMealInput();

  const { user } = useAuth();
  const { awardPoints, updateStreak } = usePointsSystem();
  const onCloseAll = () => {
    resetForm();
    onOpenChange(false);
  };

  const persistAnalyzedMeal = async () => {
    try {
      if (!user) {
        toast.error("Bitte zuerst anmelden");
        return;
      }
      if (!analyzedMealData) {
        toast.error("Keine Analysedaten verfügbar");
        return;
      }

      const { error } = await supabase.from('meals').insert({
        user_id: user.id,
        text: analyzedMealData.title,
        calories: Math.round(analyzedMealData.calories || 0),
        protein: Math.round(analyzedMealData.protein || 0),
        carbs: Math.round(analyzedMealData.carbs || 0),
        fats: Math.round(analyzedMealData.fats || 0)
      });

      if (error) throw error;

      const hasPhoto = (uploadedImages?.length ?? 0) > 0;
      const basePoints = getMealBasePoints(hasPhoto);
      await awardPoints(hasPhoto ? 'meal_tracked_with_photo' : 'meal_tracked', basePoints, 'Schnell-Eintrag Mahlzeit');
      await updateStreak('meal_tracking');

      toast.success("Mahlzeit gespeichert");
      triggerDataRefresh();
      closeDialog();
      onCloseAll();
    } catch (e: any) {
      toast.error(e?.message || "Speichern fehlgeschlagen");
    }
  };

  const onSubmit = async () => {
    await handleSubmitMeal();
    if (!isAnalyzing) {
      if (showConfirmationDialog && analyzedMealData) {
        // Confirmation UI wird unten angezeigt
      }
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/40 glass-card pb-6">
        <SheetHeader>
          <SheetTitle>Mahlzeit hinzufügen</SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-3">
          {/* Text input */}
          <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur p-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Kurz beschreiben oder diktieren…"
              rows={3}
              className="w-full bg-transparent outline-none resize-none text-sm"
            />

            {/* Images preview */}
            {uploadedImages.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {uploadedImages.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`Mahlzeit Foto ${idx + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      aria-label="Bild entfernen"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 rounded-full bg-background/80 border border-border/40 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="inline-flex">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                <span className="w-11 h-11 rounded-full glass-card border border-border/40 inline-flex items-center justify-center cursor-pointer">
                  <Camera className="w-5 h-5" />
                </span>
              </label>

              <button
                onClick={handleVoiceRecord}
                className={`w-11 h-11 rounded-full glass-card border border-border/40 inline-flex items-center justify-center ${isRecording ? "ring-2 ring-primary" : ""}`}
                aria-label="Sprachaufnahme"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={onSubmit}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-full px-4 h-11 bg-primary text-primary-foreground hover:opacity-95 transition disabled:opacity-70"
            >
              <SendHorizontal className="w-4 h-4" />
              Absenden
            </button>
          </div>
        </div>

        {/* Temporary lightweight confirmation inline (no persistence yet) */}
        {showConfirmationDialog && analyzedMealData && (
          <div className="mt-4 rounded-xl border border-border/40 p-3 bg-background/70">
            <div className="text-sm font-medium">{analyzedMealData.title}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {Math.round(analyzedMealData.calories)} kcal • P {Math.round(analyzedMealData.protein)}g • C {Math.round(analyzedMealData.carbs)}g • F {Math.round(analyzedMealData.fats)}g
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  closeDialog();
                }}
                className="h-9 px-3 rounded-lg border border-border/40"
              >
                Bearbeiten
              </button>
              <button
                onClick={async () => {
                  await persistAnalyzedMeal();
                }}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground"
              >
                Speichern
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
