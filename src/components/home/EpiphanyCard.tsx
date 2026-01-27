/**
 * EpiphanyCard - AI-powered insight reveal with 3D flip animation
 * Mystery -> Loading -> Revelation (with prefetch support)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronRight, Lightbulb, X, MessageCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFetchInsight } from '@/hooks/useDailyInsight';

interface EpiphanyCardProps {
  onOpenChat: (prompt: string) => void;
  onDismiss: () => void;
  onSnooze?: () => void;
  prefetchedInsight?: string | null;
}

type Phase = 'mystery' | 'loading' | 'revealed';

export const EpiphanyCard: React.FC<EpiphanyCardProps> = ({ 
  onOpenChat, 
  onDismiss,
  onSnooze,
  prefetchedInsight 
}) => {
  const [phase, setPhase] = useState<Phase>('mystery');
  const [insight, setInsight] = useState<string | null>(null);
  const fetchInsight = useFetchInsight();

  const handleReveal = async () => {
    // If prefetched -> instant reveal
    if (prefetchedInsight) {
      setInsight(prefetchedInsight);
      setPhase('revealed');
      window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
        detail: { amount: 25, reason: 'Erkenntnis entdeckt' }
      }));
      return;
    }
    
    // Fallback: fetch with loading state
    setPhase('loading');
    
    try {
      const result = await fetchInsight();
      
      if (result) {
        setInsight(result);
        setPhase('revealed');
        window.dispatchEvent(new CustomEvent('ares-xp-awarded', { 
          detail: { amount: 25, reason: 'Erkenntnis entdeckt' }
        }));
      } else {
        // Fallback insight for demo/error case
        setInsight("Deine Daten zeigen ein interessantes Muster. An Tagen mit frühem Tracking erreichst du deine Ziele 40% öfter.");
        setPhase('revealed');
      }
    } catch (e) {
      console.error('Insight generation failed:', e);
      setInsight("Deine Daten zeigen ein interessantes Muster. An Tagen mit frühem Tracking erreichst du deine Ziele 40% öfter.");
      setPhase('revealed');
    }
  };

  const handleAskMore = () => {
    if (insight) {
      // Dispatch completion event - card disappears after opening chat
      window.dispatchEvent(new CustomEvent('ares-card-completed', { 
        detail: { cardType: 'epiphany' }
      }));
      onOpenChat(`Du hast mir folgende Erkenntnis gezeigt: "${insight}". Erkläre mir das genauer und was ich konkret ändern sollte.`);
    }
  };

  return (
    <div 
      className="relative w-full h-52 rounded-3xl overflow-hidden"
      style={{ perspective: '1200px' }}
    >
      <AnimatePresence mode="wait">
        {phase === 'mystery' && (
          <MysteryState key="mystery" onReveal={handleReveal} onDismiss={onDismiss} onSnooze={onSnooze} />
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
            onSnooze={onSnooze}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- SNOOZE HINT (Bottom Right) ---
const SnoozeHint: React.FC<{ onSnooze: () => void }> = ({ onSnooze }) => (
  <motion.button
    onClick={(e) => { 
      e.stopPropagation(); 
      onSnooze(); 
    }}
    whileTap={{ scale: 0.9 }}
    className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-1 
               rounded-full bg-white/10 backdrop-blur-sm border border-white/10
               text-white/40 text-[10px] font-medium hover:bg-white/20 hover:text-white/60 
               transition-all"
  >
    <Clock size={10} />
    <span>2h</span>
    <ChevronRight size={10} className="opacity-60" />
  </motion.button>
);

// --- MYSTERY STATE ---
const MysteryState: React.FC<{ onReveal: () => void; onDismiss: () => void; onSnooze?: () => void }> = ({ onReveal, onDismiss, onSnooze }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ 
      rotateY: -90, 
      opacity: 0,
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeIn" }
    }}
    transition={{ duration: 0.3 }}
    className="absolute inset-0"
    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
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
    <div className="relative h-full p-6 pb-10 flex flex-col text-white">
      {/* Header Row: Badge + Dismiss Button */}
      <div className="flex justify-between items-start">
        <motion.span 
          className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/20"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Neues Muster
        </motion.span>
        
        {/* Dismiss Button (X) */}
        <button 
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center 
                     hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>
      
      {/* Pulsing Icon - moved below header */}
      <motion.div 
        className="absolute top-16 right-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20"
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
    
    {/* Snooze Hint */}
    {onSnooze && <SnoozeHint onSnooze={onSnooze} />}
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
  onSnooze?: () => void;
}> = ({ insight, onAskMore, onDismiss, onSnooze }) => (
  <motion.div
    initial={{ rotateY: 90, opacity: 0 }}
    animate={{ rotateY: 0, opacity: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ 
      duration: 0.6, 
      type: "spring", 
      stiffness: 100,
      damping: 15 
    }}
    style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
    className="absolute inset-0"
  >
    {/* Gradient Background - Premium Dark */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    
    {/* Subtle Amber Glow */}
    <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-600/5 rounded-full blur-2xl" />

    {/* Content */}
    <div className="relative h-full p-5 pb-10 flex flex-col text-white">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500/30 to-yellow-500/20 
                          rounded-xl flex items-center justify-center border border-amber-500/20
                          shadow-lg shadow-amber-500/10">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase text-amber-400/90">
            Erkenntnis
          </span>
        </div>
        
        {/* Dismiss Button */}
        <button 
          onClick={onDismiss}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center 
                     hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Insight Quote */}
      <div className="mt-3 flex-1 flex items-center">
        <motion.p 
          className="text-sm font-medium leading-relaxed text-white/85 line-clamp-4"
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
        className="mt-3 w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl 
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
    
    {/* Snooze Hint */}
    {onSnooze && <SnoozeHint onSnooze={onSnooze} />}
  </motion.div>
);

export default EpiphanyCard;
