/**
 * MealAdvisorSection - AI-powered meal suggestion & evaluation section
 * Shows input field, dynamic button, loading state, and results (suggestions or evaluation)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, RefreshCw, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { useMealAdvisor, type MealSuggestion, type MealEvaluation } from '@/hooks/useMealAdvisor';
import { MealSuggestionCard } from './MealSuggestionCard';
import { EvaluationCard } from './EvaluationCard';

interface MealAdvisorSectionProps {
  onLogMeal?: (meal: MealSuggestion | MealEvaluation) => void;
}

export const MealAdvisorSection: React.FC<MealAdvisorSectionProps> = ({
  onLogMeal
}) => {
  const [userIdea, setUserIdea] = useState('');
  
  const {
    suggestions,
    evaluation,
    isLoading,
    error,
    hasSuggestions,
    hasEvaluation,
    mode,
    generateSuggestions,
    clearSuggestions,
    isFallback
  } = useMealAdvisor();

  const hasInput = userIdea.trim().length > 0;
  const showResults = hasSuggestions || hasEvaluation;

  const handleSubmit = () => {
    generateSuggestions(hasInput ? userIdea : undefined);
  };

  const handleRefresh = () => {
    setUserIdea('');
    clearSuggestions();
  };

  const handleNewQuery = () => {
    setUserIdea('');
    clearSuggestions();
  };

  return (
    <div className="py-4 border-b border-border/30">
      <AnimatePresence mode="wait">
        {/* Initial/Idle State - Show Input + Button */}
        {!showResults && !isLoading && !error && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Input Field */}
            <div className="relative">
              <Input
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
                placeholder='z.B. "Banane und Brötchen"'
                className="pr-8 h-11 rounded-xl bg-muted/50 border-border/50 focus:border-primary/50"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              {hasInput && (
                <button
                  onClick={() => setUserIdea('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dynamic Button */}
            <AdvisorButton 
              onClick={handleSubmit} 
              hasInput={hasInput}
            />
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSkeleton isEvaluation={hasInput} />
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
            <ErrorState error={error} onRetry={handleSubmit} />
          </motion.div>
        )}

        {/* Evaluation Result */}
        {hasEvaluation && evaluation && !isLoading && (
          <motion.div
            key="evaluation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Bewertung
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewQuery}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Neu
              </Button>
            </div>

            {/* Evaluation Card */}
            <EvaluationCard
              evaluation={evaluation}
              onLog={onLogMeal}
              recipe={evaluation.recipe}
            />

            {/* Alternatives Carousel */}
            {evaluation.alternatives.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Bessere Alternativen
                </p>
                <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                  <CarouselContent className="-ml-3">
                    {evaluation.alternatives.map((meal, idx) => (
                      <CarouselItem key={idx} className="pl-3 basis-[88%] md:basis-[320px]">
                        <MealSuggestionCard
                          meal={meal}
                          onLog={onLogMeal ? () => onLogMeal(meal) : undefined}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            )}
          </motion.div>
        )}

        {/* Suggestions Result */}
        {hasSuggestions && !isLoading && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SuggestionCarousel
              suggestions={suggestions}
              isFallback={isFallback}
              onLogMeal={onLogMeal}
              onRefresh={handleRefresh}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Dynamic button with gradient border
const AdvisorButton: React.FC<{ onClick: () => void; hasInput: boolean }> = ({ onClick, hasInput }) => (
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
        animate={{ rotate: hasInput ? 0 : [0, 15, -15, 0] }}
        transition={{ repeat: hasInput ? 0 : Infinity, duration: 2, repeatDelay: 3 }}
      >
        {hasInput ? (
          <Search className="w-5 h-5 text-primary" />
        ) : (
          <Sparkles className="w-5 h-5 text-primary" />
        )}
      </motion.div>
      <span className="font-semibold text-foreground">
        {hasInput ? 'Check meine Idee' : 'Was soll ich jetzt essen?'}
      </span>
    </div>
  </motion.button>
);

// Loading skeleton
const LoadingSkeleton: React.FC<{ isEvaluation: boolean }> = ({ isEvaluation }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-center gap-2 py-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
      >
        {isEvaluation ? (
          <Search className="w-4 h-4 text-primary" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </motion.div>
      <span className="text-sm text-muted-foreground">
        {isEvaluation ? 'Lester analysiert deine Idee...' : 'Analysiere deinen Kontext...'}
      </span>
    </div>
    
    {isEvaluation ? (
      <Skeleton className="h-[240px] rounded-2xl" />
    ) : (
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="min-w-[85%] md:min-w-[280px]">
            <Skeleton className="h-[200px] rounded-2xl" />
          </div>
        ))}
      </div>
    )}
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
  onLogMeal?: (meal: MealSuggestion | MealEvaluation) => void;
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
              onLog={onLogMeal ? () => onLogMeal(meal) : undefined}
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
