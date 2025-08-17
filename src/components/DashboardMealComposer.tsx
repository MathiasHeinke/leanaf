import React, { useState, useCallback, Suspense, lazy, useRef } from "react";
import { Camera, Mic, ArrowRight, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const QuickMealSheet = lazy(() => import("@/components/quick/QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));

export const DashboardMealComposer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "photo" | "voice">("text");
  const {
    inputText,
    setInputText,
    uploadedImages,
    isRecording,
    handleVoiceRecord,
    handlePhotoUpload,
    removeImage,
    resetForm,
    isAnalyzing
  } = useGlobalMealInput();
  const [quickMealSheetOpen, setQuickMealSheetOpen] = useState(false);
  const { isEnabled } = useFeatureFlags();
  const orchestrationEnabled = isEnabled('auto_tool_orchestration');
  const { user } = useAuth();
  const { sendEvent } = useOrchestrator();

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
    openQuickMealSheet("voice");
  }, [handleVoiceRecord]);

  const handleTextTap = useCallback(() => {
    setActiveTab("text");
    setQuickMealSheetOpen(true);
  }, []);

  const openQuickMealSheet = useCallback((tab?: string) => {
    if (tab) setActiveTab(tab as any);
    setQuickMealSheetOpen(true);
  }, []);

  const closeQuickMealSheet = useCallback(() => {
    setQuickMealSheetOpen(false);
  }, []);


const handleSubmit = useCallback(async () => {
  if (!inputText.trim()) return;
  setActiveTab("text");
  openQuickMealSheet("text");
  if (orchestrationEnabled && user?.id) {
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
}, [inputText, openQuickMealSheet, orchestrationEnabled, user?.id, sendEvent]);

  return (
    <>
      {/* Bottom Composer Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-20 bg-background/80 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="container mx-auto px-4 py-3 max-w-5xl">
          {uploadedImages.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {uploadedImages.map((url, idx) => (
                  <div key={url + idx} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Hochgeladene Mahlzeit ${idx + 1}`}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; console.warn('Composer thumbnail failed, placeholder used:', url); }}
                      className="h-10 w-10 rounded-md object-cover border border-border"
                    />
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 rounded-full bg-background border border-border shadow p-1 hover:bg-muted transition"
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
              <span className="text-xs text-muted-foreground tabular-nums">{uploadedImages.length}/{maxImages}</span>
              {lastDropIgnored && (
                <span className="hidden sm:inline text-xs text-muted-foreground">Max. {maxImages} – überzählige ignoriert</span>
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
              <input
                type="text"
                placeholder="Beschreibe deine Mahlzeit…"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onClick={handleTextTap}
                onFocus={handleTextTap}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
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

      {/* Quick sheet for rich input experience */}
      <Suspense fallback={null}>
        {quickMealSheetOpen && (
          <QuickMealSheet
            open={quickMealSheetOpen}
            onOpenChange={(open) => !open && closeQuickMealSheet()}
          />
        )}
      </Suspense>

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
    </>
  );
};
