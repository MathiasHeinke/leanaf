import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { Camera, Mic, SendHorizontal, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { safeToast } from "@/lib/safeToast";
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
    isEditingMode,
    enterEditMode,
    exitEditMode,
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

      const { data: mealInsert, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          text: analyzedMealData.title,
          calories: Math.round(analyzedMealData.calories || 0),
          protein: Math.round(analyzedMealData.protein || 0),
          carbs: Math.round(analyzedMealData.carbs || 0),
          fats: Math.round(analyzedMealData.fats || 0)
        })
        .select('id')
        .single();

      if (mealError) throw mealError;

      const newMealId = (mealInsert as any)?.id;

      // Persist uploaded images if present
      if ((uploadedImages?.length ?? 0) > 0 && newMealId) {
        const imageInserts = uploadedImages.map((imageUrl) => ({
          user_id: user.id,
          meal_id: newMealId,
          image_url: imageUrl,
        }));
        const { error: imagesError } = await supabase.from('meal_images').insert(imageInserts);
        if (imagesError) {
          console.warn('meal_images insert failed', imagesError);
        }
      }

      const hasPhoto = (uploadedImages?.length ?? 0) > 0;
      const basePoints = getMealBasePoints(hasPhoto);
      await awardPoints(hasPhoto ? 'meal_tracked_with_photo' : 'meal_tracked', basePoints, 'Schnell-Eintrag Mahlzeit');
      await updateStreak('meal_tracking');

      safeToast("meal-saved", toast.success, "Mahlzeit gespeichert!");
      triggerDataRefresh();
      closeDialog();
      onCloseAll();
    } catch (e: any) {
      console.error(e);
      safeToast("meal-error", toast.error, "Speichern fehlgeschlagen. Bitte erneut versuchen.");
    }
  };

  const getTimeBasedSuggestions = () => {
    const hour = new Date().getHours();
    if (hour < 10) return ['Haferflocken mit Beeren', 'Rührei mit Toast', 'Joghurt mit Müsli'];
    if (hour < 14) return ['Salat mit Hähnchen', 'Pasta mit Gemüse', 'Suppe mit Brot'];
    if (hour < 18) return ['Apfel mit Nüssen', 'Protein-Shake', 'Joghurt'];
    return ['Lachs mit Gemüse', 'Gemüse-Pfanne', 'Suppe'];
  };
  // Build suggestions from last 30 days, weighted by time of day
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const currentTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 14) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  };

  const normalize = (s: string) => s
    .toLowerCase()
    .replace(/:[\p{L}\p{N}_-]+:/gu, '') // strip emoji shortcodes
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // strip emojis
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // keep letters/numbers/spaces
    .replace(/\s+/g, ' ')
    .trim();

  const timeOfDayFrom = (mealType: string | null | undefined, ts?: string | null) => {
    if (mealType) {
      const t = mealType.toLowerCase();
      if (t.includes('früh') || t.includes('breakfast')) return 'breakfast';
      if (t.includes('mittag') || t.includes('lunch')) return 'lunch';
      if (t.includes('abend') || t.includes('dinner')) return 'dinner';
      if (t.includes('snack')) return 'snack';
    }
    const d = ts ? new Date(ts) : new Date();
    const h = d.getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  };

  useEffect(() => {
    const load = async () => {
      if (!open) return; // only load when sheet opens
      if (!user) return;
      try {
        const from = new Date();
        from.setDate(from.getDate() - 30);
        const { data, error } = await supabase
          .from('meals')
          .select('text, created_at, meal_type')
          .eq('user_id', user.id)
          .gte('created_at', from.toISOString())
          .order('created_at', { ascending: false })
          .limit(400);
        if (error) throw error;

        const map = new Map<string, { display: string; count: number; todHits: Record<string, number>; lastAt: number }>();
        (data || []).forEach((m: any) => {
          const title = (m.text || '').toString().trim();
          if (!title) return;
          const key = normalize(title);
          const tod = timeOfDayFrom(m.meal_type, m.created_at);
          const rec = map.get(key) || { display: title, count: 0, todHits: { breakfast: 0, lunch: 0, snack: 0, dinner: 0 }, lastAt: 0 };
          rec.display = title.length <= rec.display.length ? title : rec.display; // prefer shorter readable title
          rec.count += 1;
          rec.todHits[tod] = (rec.todHits[tod] || 0) + 1;
          rec.lastAt = Math.max(rec.lastAt, new Date(m.created_at).getTime());
          map.set(key, rec);
        });

        const nowTod = currentTimeOfDay();
        const ranked = Array.from(map.values())
          .map(r => {
            const todWeight = r.todHits[nowTod] || 0;
            const score = r.count * 1.0 + todWeight * 0.75 + (r.lastAt / 1000_000_000_000); // slight recency tiebreaker
            return { title: r.display, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(r => r.title);

        if (ranked.length > 0) setSuggestions(ranked);
        else setSuggestions([]);
      } catch (e) {
        console.error('Failed to load meal suggestions', e);
        setSuggestions([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  // Auto-trigger DISABLED to prevent infinite loops
  // Removed auto-trigger useEffect that was causing analysis loops
  // Users now manually trigger analysis via Submit button

  const getSmartPlaceholder = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'Was gab es zum Frühstück?';
    if (hour < 14) return 'Was gab es zum Mittagessen?';
    if (hour < 18) return 'Was gab es als Snack?';
    return 'Was gab es zum Abendessen?';
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
          <SheetTitle>
            {isEditingMode ? "Mahlzeit bearbeiten" : "Mahlzeit hinzufügen"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-3">
          {/* Text input */}
          <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur p-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={getSmartPlaceholder()}
              rows={3}
              className="w-full bg-transparent outline-none resize-none text-sm"
            />
            
            {/* Smart Suggestions */}
            {inputText.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(suggestions.length > 0 ? suggestions : getTimeBasedSuggestions()).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(suggestion)}
                    className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

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
                  if (analyzedMealData) {
                    enterEditMode(analyzedMealData);
                  }
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
