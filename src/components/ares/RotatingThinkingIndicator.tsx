/**
 * RotatingThinkingIndicator - "Die Illusion von Leben"
 * 
 * Transforms technical backend steps into a cognitive "thought stream"
 * with smooth animations and human-readable messages.
 * 
 * @version 1.1.0 - Fixed layout clipping, added minimum display time
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BrainCircuit, 
  Sparkles, 
  Database, 
  Search, 
  MessageSquareQuote, 
  FlaskConical, 
  Activity 
} from 'lucide-react';

interface ThinkingStep {
  step: string;
  message: string;
  complete: boolean;
}

interface Props {
  steps: ThinkingStep[];
  inline?: boolean;  // Kompakte Darstellung neben Avatar
}

// ═══════════════════════════════════════════════════════════════════════════════
// COGNITIVE ORDERING (Wie ein Mensch denkt)
// ═══════════════════════════════════════════════════════════════════════════════
const COGNITIVE_ORDER: Record<string, number> = {
  'start': 0,         // Initialer "Denke nach..."
  'analyze': 1,       // Verstehen (Intent)
  'persona': 2,       // Persönlichkeit laden
  'history': 3,       // Kurzzeitgedächtnis
  'memory': 4,        // Langzeitgedächtnis
  'health': 5,        // Gesundheitsdaten
  'bloodwork': 6,     // Blutwerte
  'knowledge': 7,     // Fachwissen (RAG)
  'searching': 8,     // Recherche Start
  'analyzing': 9,     // Recherche Analyse
  'citing': 10,       // Quellen prüfen
  'personalizing': 11, // TL;DR mit Persona-Stimme
};

// ═══════════════════════════════════════════════════════════════════════════════
// HUMANIZING LAYER - Technische IDs → Menschliche Gedanken
// ═══════════════════════════════════════════════════════════════════════════════
const COGNITIVE_MAPPING: Record<string, { text: string; icon: React.ComponentType<{ className?: string }> }> = {
  'start':         { text: "Denke nach...", icon: BrainCircuit },
  'analyze':       { text: "Verstehe den Kontext...", icon: BrainCircuit },
  'persona':       { text: "Passe mich an...", icon: Sparkles },
  'history':       { text: "Reflektiere unser Gespräch...", icon: MessageSquareQuote },
  'memory':        { text: "Verknüpfe Erinnerungen...", icon: Sparkles },
  'health':        { text: "Prüfe Gesundheitsdaten...", icon: Activity },
  'bloodwork':     { text: "Analysiere Blutwerte...", icon: FlaskConical },
  'knowledge':     { text: "Rufe Expertenwissen ab...", icon: Database },
  'searching':     { text: "Recherchiere Fakten...", icon: Search },
  'analyzing':     { text: "Werte Studien aus...", icon: FlaskConical },
  'citing':        { text: "Prüfe Quellen...", icon: Search },
  'personalizing': { text: "Fasse für dich zusammen...", icon: Sparkles },
};

// Minimum display time per step (ms)
const MIN_STEP_DISPLAY_TIME = 800;

export const RotatingThinkingIndicator: React.FC<Props> = ({ steps, inline = false }) => {
  const [displayedStep, setDisplayedStep] = useState<ThinkingStep | null>(null);
  const lastChangeRef = useRef<number>(0);

  // Sortiere nach kognitiver Reihenfolge
  const sortedSteps = [...steps]
    .filter(s => COGNITIVE_ORDER[s.step] !== undefined)
    .sort((a, b) => (COGNITIVE_ORDER[a.step] ?? 99) - (COGNITIVE_ORDER[b.step] ?? 99));

  // Aktueller Step (nicht-complete) oder letzter
  const currentStep = sortedSteps.find(s => !s.complete) || sortedSteps[sortedSteps.length - 1];

  // Debounced Step-Wechsel (mindestens 800ms pro Step sichtbar)
  useEffect(() => {
    if (!currentStep) return;
    if (displayedStep?.step === currentStep.step) return;

    const elapsed = Date.now() - lastChangeRef.current;
    const delay = Math.max(0, MIN_STEP_DISPLAY_TIME - elapsed);

    const timeout = setTimeout(() => {
      setDisplayedStep(currentStep);
      lastChangeRef.current = Date.now();
    }, delay);

    return () => clearTimeout(timeout);
  }, [currentStep, displayedStep]);

  // Initial step sofort anzeigen
  useEffect(() => {
    if (!displayedStep && currentStep) {
      setDisplayedStep(currentStep);
      lastChangeRef.current = Date.now();
    }
  }, [currentStep, displayedStep]);

  if (!displayedStep) return null;

  const mapping = COGNITIVE_MAPPING[displayedStep.step] || { text: displayedStep.message, icon: BrainCircuit };
  const Icon = mapping.icon;

  // ══════════════════════════════════════════════════════════════════════════
  // INLINE MODE: Kompakte Darstellung neben Avatar
  // ══════════════════════════════════════════════════════════════════════════
  if (inline) {
    return (
      <AnimatePresence mode="wait">
        <motion.span
          key={displayedStep.step}
          initial={{ opacity: 0, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="text-xs text-muted-foreground flex items-center gap-1.5"
        >
          <Icon className="w-3 h-3 animate-pulse text-primary/70" />
          ARES {mapping.text.toLowerCase().replace('...', '')}...
        </motion.span>
      </AnimatePresence>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FULL MODE: Original-Darstellung mit Progress Dots
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col items-start gap-2 py-1">
      
      {/* Der "Gedanken-Ticker" */}
      <div className="flex items-center gap-3 min-h-[28px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayedStep.step}
            initial={{ y: 12, opacity: 0, filter: 'blur(3px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -12, opacity: 0, filter: 'blur(3px)' }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4 animate-pulse text-primary/70 flex-shrink-0" />
            <span className="text-sm font-medium tracking-wide text-muted-foreground whitespace-nowrap">
              {mapping.text}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Dots (subtil) */}
      <div className="flex gap-1.5 ml-1">
        {sortedSteps.map((step) => (
          <motion.div
            key={step.step}
            initial={false}
            animate={{
              scale: step.step === displayedStep.step ? 1.3 : 1,
              opacity: step.complete ? 0.6 : (step.step === displayedStep.step ? 1 : 0.2),
            }}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              step.complete ? 'bg-primary' : (step.step === displayedStep.step ? 'bg-primary/80' : 'bg-muted-foreground/30')
            }`}
          />
        ))}
      </div>
    </div>
  );
};
