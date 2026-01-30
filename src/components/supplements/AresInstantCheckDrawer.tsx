/**
 * AresInstantCheckDrawer - Inline ARES Supplement Analysis Overlay
 * 
 * Opens as a drawer/sheet over the supplement chip, displays
 * personalized AI analysis without leaving the editing context.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, AlertCircle, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAresInstantCheck, type SupplementAnalysisInput } from '@/hooks/useAresInstantCheck';

// Rotating loading messages for engaging UX
const LOADING_MESSAGES = [
  'Lade dein Profil...',
  'Prüfe Supplement-Stack...',
  'Analysiere Interaktionen...',
  'Prüfe Timing-Kompatibilität...',
  'Generiere Empfehlung...',
];

interface AresInstantCheckDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplement: SupplementAnalysisInput;
}

export const AresInstantCheckDrawer: React.FC<AresInstantCheckDrawerProps> = ({
  isOpen,
  onClose,
  supplement,
}) => {
  const { analyze, isLoading, result, error, reset } = useAresInstantCheck();
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Start analysis when drawer opens
  useEffect(() => {
    if (isOpen && supplement.name) {
      reset();
      analyze(supplement);
    }
  }, [isOpen, supplement.name]); // Only trigger on open and supplement name change

  // Rotate loading messages
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Reset loading message index when loading starts
  useEffect(() => {
    if (isLoading) {
      setLoadingMessageIndex(0);
    }
  }, [isLoading]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleRetry = useCallback(() => {
    reset();
    analyze(supplement);
  }, [reset, analyze, supplement]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[85vh]">
        {/* Header */}
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-base truncate">
                Analyse: {supplement.name}
              </DrawerTitle>
              {supplement.brandName && (
                <DrawerDescription className="text-xs truncate">
                  {supplement.brandName} • {supplement.dosage}{supplement.unit}
                </DrawerDescription>
              )}
            </div>
          </div>
        </DrawerHeader>

        {/* Content Area */}
        <div className="px-4 pb-4 min-h-[200px] max-h-[50vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Loading State */}
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                {/* Pulsing Icon */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="p-4 rounded-full bg-primary/10"
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>

                {/* Rotating Loading Text */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingMessageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-muted-foreground text-center"
                  >
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>

                {/* Progress Dots */}
                <div className="flex gap-1">
                  {LOADING_MESSAGES.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors duration-300',
                        i <= loadingMessageIndex ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Erneut versuchen
                </Button>
              </motion.div>
            )}

            {/* Result State */}
            {!isLoading && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="prose prose-sm dark:prose-invert max-w-none"
              >
                <ReactMarkdown
                  components={{
                    // Custom styling for markdown elements
                    p: ({ children }) => (
                      <p className="text-sm text-foreground mb-3 last:mb-0">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="text-sm space-y-1 mb-3 list-none pl-0">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm text-foreground">{children}</li>
                    ),
                  }}
                >
                  {result}
                </ReactMarkdown>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DrawerFooter className="pt-2">
          <Button onClick={handleClose} className="w-full">
            Verstanden
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AresInstantCheckDrawer;
