import React, { useState, useCallback, Suspense, lazy, useRef, useEffect } from "react";
import { Camera, Mic, ArrowRight, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalMealInput } from "@/hooks/useGlobalMealInput";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/hooks/useAuth";
import { useOrchestrator } from "@/hooks/useOrchestrator";
import ChoiceBar from "@/components/ChoiceBar";
import ConfirmMealModal from "@/components/ConfirmMealModal";
import ConfirmSupplementModal from "@/components/ConfirmSupplementModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSupplementRecognition } from "@/hooks/useSupplementRecognition";
import { Card, CardContent } from "@/components/ui/card";
import { IMAGE_UPLOAD_MAX_DEFAULT } from "@/lib/constants";
import { quickAddBus } from "@/components/quick/quickAddBus";
const QuickMealSheet = lazy(() => import("@/components/quick/QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));

export const MomentumBottomComposer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"text" | "photo" | "voice">("text");
  const { inputText, setInputText, uploadImages, appendUploadedImages, handleVoiceRecord, isRecording, quickMealSheetOpen, openQuickMealSheet, closeQuickMealSheet, uploadedImages } = useGlobalMealInput();
  const { isEnabled } = useFeatureFlags();
  const orchestrationEnabled = isEnabled('auto_tool_orchestration');
  const { user } = useAuth();
  const { sendEvent } = useOrchestrator();

  const [clarify, setClarify] = useState<{ prompt: string; options: string[]; traceId?: string } | null>(null);
  const [confirmMeal, setConfirmMeal] = useState<{ open: boolean; prompt: string; proposal: any; traceId?: string }>({ open: false, prompt: '', proposal: null, traceId: undefined });
  const [confirmSupplement, setConfirmSupplement] = useState<{ open: boolean; prompt: string; proposal: any; traceId?: string }>({ open: false, prompt: '', proposal: null, traceId: undefined });
  const [pendingConfirm, setPendingConfirm] = useState<{ kind: 'meal' | 'supplement'; prompt: string; proposal: any; traceId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

const multiImageEnabled = isEnabled('multiImageIntake');
const [maxImages, setMaxImages] = useState<number>(IMAGE_UPLOAD_MAX_DEFAULT);
const [lastDropIgnored, setLastDropIgnored] = useState<boolean>(false);
const [ephemeral, setEphemeral] = useState<string | null>(null);
const [multiPreview, setMultiPreview] = useState<{
  preview?: { title?: string; description?: string; bullets?: string[] };
  items?: any[];
  topPickIdx?: number;
  traceId?: string;
} | null>(null);

const { addRecognizedSupplementsToStack } = useSupplementRecognition();

  // Bind QuickAdd "meal" to open the composer sheet
  useEffect(() => {
    const unsubscribe = quickAddBus.subscribe((action) => {
      if (action.type === 'meal') {
        setActiveTab('text');
        openQuickMealSheet('text');
      }
    });
    return unsubscribe;
  }, [openQuickMealSheet]);

  const handlePhotoTap = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : [];
  if (!files.length) return;

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

  const urls = await uploadImages(selected);
  e.currentTarget.value = "";

  if (!urls || urls.length === 0) return;

  appendUploadedImages(urls);
  setActiveTab("photo");
  openQuickMealSheet("photo");

  // Route to multi-image-intake if enabled and more than one image
  if (multiImageEnabled && user?.id && urls.length > 1) {
    const groupTraceId = crypto.randomUUID();
    const headers: Record<string, string> = {
      'x-trace-id': groupTraceId,
      'x-chat-mode': 'nutrition',
      'x-source': 'momentum',
    };

    // FE-side cap as a fallback
    let images = urls;
    if (images.length > maxImages) {
      toast.info(`Sende nur die ersten ${maxImages} Bilder.`);
      images = images.slice(0, maxImages);
    }

    try {
      // Telemetry: client ack
      try {
        await supabase.rpc('log_trace_event', {
          p_trace_id: groupTraceId,
          p_stage: 'client_ack',
          p_data: { source: 'momentum', nImages: images.length }
        });
      } catch (_) { /* non-fatal */ }

      setEphemeral('Ich schaue mir deine Bilder kurz an …');
      const { data, error } = await supabase.functions.invoke('multi-image-intake', {
        body: { userId: user.id, images, message: '' },
        headers,
      });
      setEphemeral(null);

      if (error) {
        if (typeof error.message === 'string' && error.message.includes('too_many_images')) {
          toast.info(`Maximal ${maxImages} Bilder. Bitte erneut auswählen.`);
          return;
        }
        toast.error('Dauert länger als üblich – bitte erneut senden.');
        return;
      }
      if (!data?.ok) {
        toast.error('Analyse fehlgeschlagen – bitte erneut senden.');
        return;
      }

      if (typeof data.max === 'number') setMaxImages(data.max);

      const preview = data.preview ?? {};
      const consolidated = data.consolidated ?? {};
      const items = consolidated.items ?? [];
      const topPickIdx = consolidated.topPickIdx ?? 0;

      setMultiPreview({ preview, items, topPickIdx, traceId: data.traceId });

      // Telemetry: UI preview shown
      try {
        await supabase.rpc('log_trace_event', {
          p_trace_id: data.traceId ?? groupTraceId,
          p_stage: 'ui_preview_shown',
          p_data: { nImages: images.length }
        });
      } catch (_) { /* non-fatal */ }

      return; // Skip legacy per-image orchestration
    } catch (err: any) {
      setEphemeral(null);
      if (err?.message?.includes('too_many_images')) {
        toast.info(`Maximal ${maxImages} Bilder. Bitte erneut auswählen.`);
      } else {
        toast.error('Analyse fehlgeschlagen – bitte erneut versuchen.');
      }
      return;
    }
  }

  // Existing per-image orchestrator flow (unchanged)
  if (orchestrationEnabled && user?.id) {
    const groupTraceId = crypto.randomUUID();
    for (const url of urls) {
      try {
        const reply = await sendEvent(
          user.id,
          {
            type: 'IMAGE',
            url,
            clientEventId: crypto.randomUUID(),
            context: { source: 'momentum', coachMode: 'nutrition', image_type: 'food', coachId: 'lucy' }
          },
          groupTraceId
        );
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
        console.debug('Orchestrator IMAGE sendEvent failed (non-blocking)', e);
      }
    }
  }
}, [uploadImages, appendUploadedImages, multiImageEnabled, orchestrationEnabled, user?.id, sendEvent, openQuickMealSheet]);

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
              capture="environment"
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

      {/* Ephemeral status bubble */}
      {ephemeral && (
        <div className="container mx-auto px-4 mt-2 max-w-5xl">
          <Card>
            <CardContent className="py-3 text-sm">{ephemeral}</CardContent>
          </Card>
        </div>
      )}

      {/* Multi-image preview card */}
      {multiPreview && (
        <div className="container mx-auto px-4 mt-2 max-w-5xl">
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-base font-medium">{multiPreview.preview?.title ?? 'Vorschau'}</h3>
                {multiPreview.preview?.description && (
                  <p className="text-sm text-muted-foreground">{multiPreview.preview.description}</p>
                )}
                {Array.isArray(multiPreview.preview?.bullets) && (
                  <ul className="list-disc pl-5 text-sm">
                    {(multiPreview.preview?.bullets ?? []).slice(0, 5).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => {
                    const items = multiPreview.items ?? [];
                    const topPickIdx = multiPreview.topPickIdx ?? 0;
                    setConfirmSupplement({ open: true, prompt: 'Speichern?', proposal: { items, topPickIdx }, traceId: multiPreview.traceId });
                    setMultiPreview(null);
                  }}>Speichern</Button>
                  <Button variant="outline" onClick={() => {
                    const items = multiPreview.items ?? [];
                    const topPickIdx = multiPreview.topPickIdx ?? 0;
                    setConfirmSupplement({ open: true, prompt: 'Dosis/Timing anpassen', proposal: { items, topPickIdx }, traceId: multiPreview.traceId });
                  }}>Dosis/Timing anpassen</Button>
                </div>
              </div>
            </CardContent>
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
                if (res.kind === 'confirm_save_meal') { setPendingConfirm({ kind: 'meal', prompt: res.prompt, proposal: res.proposal, traceId: res.traceId }); }
                if (res.kind === 'confirm_save_supplement') { setPendingConfirm({ kind: 'supplement', prompt: res.prompt, proposal: res.proposal, traceId: res.traceId }); }
              } else if (choice === (pendingConfirm.kind === 'meal' ? 'Jetzt speichern' : 'In Stack aufnehmen')) {
                if (pendingConfirm.kind === 'meal') {
                  setConfirmMeal({ open: true, prompt: pendingConfirm.prompt, proposal: pendingConfirm.proposal, traceId: pendingConfirm.traceId });
                } else {
                  setConfirmSupplement({ open: true, prompt: pendingConfirm.prompt, proposal: pendingConfirm.proposal, traceId: pendingConfirm.traceId });
                }
                setPendingConfirm(null);
              } else {
                setPendingConfirm(null);
              }
            }}
          />
        </div>
      )}

      <ConfirmMealModal
        open={confirmMeal.open}
        prompt={confirmMeal.prompt}
        proposal={confirmMeal.proposal}
        onConfirm={async () => {
          try {
            if (!user?.id || !confirmMeal.proposal) return;
            const p = confirmMeal.proposal as any;
            const clientEventId = crypto.randomUUID();
            await supabase.from('meals').insert({
              user_id: user.id,
              client_event_id: clientEventId,
              text: p.title || 'Mahlzeit',
              calories: Math.round(p.calories || 0),
              protein: Math.round(p.protein || 0),
              carbs: Math.round(p.carbs || 0),
              fats: Math.round(p.fats || 0),
            });
            toast.success('Mahlzeit gespeichert');
          } catch (e) {
            toast.error('Speichern fehlgeschlagen');
          } finally {
            setConfirmMeal(prev => ({ ...prev, open: false }));
          }
        }}
        onClose={() => setConfirmMeal(prev => ({ ...prev, open: false }))}
      />

      <ConfirmSupplementModal
        open={confirmSupplement.open}
        prompt={confirmSupplement.prompt}
        proposal={confirmSupplement.proposal}
        onConfirm={async () => {
          try {
            const p = confirmSupplement.proposal as any;
            const items = Array.isArray(p?.items) ? p.items : [];
            const recognized = items.map((i: any) => ({
              product_name: i.name,
              supplement_match: i.canonical,
              supplement_id: null,
              confidence: i.confidence,
              quantity_estimate: i.dose ?? undefined,
              notes: i.notes ?? undefined,
            }));
            await addRecognizedSupplementsToStack(recognized);
            toast.success('Supplemente gespeichert');
          } catch (e) {
            toast.error('Speichern fehlgeschlagen');
          } finally {
            setConfirmSupplement(prev => ({ ...prev, open: false }));
          }
        }}
        onClose={() => setConfirmSupplement(prev => ({ ...prev, open: false }))}
      />

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