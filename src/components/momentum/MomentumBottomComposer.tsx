import React, { useState, useCallback, Suspense, lazy } from "react";
import { Camera, Mic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";

const QuickMealSheet = lazy(() => import("@/components/quick/QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));

export const MomentumBottomComposer: React.FC = () => {
  const [mealOpen, setMealOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "photo" | "voice">("text");
  const { inputText, setInputText } = useGlobalMealInput();

  const handlePhotoTap = useCallback(() => {
    setActiveTab("photo");
    setMealOpen(true);
  }, []);

  const handleVoiceTap = useCallback(() => {
    setActiveTab("voice");
    setMealOpen(true);
  }, []);

  const handleTextTap = useCallback(() => {
    setActiveTab("text");
    setMealOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputText.trim()) {
      setActiveTab("text");
      setMealOpen(true);
    }
  }, [inputText]);

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
              aria-label="Sprachaufnahme"
            >
              <Mic className="h-5 w-5" />
            </Button>

            {/* Text Input */}
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
          open={mealOpen} 
          onOpenChange={setMealOpen}
        />
      </Suspense>
    </>
  );
};