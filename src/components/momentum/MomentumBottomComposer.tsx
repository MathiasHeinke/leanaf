import React, { useState, useCallback, Suspense, lazy, useRef } from "react";
import { Camera, Mic, ArrowRight, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/hooks/useAuth";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import ChoiceBar from "@/components/ChoiceBar";
import ConfirmMealModal from "@/components/ConfirmMealModal";
import { toast } from "sonner";

const QuickMealSheet = lazy(() => import("@/components/quick/QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));

export const MomentumBottomComposer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "photo" | "voice">("text");
  const { inputText, setInputText, uploadImages, handleVoiceRecord, isRecording, quickMealSheetOpen, openQuickMealSheet, closeQuickMealSheet } = useGlobalMealInput();
  const { isEnabled } = useFeatureFlags();
  const orchestrationEnabled = isEnabled('auto_tool_orchestration');
  const { user } = useAuth();
  const { sendEvent } = useOrchestrator();
 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoTap = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) {
      await uploadImages(files);
      setActiveTab("photo");
      openQuickMealSheet("photo");
      e.currentTarget.value = "";
    }
  }, [uploadImages]);
 
  const handleVoiceTap = useCallback(async () => {
    await handleVoiceRecord();
    setActiveTab("voice");
    openQuickMealSheet("voice");
  }, [handleVoiceRecord, openQuickMealSheet]);

  const handleTextTap = useCallback(() => {
    setActiveTab("text");
    openQuickMealSheet("text");
  }, [openQuickMealSheet]);

const handleSubmit = useCallback(async () => {
  if (inputText.trim()) {
    setActiveTab("text");
    openQuickMealSheet("text");
    // Optional: Orchestrator-Routing (nicht blockierend)
    if (orchestrationEnabled && user?.id) {
      try {
        await sendEvent(user.id, {
          type: 'TEXT',
          text: inputText.trim(),
          clientEventId: crypto.randomUUID(),
          context: { source: 'momentum', coachMode: 'nutrition' }
        });
      } catch (e) {
        // still ok – QuickSheet bleibt der Fast-Path
        console.debug('Orchestrator sendEvent failed (non-blocking)', e);
      }
    }
  }
}, [inputText, openQuickMealSheet, orchestrationEnabled, user?.id, sendEvent]);

  return (
    <>
      {/* Bottom Composer Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="container mx-auto px-4 py-3 max-w-5xl">
          <div className="flex items-center gap-3">
            {/* Photo Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePhotoTap}
              className="flex-shrink-0 h-10 w-10"
              aria-label="Foto hinzufügen"
            >
              <Camera className="h-5 w-5" />
            </Button>

            {/* Voice Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleVoiceTap}
              className="flex-shrink-0 h-10 w-10"
              aria-label={isRecording ? "Aufnahme stoppen" : "Sprachaufnahme"}
            >
              {isRecording ? (
                <Square className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Beschreibe deine Mahlzeit…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onClick={handleTextTap}
                onFocus={handleTextTap}
                className="w-full h-10 px-4 bg-muted/50 border border-border rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>

            {/* Submit Button */}
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              className="flex-shrink-0 h-10 w-10 rounded-full"
              aria-label="Mahlzeit hinzufügen"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Meal Sheet */}
      <Suspense fallback={null}>
        <QuickMealSheet 
          open={quickMealSheetOpen} 
          onOpenChange={(open) => open ? openQuickMealSheet() : closeQuickMealSheet()}
        />
      </Suspense>
    </>
  );
};