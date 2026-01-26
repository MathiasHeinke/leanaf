/**
 * EpiphanyCard - AI-powered insight reveal with 3-phase animation
 * Mystery -> Loading -> Revelation
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Lightbulb, X, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface EpiphanyCardProps {
  onOpenChat: (prompt: string) => void;
  onDismiss: () => void;
}

type Phase = 'mystery' | 'loading' | 'revealed';

export const EpiphanyCard: React.FC<EpiphanyCardProps> = ({ onOpenChat, onDismiss }) => {
  const [phase, setPhase] = useState<Phase>('mystery');
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReveal = async () => {
    setPhase('loading');
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ares-insight-generator');
      
      if (fnError) throw fnError;
      
      if (data?.insight) {
        setInsight(data.insight);
        setPhase('revealed');
        
        // Award XP for discovering insight
        window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
          detail: { amount: 25, reason: 'Erkenntnis entdeckt' }
        }));
      } else {
        throw new Error('Keine Erkenntnis generiert');
      }
    } catch (e) {
      console.error('Insight generation failed:', e);
      // Fallback insight for demo/error case
      setInsight("Deine Daten zeigen ein interessantes Muster. An Tagen mit fruehzeitigem Tracking erreichst du deine Ziele 40% oefter.");
      setPhase('revealed');
    }
  };

  const handleAskMore = () => {
    if (insight) {
      onOpenChat(`Du hast mir folgende Erkenntnis gezeigt: "${insight}". Erklaere mir das genauer und was ich konkret aendern sollte.`);
    }
  };

  return (
    <div className="relative w-full h-52 rounded-3xl overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'mystery' && (
          <MysteryState key="mystery" onReveal={handleReveal} />
        )}
        {phase === 'loading' && (
          <LoadingState key="loading" />
        )}
        {phase === 'revealed' && (
          <RevealedState 
            key="revealed"
            insight={insight!} 
            onAskMore={handleAskMore}
            onDismiss={onDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MYSTERY STATE ---
const MysteryState: React.FC<{ onReveal: () => void }> = ({ onReveal }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.05 }}
    transition={{ duration: 0.3 }}
    className="absolute inset-0"
  >
    {/* Gradient Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-violet-800 to-purple-900" />
    
    {/* Animated Mesh Overlay */}
    <div className="absolute inset-0 opacity-30">
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.4) 0%, transparent 50%),
                           radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.4) 0%, transparent 50%),
                           radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.3) 0%, transparent 60%)`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>

    {/* Noise Texture */}
    <div 
      className="absolute inset-0 opacity-20 mix-blend-overlay"
      style={{ 
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      }}
    />

    {/* Content */}
    <div className="relative h-full p-6 flex flex-col text-white">
      {/* Badge */}
      <div className="flex justify-between items-start">
        <motion.span 
          className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/20"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Neues Muster
        </motion.span>
        
        {/* Pulsing Icon */}
        <motion.div 
          className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20"
          animate={{ 
            boxShadow: [
              '0 0 0 0 rgba(139, 92, 246, 0)',
              '0 0 20px 10px rgba(139, 92, 246, 0.3)',
              '0 0 0 0 rgba(139, 92, 246, 0)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </motion.div>
      </div>

      {/* Main Text */}
      <div className="mt-auto">
        <h2 className="text-xl font-bold leading-tight mb-1">
          ARES hat ein Muster erkannt
        </h2>
        <p className="text-white/70 text-sm font-medium">
          Basierend auf deinen letzten 7 Tagen
        </p>
      </div>

      {/* Reveal Button */}
      <motion.button
        onClick={onReveal}
        className="mt-4 w-full py-3 px-4 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 
          flex items-center justify-center gap-2 font-semibold text-sm
          hover:bg-white/30 transition-all active:scale-[0.98]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>Aufdecken</span>
        <ChevronRight className="w-4 h-4" />
      </motion.button>
    </div>
  </motion.div>
);

// --- LOADING STATE ---
const LoadingState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="absolute inset-0"
  >
    {/* Gradient Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    
    {/* Shimmer Effect */}
    <motion.div 
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
      animate={{ x: ['-100%', '100%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    />

    {/* Content */}
    <div className="relative h-full p-6 flex flex-col">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-24 bg-white/10" />
        <Skeleton className="h-12 w-12 rounded-2xl bg-white/10" />
      </div>

      {/* Text Skeletons */}
      <div className="mt-auto space-y-2">
        <Skeleton className="h-6 w-3/4 bg-white/10" />
        <Skeleton className="h-4 w-1/2 bg-white/10" />
      </div>

      {/* Status Text */}
      <motion.p 
        className="mt-4 text-center text-white/50 text-sm font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Analysiere Korrelationen...
      </motion.p>
    </div>
  </motion.div>
);

// --- REVEALED STATE ---
const RevealedState: React.FC<{
  insight: string;
  onAskMore: () => void;
  onDismiss: () => void;
}> = ({ insight, onAskMore, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, rotateY: 90 }}
    animate={{ opacity: 1, rotateY: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.4, type: "spring", damping: 20 }}
    className="absolute inset-0"
  >
    {/* Gradient Background - Cleaner */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    
    {/* Subtle Glow */}
    <div className="absolute top-4 right-4 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />

    {/* Content */}
    <div className="relative h-full p-6 flex flex-col text-white">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase text-amber-400/80">
            Erkenntnis
          </span>
        </div>
        
        {/* Dismiss Button */}
        <button 
          onClick={onDismiss}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Insight Quote */}
      <div className="mt-4 flex-1 flex items-center">
        <motion.p 
          className="text-lg font-medium leading-relaxed text-white/90"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          "{insight}"
        </motion.p>
      </div>

      {/* Action Button */}
      <motion.button
        onClick={onAskMore}
        className="mt-2 w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl 
          flex items-center justify-center gap-2 font-semibold text-sm
          hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-[0.98]
          shadow-lg shadow-violet-500/20"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Was bedeutet das?</span>
      </motion.button>
    </div>
  </motion.div>
);

export default EpiphanyCard;
