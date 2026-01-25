/**
 * RotatingThinkingIndicator - "Die Illusion von Leben"
 * 
 * Transforms technical backend steps into a cognitive "thought stream"
 * with smooth animations and human-readable messages.
 * 
 * @version 1.0.0
 */

import React from 'react';
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// COGNITIVE ORDERING (Wie ein Mensch denkt)
// ═══════════════════════════════════════════════════════════════════════════════
const COGNITIVE_ORDER: Record<string, number> = {
  'start': 0,       // Initialer "Denke nach..."
  'analyze': 1,     // Verstehen (Intent)
  'persona': 2,     // Persönlichkeit laden
  'history': 3,     // Kurzzeitgedächtnis
  'memory': 4,      // Langzeitgedächtnis
  'health': 5,      // Gesundheitsdaten
  'bloodwork': 6,   // Blutwerte
  'knowledge': 7,   // Fachwissen (RAG)
  'searching': 8,   // Recherche Start
  'analyzing': 9,   // Recherche Analyse
  'citing': 10,     // Quellen prüfen
};

// ═══════════════════════════════════════════════════════════════════════════════
// HUMANIZING LAYER - Technische IDs → Menschliche Gedanken
// ═══════════════════════════════════════════════════════════════════════════════
const COGNITIVE_MAPPING: Record<string, { text: string; icon: React.ComponentType<{ className?: string }> }> = {
  'start':      { text: "Denke nach...", icon: BrainCircuit },
  'analyze':    { text: "Verstehe den Kontext...", icon: BrainCircuit },
  'persona':    { text: "Passe mich an...", icon: Sparkles },
  'history':    { text: "Reflektiere unser Gespräch...", icon: MessageSquareQuote },
  'memory':     { text: "Verknüpfe Erinnerungen...", icon: Sparkles },
  'health':     { text: "Prüfe Gesundheitsdaten...", icon: Activity },
  'bloodwork':  { text: "Analysiere Blutwerte...", icon: FlaskConical },
  'knowledge':  { text: "Rufe Expertenwissen ab...", icon: Database },
  'searching':  { text: "Recherchiere Fakten...", icon: Search },
  'analyzing':  { text: "Werte Studien aus...", icon: FlaskConical },
  'citing':     { text: "Prüfe Quellen...", icon: Search },
};

export const RotatingThinkingIndicator: React.FC<Props> = ({ steps }) => {
  // Sortiere nach kognitiver Reihenfolge
  const sortedSteps = [...steps]
    .filter(s => COGNITIVE_ORDER[s.step] !== undefined)
    .sort((a, b) => (COGNITIVE_ORDER[a.step] ?? 99) - (COGNITIVE_ORDER[b.step] ?? 99));

  // Zeige den aktuell aktiven Step (nicht-complete) oder den letzten
  const currentStep = sortedSteps.find(s => !s.complete) || sortedSteps[sortedSteps.length - 1];

  if (!currentStep) return null;

  const mapping = COGNITIVE_MAPPING[currentStep.step] || { text: currentStep.message, icon: BrainCircuit };
  const Icon = mapping.icon;

  return (
    <div className="flex flex-col items-start gap-2 py-1">
      
      {/* Der "Gedanken-Ticker" */}
      <div className="flex items-center gap-3 h-6 overflow-hidden relative w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.step}
            initial={{ y: 15, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -15, opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 absolute left-0"
          >
            <Icon className="w-4 h-4 animate-pulse text-primary/70" />
            <span className="text-sm font-medium tracking-wide text-muted-foreground">
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
              scale: step.step === currentStep.step ? 1.3 : 1,
              opacity: step.complete ? 0.6 : (step.step === currentStep.step ? 1 : 0.2),
            }}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              step.complete ? 'bg-primary' : (step.step === currentStep.step ? 'bg-primary/80' : 'bg-muted-foreground/30')
            }`}
          />
        ))}
      </div>
    </div>
  );
};
