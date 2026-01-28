/**
 * JournalLogger - Mindset Journal with Voice Recording & Guided Reflection
 * Uses useEnhancedVoiceRecording for robust transcription with crash recovery
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Target, Sparkles, Mic, Square, Camera, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAresEvents } from '@/hooks/useAresEvents';
import { useEnhancedVoiceRecording } from '@/hooks/useEnhancedVoiceRecording';
import { VoiceVisualizer } from '@/components/mindset-journal/VoiceVisualizer';
import { toast } from 'sonner';

// === TYPES ===
type JournalCategory = 'dankbarkeit' | 'reflektion' | 'ziele';
type TimeOfDay = 'morning' | 'midday' | 'evening';

interface JournalLoggerProps {
  onClose: () => void;
}

// === CATEGORY CONFIG ===
const CATEGORIES = [
  { id: 'dankbarkeit' as const, icon: Heart, label: 'Dankbarkeit', color: 'text-pink-500' },
  { id: 'reflektion' as const, icon: Target, label: 'Reflektion', color: 'text-blue-500' },
  { id: 'ziele' as const, icon: Sparkles, label: 'Ziele', color: 'text-amber-500' },
] as const;

// === DYNAMIC PROMPTS BY CATEGORY + TIME ===
const JOURNAL_PROMPTS: Record<JournalCategory, Record<TimeOfDay, string>> = {
  dankbarkeit: {
    morning: "Wofür bist du heute Morgen dankbar?",
    midday: "Was hat dich heute positiv überrascht?",
    evening: "Welche 3 Dinge waren heute gut?"
  },
  reflektion: {
    morning: "Wie startest du heute in den Tag?",
    midday: "Was hast du heute über dich gelernt?",
    evening: "Was würdest du morgen anders machen?"
  },
  ziele: {
    morning: "Was ist dein Fokus für heute?",
    midday: "Wie kommst du bei deinen Zielen voran?",
    evening: "Welches Ziel verfolgst du morgen?"
  }
};

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morgen',
  midday: 'Mittag',
  evening: 'Abend'
};

// === HELPER FUNCTIONS ===
const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'midday';
  return 'evening';
};

// === COMPONENT ===
export const JournalLogger: React.FC<JournalLoggerProps> = ({ onClose }) => {
  const [category, setCategory] = useState<JournalCategory>('dankbarkeit');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { trackEvent } = useAresEvents();
  
  const {
    isRecording,
    isProcessing,
    transcribedText,
    audioLevel,
    startRecording,
    stopRecording,
    hasCachedAudio,
    retryTranscription,
    clearTranscription
  } = useEnhancedVoiceRecording();
  
  // Compute time-based prompt
  const timeOfDay = useMemo(() => getTimeOfDay(), []);
  const currentPrompt = useMemo(() => 
    JOURNAL_PROMPTS[category][timeOfDay], 
    [category, timeOfDay]
  );
  
  // Sync transcribed text to content
  React.useEffect(() => {
    if (transcribedText && !content) {
      setContent(transcribedText);
    }
  }, [transcribedText, content]);
  
  // Handle voice button click
  const handleVoiceClick = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      // Clear previous content if starting fresh recording
      if (!content) {
        clearTranscription();
      }
      await startRecording();
    }
  }, [isRecording, content, startRecording, stopRecording, clearTranscription]);
  
  // Handle save
  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      toast.error('Bitte schreibe oder sprich deinen Gedanken');
      return;
    }
    
    setIsSaving(true);
    console.log('[JournalLogger] Saving entry:', { category, contentLength: content.trim().length });
    
    try {
      const success = await trackEvent('journal', {
        content: content.trim(),
        mood: category,
        entry_type: transcribedText ? 'voice' : 'text',
        prompt_used: currentPrompt
      });
      
      if (success) {
        toast.success('Tagebuch gespeichert ✨');
        // Dispatch completion event for ActionCardStack
        window.dispatchEvent(new CustomEvent('ares-card-completed', { 
          detail: { cardType: 'journal' }
        }));
        onClose();
      } else {
        console.error('[JournalLogger] trackEvent returned false');
        // useAresEvents already shows error toast
      }
    } catch (err) {
      console.error('[JournalLogger] Unexpected error:', err);
      toast.error('Unerwarteter Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  }, [content, category, transcribedText, currentPrompt, trackEvent, onClose]);
  
  const activeCategory = CATEGORIES.find(c => c.id === category)!;
  
  return (
    <div className="space-y-5 pb-20">
      {/* CATEGORY CHIPS */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.id;
          
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : cat.color)} />
              {cat.label}
            </motion.button>
          );
        })}
      </div>
      
      {/* PROMPT CARD */}
      <motion.div 
        layout
        className="relative overflow-hidden rounded-2xl bg-accent/50 dark:bg-accent/30 border border-border/50 p-5"
      >
        {/* Tags */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 dark:bg-background/20 text-xs font-medium text-muted-foreground">
            <Clock className="w-3 h-3" />
            {TIME_LABELS[timeOfDay]}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/60 dark:bg-background/20 text-xs font-medium",
            activeCategory.color
          )}>
            <activeCategory.icon className="w-3 h-3" />
            {activeCategory.label}
          </span>
        </div>
        
        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentPrompt}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-lg font-semibold text-foreground"
          >
            "{currentPrompt}"
          </motion.p>
        </AnimatePresence>
      </motion.div>
      
      {/* VOICE RECORDING SECTION */}
      <div className="space-y-3">
        {/* Voice Visualizer (when recording) */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <VoiceVisualizer audioLevel={audioLevel} isRecording={isRecording} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Voice Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleVoiceClick}
          disabled={isProcessing}
          className={cn(
            "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition-all",
            isRecording
              ? "bg-destructive text-destructive-foreground shadow-lg"
              : isProcessing
                ? "bg-muted text-muted-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Transkribiere...
            </>
          ) : isRecording ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              Aufnahme stoppen
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Voice Input starten
            </>
          )}
        </motion.button>
        
        {/* Retry button (if cached audio exists and transcription failed) */}
        {hasCachedAudio && !isRecording && !isProcessing && !transcribedText && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={retryTranscription}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Transkription wiederholen
          </motion.button>
        )}
      </div>
      
      {/* TEXT INPUT */}
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Schreibe deine Gedanken..."
          className="min-h-[120px] resize-none rounded-2xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-base"
        />
        
        {transcribedText && (
          <p className="text-xs text-muted-foreground px-1">
            ✨ Per Sprache erfasst – du kannst den Text bearbeiten
          </p>
        )}
      </div>
      
      {/* PHOTO PLACEHOLDER - Coming Soon */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-border/30 text-muted-foreground/50 cursor-not-allowed"
      >
        <Camera className="w-5 h-5" />
        <span className="text-sm font-medium">Foto hinzufügen (bald)</span>
      </motion.button>
      
      {/* STICKY SAVE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={handleSave}
          disabled={!content.trim() || isSaving || isRecording || isProcessing}
          className="w-full py-6 text-base font-semibold rounded-2xl shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            'Eintrag speichern'
          )}
        </Button>
      </div>
    </div>
  );
};
