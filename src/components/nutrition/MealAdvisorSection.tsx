/**
 * MealAdvisorSection - AI-powered meal suggestion section
 * Displays button, loading state, and carousel of suggestions
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { useMealAdvisor, type MealSuggestion } from '@/hooks/useMealAdvisor';
import { MealSuggestionCard } from './MealSuggestionCard';

interface MealAdvisorSectionProps {
  onLogMeal?: (meal: MealSuggestion) => void;
}

export const MealAdvisorSection: React.FC<MealAdvisorSectionProps> = ({
  onLogMeal
}) => {
  const {
    suggestions,
    isLoading,
    error,
    hasSuggestions,
    generateSuggestions,
    clearSuggestions,
    isFallback
  } = useMealAdvisor();

  return (
    <div className="py-4 border-b border-border/30">
      <AnimatePresence mode="wait">
        {/* Initial State - Show Button */}
        {!hasSuggestions && !isLoading && !error && (
          <motion.div
            key="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AdvisorButton onClick={generateSuggestions} />
          </motion.div>
        )}

        {/* Loading State - Skeleton Cards */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSkeleton />
          </motion.div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ErrorState error={error} onRetry={generateSuggestions} />
          </motion.div>
        )}

        {/* Success State - Carousel */}
        {hasSuggestions && !isLoading && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SuggestionCarousel
              suggestions={suggestions}
              isFallback={isFallback}
              onLogMeal={onLogMeal}
              onRefresh={() => {
                clearSuggestions();
                generateSuggestions();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Premium button with gradient border
const AdvisorButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      "w-full py-3.5 px-4 rounded-xl",
      "relative overflow-hidden group",
      "bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10",
      "border border-primary/30 hover:border-primary/50",
      "transition-all duration-300"
    )}
  >
    {/* Animated shimmer effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full transform" 
         style={{ transition: 'transform 1s ease-in-out, opacity 0.3s ease' }} 
    />
    
    <div className="relative flex items-center justify-center gap-2">
      <motion.div
        animate={{ rotate: [0, 15, -15, 0] }}
        transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
      >
        <Sparkles className="w-5 h-5 text-primary" />
      </motion.div>
      <span className="font-semibold text-foreground">
        Was soll ich jetzt essen?
      </span>
    </div>
  </motion.button>
);

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-center gap-2 py-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      >
        <Sparkles className="w-4 h-4 text-primary" />
      </motion.div>
      <span className="text-sm text-muted-foreground">Analysiere deinen Kontext...</span>
    </div>
    
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3].map(i => (
        <div key={i} className="min-w-[85%] md:min-w-[280px]">
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

// Error state
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="text-center py-4 px-4 rounded-xl bg-destructive/10 border border-destructive/20">
    <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
    <p className="text-sm text-destructive mb-3">{error}</p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RefreshCw className="w-4 h-4 mr-2" />
      Erneut versuchen
    </Button>
  </div>
);

// Carousel with suggestions
const SuggestionCarousel: React.FC<{
  suggestions: MealSuggestion[];
  isFallback: boolean;
  onLogMeal?: (meal: MealSuggestion) => void;
  onRefresh: () => void;
}> = ({ suggestions, isFallback, onLogMeal, onRefresh }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Vorschläge für dich
        </span>
        {isFallback && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            Offline
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="w-3.5 h-3.5 mr-1" />
        Neu
      </Button>
    </div>

    {/* Carousel */}
    <Carousel
      opts={{ align: 'start', loop: false }}
      className="w-full"
    >
      <CarouselContent className="-ml-3">
        {suggestions.map((meal, idx) => (
          <CarouselItem key={idx} className="pl-3 basis-[88%] md:basis-[320px]">
            <MealSuggestionCard
              meal={meal}
              onLog={onLogMeal}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>

    {/* Dot indicators */}
    <div className="flex justify-center gap-1.5 pt-1">
      {suggestions.map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            idx === 0 ? "bg-primary" : "bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  </div>
);
