import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, X, Minus, Plus } from 'lucide-react';
import { SuccessJournalWidget } from '@/components/success-journal/SuccessJournalWidget';

interface FloatingSuccessJournalProps {
  onKaiTransfer?: (text: string) => void;
}

export const FloatingSuccessJournal: React.FC<FloatingSuccessJournalProps> = ({ onKaiTransfer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Closed state - floating button
  if (!isOpen) {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-success text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
          size="icon"
        >
          <Brain className="h-6 w-6" />
        </Button>
      </motion.div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-72 bg-background/95 backdrop-blur-sm border-success/20 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-success" />
                <span>Erfolgsjournal</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(false)}
                  className="h-6 w-6 p-0 hover:bg-success/20"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  // Open state - full widget
  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="w-96 max-h-[calc(100vh-3rem)] bg-background/95 backdrop-blur-sm border-success/20 shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-success" />
                <span>Erfolgsjournal</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-6 w-6 p-0 hover:bg-success/20"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
            <SuccessJournalWidget 
              onKaiTransfer={onKaiTransfer}
            />
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};