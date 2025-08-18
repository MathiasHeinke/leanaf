import React, { useState, useCallback, useRef, useEffect } from "react";
import { Camera, Mic, ArrowRight, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/hooks/useAuth";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import ChoiceBar from "@/components/ChoiceBar";
import ConfirmMealModal from "@/components/ConfirmMealModal";
import ConfirmSupplementModal from "@/components/ConfirmSupplementModal";
import { toast } from "sonner";
import { useSupplementRecognition } from "@/hooks/useSupplementRecognition";
import { Card, CardContent } from "@/components/ui/card";
import { IMAGE_UPLOAD_MAX_DEFAULT } from "@/lib/constants";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { SmartCardOverlay } from "@/components/SmartCardOverlay";
import { UploadProgress } from "@/components/UploadProgress";
import { useFrequentMeals, type Daypart } from "@/hooks/useFrequentMeals";
import { SmartChip } from "@/components/ui/smart-chip";

// Commented out for now - will be removed later once this is working perfectly
// const QuickMealSheet = lazy(() => import("@/components/quick/QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));

export const DashboardMealComposer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "photo" | "voice">("text");
  const {
    inputText,
    setInputText,
    uploadedImages,
    optimisticImages,
    isRecording,
    handleVoiceRecord,
    handlePhotoUpload,
    removeImage,
    removeOptimisticImage,
    resetForm,
    isAnalyzing,
    isUploading,
    uploadProgress,
    handleSubmitMeal
  } = useGlobalMealInput();
  const { isEnabled } = useFeatureFlags();
  const orchestrationEnabled = isEnabled('auto_tool_orchestration');
  const { user } = useAuth();
  const { sendEvent } = useOrchestrator();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Frequent meals for smart chips
  const { frequent: frequentMeals } = useFrequentMeals(user?.id, 60);

  const [clarify, setClarify] = useState<{ prompt: string; options: string[]; traceId?: string } | null>(null);
  const [confirmMeal, setConfirmMeal] = useState<{ open: boolean; prompt: string; proposal: any; traceId?: string }>({ open: false, prompt: '', proposal: null, traceId: undefined });
  const [confirmSupplement, setConfirmSupplement] = useState<{ open: boolean; prompt: string; proposal: any; traceId?: string }>({ open: false, prompt: '', proposal: null, traceId: undefined });
  const [pendingConfirm, setPendingConfirm] = useState<{ kind: 'meal' | 'supplement'; prompt: string; proposal: any; traceId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [maxImages, setMaxImages] = useState<number>(IMAGE_UPLOAD_MAX_DEFAULT);
  const [lastDropIgnored, setLastDropIgnored] = useState<boolean>(false);

const { addRecognizedSupplementsToStack } = useSupplementRecognition();

  const handlePhotoTap = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : [];
  if (!files.length) return;

  console.log('📸 Image upload started:', files.length, 'files');

  // Enforce max files on selection
  let selected = files;
  if (files.length > maxImages) {
    selected = files.slice(0, maxImages);
    const dropped = files.length - selected.length;
    setLastDropIgnored(dropped > 0);
    if (dropped > 0) toast.info(`Max. ${maxImages} Bilder – ${dropped} ignoriert.`);
  } else {
    setLastDropIgnored(false);
  }

  await handlePhotoUpload(e);
  setActiveTab("photo");
}, [handlePhotoUpload, maxImages]);

  const handleVoiceTap = useCallback(async () => {
    await handleVoiceRecord();
    setActiveTab("voice");
    // Direct submission instead of opening QuickMealSheet
    if (inputText.trim() || uploadedImages.length > 0) {
      await handleSubmitMeal();
    }
  }, [handleVoiceRecord, inputText, uploadedImages, handleSubmitMeal]);

  // Auto-resize textarea function
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 20; // Approximate line height
    const maxLines = 5;
    const maxHeight = lineHeight * maxLines;
    
    if (scrollHeight <= maxHeight) {
      textarea.style.height = `${Math.max(scrollHeight, lineHeight)}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    }
  }, []);

  // Adjust height when text changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  // Get current time-based meal suggestions
  const getCurrentMealSuggestions = useCallback(() => {
    if (!frequentMeals) return [];
    
    const hour = new Date().getHours();
    let currentDaypart: Daypart;
    
    if (hour >= 5 && hour < 11) currentDaypart = "morning";
    else if (hour >= 11 && hour < 15) currentDaypart = "noon";
    else if (hour >= 15 && hour < 22) currentDaypart = "evening";
    else currentDaypart = "night";
    
    return frequentMeals[currentDaypart] || [];
  }, [frequentMeals]);

  const handleMealChipClick = useCallback((mealText: string) => {
    setInputText(mealText);
    setActiveTab("text");
    // Focus on textarea after setting text
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, [setInputText]);


const handleSubmit = useCallback(async () => {
  // Check if we have content to submit
  const hasImages = uploadedImages.length > 0;
  const hasText = inputText.trim();
  
  if (!hasText && !hasImages) return;
  
  // Direct submission - both text and images go directly to analysis
  await handleSubmitMeal();
  
  // Optional: still use orchestrator for enhanced experience if enabled
  if (orchestrationEnabled && user?.id && hasText) {
    try {
      const reply = await sendEvent(user.id, {
        type: 'TEXT',
        text: inputText.trim(),
        clientEventId: crypto.randomUUID(),
        context: { source: 'momentum', coachMode: 'nutrition', coachId: 'lucy' }
      });
      if (reply.kind === 'message') {
        toast.message(reply.text);
        setClarify(null);
      } else if (reply.kind === 'clarify') {
        setClarify({ prompt: reply.prompt, options: reply.options, traceId: reply.traceId });
      } else if (reply.kind === 'confirm_save_meal') {
        setPendingConfirm({ kind: 'meal', prompt: reply.prompt, proposal: reply.proposal, traceId: reply.traceId });
        setClarify(null);
      } else if (reply.kind === 'confirm_save_supplement') {
        setPendingConfirm({ kind: 'supplement', prompt: reply.prompt, proposal: reply.proposal, traceId: reply.traceId });
        setClarify(null);
      }
    } catch (e) {
      console.debug('Orchestrator sendEvent failed (non-blocking)', e);
    }
  }
}, [inputText, uploadedImages, handleSubmitMeal, orchestrationEnabled, user?.id, sendEvent]);

  return (
    <>
      {/* Bottom Composer Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="container mx-auto px-4 py-3 max-w-5xl">
          {/* Upload Progress */}
          <UploadProgress progress={uploadProgress} isVisible={isUploading} />
          
          {/* Smart Chips for frequent meals based on time of day */}
          {getCurrentMealSuggestions().length > 0 && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto scroll-smooth flex-nowrap">
                {getCurrentMealSuggestions().map((meal, index) => (
                  <SmartChip
                    key={index}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMealChipClick(meal)}
                  >
                    {meal}
                  </SmartChip>
                ))}
              </div>
            </div>
          )}
          
          {/* Combined Images Display: Optimistic + Uploaded */}
          {(optimisticImages.length > 0 || uploadedImages.length > 0) && (
            <div className="mb-2">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {/* Optimistic images (instant preview) */}
                {optimisticImages.map((img, idx) => (
                  <div key={`optimistic-${idx}`} className="relative flex-shrink-0">
                    <img
                      src={img.blobUrl}
                      alt={`Wird hochgeladen ${idx + 1}`}
                      loading="lazy"
                      className={`h-10 w-10 rounded-md object-cover border cursor-pointer transition-opacity ${
                        img.status === 'uploading' ? 'opacity-60' : 
                        img.status === 'error' ? 'opacity-40 border-red-500' : 'opacity-100'
                      }`}
                      onClick={() => setSelectedImageUrl(img.blobUrl)}
                    />
                    {img.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {img.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <X className="h-3 w-3 text-red-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => removeOptimisticImage(idx)}
                      className="absolute -top-2 -right-2 rounded-full bg-background border border-border shadow p-1 hover:bg-muted transition z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* Successfully uploaded images */}
                {uploadedImages.map((url, idx) => (
                  <div key={`uploaded-${url}-${idx}`} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Hochgeladene Mahlzeit ${idx + 1}`}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; console.warn('Composer thumbnail failed, placeholder used:', url); }}
                      onClick={() => setSelectedImageUrl(url)}
                      className="h-10 w-10 rounded-md object-cover border border-border cursor-pointer hover:opacity-75 transition-opacity"
                    />
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 rounded-full bg-background border border-border shadow p-1 hover:bg-muted transition z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            {/* Counter + hint */}
            <div className="flex items-center gap-2 -ml-2 mr-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {optimisticImages.length + uploadedImages.length}/{maxImages}
              </span>
              {lastDropIgnored && (
                <span className="hidden sm:inline text-xs text-muted-foreground">Max. {maxImages} – überzählige ignoriert</span>
              )}
              {isUploading && (
                <span className="text-xs text-primary">Lädt...</span>
              )}
            </div>

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
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Beschreibe deine Mahlzeit…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="w-full min-h-[40px] h-10 px-4 py-2.5 bg-muted/50 border border-border rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
                style={{
                  overflowY: 'hidden',
                  lineHeight: '20px'
                }}
              />
            </div>


            {/* Submit Button */}
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!inputText.trim() && uploadedImages.length === 0}
              className="flex-shrink-0 h-10 w-10 rounded-full"
              aria-label="Mahlzeit hinzufügen"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Analysis Loading Status */}
      {isAnalyzing && (
        <div className="container mx-auto px-4 mt-2 max-w-5xl">
          <Card>
            <CardContent className="py-3 text-sm">🔍 Analysiere Bilder mit GPT-4o Vision...</CardContent>
          </Card>
        </div>
      )}

      {/* Orchestrator UI Responses */}
      {clarify && (
        <div className="container mx-auto px-4 mt-2 max-w-5xl">
          <ChoiceBar prompt={clarify.prompt} options={clarify.options} onPick={async (v) => {
            if (!user?.id) return;
            const res = await sendEvent(user.id, { type: 'TEXT', text: v, clientEventId: crypto.randomUUID(), context: { source: 'momentum', coachMode: 'nutrition', coachId: 'lucy', followup: true } });
            if (res.kind === 'message') { toast.message(res.text); setClarify(null); }
            if (res.kind === 'clarify') { setClarify({ prompt: res.prompt, options: res.options, traceId: res.traceId }); }
            if (res.kind === 'confirm_save_meal') { setPendingConfirm({ kind: 'meal', prompt: res.prompt, proposal: res.proposal, traceId: res.traceId }); setClarify(null); }
            if (res.kind === 'confirm_save_supplement') { setPendingConfirm({ kind: 'supplement', prompt: res.prompt, proposal: res.proposal, traceId: res.traceId }); setClarify(null); }
          }} />
        </div>
      )}

      {pendingConfirm && (
        <div className="container mx-auto px-4 mt-2 max-w-5xl">
          <ChoiceBar
            prompt={pendingConfirm.kind === 'meal' ? 'Ich sehe deine Mahlzeit. Möchtest du mehr Infos, jetzt speichern oder später?' : 'Ich sehe dein Supplement. Möchtest du mehr Infos, in den Stack aufnehmen oder später?'}
            options={pendingConfirm.kind === 'meal' ? ['Mehr Infos', 'Jetzt speichern', 'Später'] : ['Mehr Infos', 'In Stack aufnehmen', 'Später']}
            onPick={async (choice) => {
              if (!user?.id) return;
              if (choice === 'Mehr Infos') {
                const res = await sendEvent(user.id, {
                  type: 'TEXT',
                  text: 'Mehr Infos',
                  clientEventId: crypto.randomUUID(),
                  context: { source: 'momentum', coachMode: 'nutrition', coachId: 'lucy', followup: true, last_proposal: { kind: pendingConfirm.kind, data: pendingConfirm.proposal } }
                } as any);
                if (res.kind === 'message') { toast.message(res.text); setClarify(null); }
                if (res.kind === 'clarify') { setClarify({ prompt: res.prompt, options: res.options, traceId: res.traceId }); }
                if (res.kind === 'confirm_save_meal') { setConfirmMeal({ open: true, prompt: res.prompt, proposal: res.proposal, traceId: res.traceId }); }
                if (res.kind === 'confirm_save_supplement') { setConfirmSupplement({ open: true, prompt: res.prompt, proposal: res.proposal, traceId: res.traceId }); }
                setPendingConfirm(null);
              } else if (choice === 'Jetzt speichern' || choice === 'In Stack aufnehmen') {
                if (pendingConfirm.kind === 'meal') {
                  setConfirmMeal({ open: true, prompt: pendingConfirm.prompt, proposal: pendingConfirm.proposal, traceId: pendingConfirm.traceId });
                } else {
                  setConfirmSupplement({ open: true, prompt: pendingConfirm.prompt, proposal: pendingConfirm.proposal, traceId: pendingConfirm.traceId });
                }
                setPendingConfirm(null);
              } else if (choice === 'Später') {
                setPendingConfirm(null);
                setClarify(null);
              }
            }}
          />
        </div>
      )}

      {/* Quick sheet for rich input experience - COMMENTED OUT FOR NOW */}
      {/* <Suspense fallback={null}>
        {quickMealSheetOpen && (
          <QuickMealSheet
            open={quickMealSheetOpen}
            onOpenChange={(open) => !open && closeQuickMealSheet()}
          />
        )}
      </Suspense> */}

      {/* Confirmation modals */}
      <ConfirmMealModal
        open={confirmMeal.open}
        prompt={confirmMeal.prompt}
        proposal={confirmMeal.proposal}
        uploadedImages={uploadedImages}
        onConfirm={() => {
          // Handle meal confirmation
          setConfirmMeal({ open: false, prompt: '', proposal: null, traceId: undefined });
          // Reset form after confirmation
          resetForm();
        }}
        onClose={() => setConfirmMeal({ open: false, prompt: '', proposal: null, traceId: undefined })}
      />

      <ConfirmSupplementModal
        open={confirmSupplement.open}
        prompt={confirmSupplement.prompt}
        proposal={confirmSupplement.proposal}
        onConfirm={(pickedIdx, patch) => {
          // Handle supplement confirmation
          setConfirmSupplement({ open: false, prompt: '', proposal: null, traceId: undefined });
        }}
        onClose={() => setConfirmSupplement({ open: false, prompt: '', proposal: null, traceId: undefined })}
      />

      {/* Image Fullscreen Overlay */}
      <SmartCardOverlay
        isOpen={!!selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
        title="Bild anzeigen"
        icon="📷"
      >
        {selectedImageUrl && (
          <div className="flex items-center justify-center h-full">
            <img
              src={selectedImageUrl}
              alt="Vollbild"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
      </SmartCardOverlay>
    </>
  );
};
