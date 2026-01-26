/**
 * QuickLogSheet - Unified Apple-Health-Style Quick Log Overlay
 * Premium bottom sheet for Weight, Training, Sleep, and Journal tracking
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale, Dumbbell, Moon, BookOpen, Ruler, Pill, Syringe } from 'lucide-react';
import { cn } from '@/lib/utils';

import { WeightLogger } from './loggers/WeightLogger';
import { TrainingLogger } from './loggers/TrainingLogger';
import { SleepLogger } from './loggers/SleepLogger';
import { JournalLogger } from './loggers/JournalLogger';
import { TapeLogger } from './loggers/TapeLogger';
import { SupplementsLogger } from './loggers/SupplementsLogger';
import { PeptideLogger } from './loggers/PeptideLogger';

export type QuickLogTab = 'weight' | 'training' | 'sleep' | 'journal' | 'tape' | 'supplements' | 'peptide';

interface QuickLogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: QuickLogTab;
}

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

const tabs = [
  { id: 'weight' as const, icon: Scale, label: 'Gewicht' },
  { id: 'training' as const, icon: Dumbbell, label: 'Training' },
  { id: 'sleep' as const, icon: Moon, label: 'Schlaf' },
  { id: 'journal' as const, icon: BookOpen, label: 'Journal' },
  { id: 'tape' as const, icon: Ruler, label: 'Maße' },
  { id: 'supplements' as const, icon: Pill, label: 'Supps' },
  { id: 'peptide' as const, icon: Syringe, label: 'Peptide' },
];

export const QuickLogSheet: React.FC<QuickLogSheetProps> = ({ 
  isOpen, 
  onClose, 
  initialTab = 'weight' 
}) => {
  const [activeTab, setActiveTab] = useState<QuickLogTab>(initialTab);

  // Sync with initialTab when sheet opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          {/* SHEET */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed inset-x-0 bottom-0 z-[101] bg-background rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* ZONE A: Static Header - stays on top */}
            <div className="relative z-10 bg-background rounded-t-3xl">
              {/* DRAG HANDLE */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* HEADER & TABS */}
              <div className="px-5 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Quick Log</h2>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Schließen"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </motion.button>
                </div>

                {/* iOS STYLE SEGMENTED CONTROL */}
                <div className="relative flex bg-muted rounded-2xl p-1">
                  {/* Sliding Background */}
                  <motion.div
                    className="absolute top-1 bottom-1 bg-background rounded-xl shadow-sm"
                    style={{ width: `calc(${100 / 7}% - 4px)` }}
                    animate={{ 
                      x: `calc(${activeTabIndex * 100}% + ${activeTabIndex * 4}px)` 
                    }}
                    transition={springConfig}
                  />

                  {tabs.map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                        activeTab === tab.id
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground/80'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONE B: Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'weight' && <WeightLogger onClose={onClose} />}
                  {activeTab === 'training' && <TrainingLogger onClose={onClose} />}
                  {activeTab === 'sleep' && <SleepLogger onClose={onClose} />}
                  {activeTab === 'journal' && <JournalLogger onClose={onClose} />}
                  {activeTab === 'tape' && <TapeLogger onClose={onClose} />}
                  {activeTab === 'supplements' && <SupplementsLogger onClose={onClose} />}
                  {activeTab === 'peptide' && <PeptideLogger onClose={onClose} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickLogSheet;
