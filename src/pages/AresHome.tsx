/**
 * AresHome - Premium Sci-Fi Cockpit
 * Dynamic action cards, live metrics, and contextual AI chat
 */

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { useBioAge } from '@/hooks/useBioAge';
import { usePlusData } from '@/hooks/usePlusData';
import { useAresGreeting } from '@/hooks/useAresGreeting';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGlobalMealInput } from '@/hooks/useGlobalMealInput';
import { useFrequentMeals, type Daypart } from '@/hooks/useFrequentMeals';
import { useMealFavorites } from '@/hooks/useMealFavorites';
import { useAresEvents } from '@/hooks/useAresEvents';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { toast } from 'sonner';

import { ExperienceBeam } from '@/components/home/ExperienceBeam';
import { AresTopNav } from '@/components/home/AresTopNav';
import { AresGreeting } from '@/components/home/AresGreeting';
import { BioAgeBadge } from '@/components/home/BioAgeBadge';
import { ActionCardStack } from '@/components/home/ActionCardStack';
import { MetricWidgetGrid } from '@/components/home/MetricWidgetGrid';
import { LiquidDock, type QuickActionType } from '@/components/home/LiquidDock';
import { quickAddBus } from '@/components/quick/quickAddBus';
import { ChatOverlay } from '@/components/home/ChatOverlay';
import { QuickLogSheet, type QuickLogTab } from '@/components/home/QuickLogSheet';
import { NutritionDaySheet } from '@/components/home/sheets/NutritionDaySheet';
import { HydrationDaySheet } from '@/components/home/sheets/HydrationDaySheet';
import { BodyTrendSheet } from '@/components/home/sheets/BodyTrendSheet';
import { PeptidesSheet } from '@/components/home/sheets/PeptidesSheet';
import { TrainingDaySheet } from '@/components/home/sheets/TrainingDaySheet';
import { SupplementsDaySheet } from '@/components/home/sheets/SupplementsDaySheet';
import { SleepDaySheet } from '@/components/home/sheets/SleepDaySheet';
import { BioAgeSheet } from '@/components/home/sheets/BioAgeSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { MealConfirmationDialog } from '@/components/MealConfirmationDialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, Mic, ArrowRight, Square, X, Zap, Crown, Trophy, ChevronRight, Star } from 'lucide-react';
import { SmartChip } from '@/components/ui/smart-chip';
import { SimpleProgressBar } from '@/components/SimpleProgressBar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function AresHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);  // Direct prompt with metrics
  const [mealOpen, setMealOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [quickLogConfig, setQuickLogConfig] = useState<{ open: boolean; tab: QuickLogTab }>({ open: false, tab: 'weight' });
  const [nutritionSheetOpen, setNutritionSheetOpen] = useState(false);
  const [hydrationSheetOpen, setHydrationSheetOpen] = useState(false);
  const [bodySheetOpen, setBodySheetOpen] = useState(false);
  const [peptidesSheetOpen, setPeptidesSheetOpen] = useState(false);
  const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
  const [supplementsSheetOpen, setSupplementsSheetOpen] = useState(false);
  const [sleepSheetOpen, setSleepSheetOpen] = useState(false);
  const [bioAgeSheetOpen, setBioAgeSheetOpen] = useState(false);

  // Meal input hook (same as Dashboard)
  const {
    inputText,
    setInputText,
    uploadedImages,
    optimisticImages,
    isRecording,
    handleVoiceRecord,
    handlePhotoUpload,
    removeImage,
    removeOptimisticImage,
    resetForm,
    isAnalyzing,
    isUploading,
    uploadProgress,
    handleSubmitMeal,
    showConfirmationDialog,
    analyzedMealData,
    selectedMealType,
    setSelectedMealType,
    closeDialog,
    // Dialog control for pre-fill
    setShowConfirmationDialog,
    setAnalyzedMealData
  } = useGlobalMealInput();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize constants
  const MIN_H = 72;
  const MAX_LINES = 5;
  const LINE_H = 18;
  const MAX_H = MIN_H + LINE_H * (MAX_LINES - 1);

  // Data hooks
  const { userPoints } = usePointsSystem();
  const { latestMeasurement } = useBioAge();
  const plusData = usePlusData();
  const { userName, streak } = useAresGreeting();
  const { profileData } = useUserProfile();
  const { logWater } = useAresEvents();
  const { favorites, isFavorite, toggleFavorite } = useMealFavorites();

  // Pull-to-Refresh Handler - invalidates ALL data sources
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_METRICS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRAINING_WEEKLY }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEIGHT_RECENT }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SLEEP_RECENT }),
    ]);
    
    // Trigger legacy event system for usePlusData
    triggerDataRefresh();
    
    toast.success('Daten aktualisiert', { duration: 1500 });
  }, [queryClient]);

  // Chat context trigger from action cards
  const handleActionTrigger = useCallback((contextOrPrompt: string) => {
    // Detect if this is a direct prompt (contains metrics) or a context key
    const isDirectPrompt = contextOrPrompt.includes('kcal') || 
                           contextOrPrompt.includes('Analysiere') || 
                           contextOrPrompt.includes('METRIKEN') ||
                           contextOrPrompt.length > 100;
    
    if (isDirectPrompt) {
      setChatPrompt(contextOrPrompt);
      setChatContext(null);
    } else {
      setChatContext(contextOrPrompt);
      setChatPrompt(null);
    }
    setTimeout(() => setShowChat(true), 150);
  }, []);

  // Quick action handler for the LiquidDock
  const handleQuickAction = useCallback(async (action: QuickActionType) => {
    switch (action) {
      case 'journal':
        setQuickLogConfig({ open: true, tab: 'journal' });
        break;
      case 'workout':
        setQuickLogConfig({ open: true, tab: 'training' });
        break;
      case 'weight':
        setQuickLogConfig({ open: true, tab: 'weight' });
        break;
      case 'supplements':
        quickAddBus.emit({ type: 'supplements' });
        break;
      case 'sleep':
        setQuickLogConfig({ open: true, tab: 'sleep' });
        break;
      case 'hydration':
        // Direct water logging - 500ml with optimistic update
        const success = await logWater(500);
        if (success) {
          toast.success('+500ml Wasser 💧', { duration: 1500 });
        }
        break;
      case 'nutrition':
        // Open meal input sheet
        setMealOpen(true);
        break;
    }
  }, [logWater]);

  // Subscribe to quickAddBus for all quick action events from SmartFocusCard, FAB, and LiquidDock
  useEffect(() => {
    const unsub = quickAddBus.subscribe((action) => {
      if (action.type === 'journal') {
        setQuickLogConfig({ open: true, tab: 'journal' });
      } else if (action.type === 'sleep') {
        setSleepSheetOpen(true);
      } else if (action.type === 'weight' || action.type === 'body') {
        setQuickLogConfig({ open: true, tab: 'weight' });
      } else if (action.type === 'training') {
        setQuickLogConfig({ open: true, tab: 'training' });
      } else if (action.type === 'tape') {
        setQuickLogConfig({ open: true, tab: 'tape' });
      } else if (action.type === 'supplements' || action.type === 'chemistry') {
        setSupplementsSheetOpen(true);
      } else if (action.type === 'peptide') {
        setPeptidesSheetOpen(true);
      } else if (action.type === 'hydration') {
        setHydrationSheetOpen(true);
      } else if (action.type === 'meal') {
        setMealOpen(true);
      }
    });
    return unsub;
  }, []);

  // Frequent meals for smart chips
  const { frequent: frequentMeals } = useFrequentMeals(user?.id, 60);

  // Get current time-based meal suggestions
  const getCurrentMealSuggestions = useCallback(() => {
    if (!frequentMeals) return [];
    
    const hour = new Date().getHours();
    let currentDaypart: Daypart;
    
    if (hour >= 5 && hour < 11) currentDaypart = "morning";
    else if (hour >= 11 && hour < 15) currentDaypart = "noon";
    else if (hour >= 15 && hour < 22) currentDaypart = "evening";
    else currentDaypart = "night";
    
    return frequentMeals[currentDaypart] || [];
  }, [frequentMeals]);

  const handleMealChipClick = useCallback((mealText: string) => {
    setInputText(mealText);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, [setInputText]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(Math.min(scrollHeight, MAX_H), MIN_H);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = newHeight >= MAX_H ? 'auto' : 'hidden';
  }, [MAX_H, MIN_H]);

  useLayoutEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText, adjustTextareaHeight]);

  // Pre-fill meal data from localStorage (from AI Nutrition Advisor)
  useEffect(() => {
    if (mealOpen) {
      const prefillJson = localStorage.getItem('prefill_meal');
      if (prefillJson) {
        try {
          const prefillData = JSON.parse(prefillJson);
          
          // Clear localStorage immediately to prevent double-processing
          localStorage.removeItem('prefill_meal');
          
          // If we have macros, skip the input sheet and go directly to confirmation
          if (prefillData.calories !== undefined) {
            const analyzedData = {
              title: prefillData.title || 'Mahlzeit',
              calories: prefillData.calories || 0,
              protein: prefillData.protein || 0,
              carbs: prefillData.carbs || 0,
              fats: prefillData.fats || 0,
              meal_type: 'other' as const,
              confidence: 0.9
            };
            
            // Close sheet first, then open confirmation dialog
            setMealOpen(false);
            
            // Small delay to allow sheet animation to complete
            setTimeout(() => {
              setAnalyzedMealData(analyzedData);
              setShowConfirmationDialog(true);
            }, 100);
          } else if (prefillData.title) {
            // No macros, just pre-fill the text input
            setInputText(prefillData.title);
          }
        } catch (e) {
          console.warn('Failed to parse prefill_meal data:', e);
          localStorage.removeItem('prefill_meal');
        }
      }
    }
  }, [mealOpen, setInputText, setAnalyzedMealData, setShowConfirmationDialog]);

  const handleSubmit = useCallback(async () => {
    const hasImages = uploadedImages.length > 0 || optimisticImages.some(img => img.status === 'completed');
    const hasText = inputText.trim();
    
    if (!hasText && !hasImages) return;
    
    await handleSubmitMeal();
    setMealOpen(false); // Close sheet after submission
  }, [inputText, uploadedImages, optimisticImages, handleSubmitMeal]);

  // 1. Auth noch nicht fertig -> Skeleton
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-[3px] w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  // 2. Auth fertig, kein User -> Redirect zu Login
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 3. User da, aber Profil lädt noch und kein Cache -> Skeleton
  const hasProfileCache = !!profileData;
  if (!hasProfileCache) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-[3px] w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  // 4. Ab hier: User authentifiziert UND profileData vorhanden

  // Calculate XP values
  const currentXP = userPoints?.total_points || 0;
  const pointsToNext = userPoints?.points_to_next_level || 100;
  const level = userPoints?.current_level || 1;
  const maxXP = currentXP + pointsToNext;

  // Bio age values
  const bioAge = latestMeasurement?.calculated_bio_age || null;
  const realAge = latestMeasurement?.chronological_age || null;

  // Calculate progress percentage for stats popover
  const getMinPointsForLevel = (lvl: number): number => {
    const thresholds = [0, 100, 300, 600, 1100, 1800, 3100, 4600];
    if (lvl <= 7) return thresholds[lvl - 1] || 0;
    return 4600 + ((lvl - 8) * 500);
  };
  const getMaxPointsForLevel = (lvl: number): number => {
    const thresholds = [100, 300, 600, 1100, 1800, 3100, 4600];
    if (lvl < 7) return thresholds[lvl] || 100;
    if (lvl === 7) return 4600;
    return 4600 + ((lvl - 7) * 500);
  };
  const minPoints = getMinPointsForLevel(level);
  const maxPoints = getMaxPointsForLevel(level);
  const totalRange = maxPoints - minPoints;
  const currentProgress = currentXP - minPoints;
  const progressPercent = totalRange > 0 ? Math.min((currentProgress / totalRange) * 100, 100) : 0;
  const isHighLevel = ['Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'].includes(userPoints?.level_name || '');


  return (
    <div className="min-h-screen bg-background text-foreground relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      {/* XP Beam - Fixed at very top */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <ExperienceBeam 
          currentXP={currentXP} 
          maxXP={maxXP} 
          level={level} 
          onIndicatorClick={() => setShowStats(true)}
        />
      </div>

      {/* Stats Popover Overlay */}
      <AnimatePresence>
        {showStats && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStats(false)}
              className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]"
            />
            
            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-[70] w-72 p-4 bg-card border border-border rounded-2xl shadow-2xl"
            >
              {/* Header with Level */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20"
                )}>
                  {isHighLevel ? (
                    <Crown className="w-6 h-6 text-primary" />
                  ) : (
                    <Zap className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">
                    Level {level} {userPoints?.level_name || 'Rookie'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {currentXP.toLocaleString('de-DE')} Punkte
                  </p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Fortschritt</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Noch {pointsToNext.toLocaleString('de-DE')} Punkte bis Level {level + 1}
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-border mb-3" />

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Achievements Link */}
                <button
                  onClick={() => {
                    setShowStats(false);
                    navigate('/achievements');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">
                    Erfolge & Abzeichen
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                {/* Chat with ARES */}
                <button
                  onClick={() => {
                    setShowStats(false);
                    setShowChat(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">
                    Mit ARES chatten
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Navigation */}
      <AresTopNav />

      {/* Main Content with Pull-to-Refresh */}
      <PullToRefresh onRefresh={handleRefresh} className="h-[calc(100vh-3px)]">
        <main className="relative z-10 max-w-md mx-auto px-5 pt-14 pb-36 space-y-5">
          
          {/* Header: Greeting + Bio Age */}
          <div className="flex justify-between items-start">
            <AresGreeting userName={userName} streak={streak || undefined} />
            <BioAgeBadge 
              bioAge={bioAge} 
              realAge={realAge} 
              chronologicalAge={profileData?.age}
            />
          </div>

          {/* Action Card Stack - Tinder-style prioritized cards */}
          <motion.div layout>
            <ActionCardStack onTriggerChat={handleActionTrigger} />
          </motion.div>

          {/* Live Metrics Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Live Metriken
            </h3>
            <MetricWidgetGrid 
              onOpenNutritionSheet={() => setNutritionSheetOpen(true)}
              onOpenHydrationSheet={() => setHydrationSheetOpen(true)}
              onOpenBodySheet={() => setBodySheetOpen(true)}
              onOpenPeptidesSheet={() => setPeptidesSheetOpen(true)}
              onOpenTrainingSheet={() => setTrainingSheetOpen(true)}
              onOpenSupplementsSheet={() => setSupplementsSheetOpen(true)}
              onOpenSleepSheet={() => setSleepSheetOpen(true)}
              onOpenBioAgeSheet={() => setBioAgeSheetOpen(true)}
            />
          </div>
        </main>
      </PullToRefresh>

      {/* Liquid Crystal Dock */}
      <LiquidDock 
        onVisionScan={() => setMealOpen(true)}
        onAresChat={() => setShowChat(true)}
        onQuickAction={handleQuickAction}
      />

      {/* Meal Input Sheet - Dashboard Style */}
      <Sheet open={mealOpen} onOpenChange={(open) => {
        setMealOpen(open);
        if (!open) resetForm();
      }}>
        <SheetContent 
          side="bottom" 
          className="h-auto max-h-[60vh] rounded-t-3xl border-t border-border/50 bg-background/95 backdrop-blur-md px-4 pb-8"
        >
          {/* Upload Progress Bar */}
          <SimpleProgressBar 
            isVisible={isUploading} 
            progress={uploadProgress.length > 0 
              ? Math.round(uploadProgress.reduce((sum, item) => sum + item.progress, 0) / uploadProgress.length) 
              : 0
            } 
          />

          <div className="pt-4 space-y-4">
            {/* Smart Chips for meals - Favorites + Suggestions */}
            <div className="relative overflow-visible space-y-2">
              {/* Favorites Row (max 3, gold stars) */}
              {favorites.length > 0 && (
                <div className="flex gap-2 flex-wrap relative z-20 pb-1">
                  {favorites.map((meal, index) => (
                    <div key={`fav-${index}`} className="relative">
                      <SmartChip
                        variant="favorite"
                        size="sm"
                        onClick={() => handleMealChipClick(meal)}
                        icon={<Star className="w-3 h-3 fill-amber-400 text-amber-500" />}
                      >
                        {meal}
                      </SmartChip>
                      {/* Remove button on long press simulation - click small X */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(meal);
                        }}
                        className="absolute -top-1.5 -right-1.5 z-30 h-4 w-4 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-muted transition"
                        aria-label="Favorit entfernen"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions Row (scrollable, exclude favorites) */}
              {getCurrentMealSuggestions().filter(m => !isFavorite(m)).length > 0 && (
                <div className="flex gap-2 overflow-x-auto scroll-smooth flex-nowrap hide-scrollbar pb-2 relative z-10">
                  {getCurrentMealSuggestions()
                    .filter(m => !isFavorite(m))
                    .map((meal, index) => (
                      <div key={`sug-${index}`} className="relative group flex-shrink-0">
                        <SmartChip
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMealChipClick(meal)}
                        >
                          {meal}
                        </SmartChip>
                        {/* Star button to add as favorite */}
                        {favorites.length < 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(meal);
                            }}
                            className="absolute -top-1.5 -right-1.5 z-30 h-4 w-4 rounded-full bg-background border border-border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
                            aria-label="Als Favorit markieren"
                          >
                            <Star className="h-2.5 w-2.5 text-amber-500" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Image Previews */}
            {(optimisticImages.length > 0 || uploadedImages.length > 0) && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 hide-scrollbar">
                {/* Optimistic images (instant preview) */}
                {optimisticImages.map((img, idx) => (
                  <div key={`optimistic-${idx}`} className="relative flex-shrink-0">
                    <img
                      src={img.blobUrl}
                      alt={`Wird hochgeladen ${idx + 1}`}
                      loading="lazy"
                      className={`h-12 w-12 rounded-xl object-cover border transition-opacity ${
                        img.status === 'uploading' ? 'opacity-60' : 
                        img.status === 'error' ? 'opacity-40 border-destructive' : 'opacity-100'
                      }`}
                    />
                    {img.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {img.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <X className="h-3 w-3 text-destructive" />
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => removeOptimisticImage(idx)}
                      className="absolute -top-1 -right-1 rounded-full bg-background border border-border shadow p-0.5 hover:bg-muted transition z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {/* Successfully uploaded images */}
                {uploadedImages.map((url, idx) => (
                  <div key={`uploaded-${url}-${idx}`} className="relative flex-shrink-0">
                    <img
                      src={url}
                      alt={`Hochgeladene Mahlzeit ${idx + 1}`}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      className="h-12 w-12 rounded-xl object-cover border border-border hover:opacity-75 transition-opacity"
                    />
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-1 -right-1 rounded-full bg-background border border-border shadow p-0.5 hover:bg-muted transition z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              rows={3}
              placeholder="Was hast du gegessen?"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onInput={adjustTextareaHeight}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-2xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
              style={{
                minHeight: `${MIN_H}px`,
                maxHeight: `${MAX_H}px`,
                lineHeight: '18px'
              }}
            />

            {/* Bottom Button Row */}
            <div className="flex items-center justify-between gap-3">
              {/* Left: Photo & Voice Buttons */}
              <div className="flex items-center gap-2">
                {/* Photo Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 h-10 w-10 rounded-full"
                  aria-label="Foto hinzufügen"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  multiple 
                  className="hidden"
                  onChange={handlePhotoUpload} 
                />

                {/* Voice Button */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleVoiceRecord}
                  className="flex-shrink-0 h-10 w-10 rounded-full"
                  aria-label={isRecording ? "Aufnahme stoppen" : "Sprachaufnahme"}
                >
                  {isRecording ? (
                    <Square className="h-5 w-5 text-destructive" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={(!inputText.trim() && uploadedImages.length === 0 && optimisticImages.length === 0) || isAnalyzing}
                className="rounded-full px-6"
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Absenden
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Meal Confirmation Dialog - Premium Modal */}
      {showConfirmationDialog && analyzedMealData && (
        <MealConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={closeDialog}
          analyzedMealData={analyzedMealData}
          selectedMealType={selectedMealType}
          onMealTypeChange={setSelectedMealType}
          onSuccess={() => {
            resetForm();
          }}
          uploadedImages={uploadedImages}
          selectedDate={new Date()}
        />
      )}

      {/* Chat Overlay with Context */}
      <ChatOverlay 
        isOpen={showChat} 
        onClose={() => { 
          setShowChat(false); 
          setChatContext(null);
          setChatPrompt(null);
        }}
        initialContext={chatContext}
        initialPrompt={chatPrompt}
      />

      {/* Quick Log Sheet for Weight, Training, Sleep */}
      <QuickLogSheet
        isOpen={quickLogConfig.open}
        onClose={() => setQuickLogConfig(prev => ({ ...prev, open: false }))}
        initialTab={quickLogConfig.tab}
      />

      {/* Nutrition Day Sheet - Layer 2 */}
      <NutritionDaySheet 
        isOpen={nutritionSheetOpen}
        onClose={() => setNutritionSheetOpen(false)}
        onAddMeal={() => {
          setNutritionSheetOpen(false);
          setMealOpen(true);
        }}
      />

      {/* Hydration Day Sheet - Layer 2 */}
      <HydrationDaySheet 
        isOpen={hydrationSheetOpen}
        onClose={() => setHydrationSheetOpen(false)}
      />

      {/* Body Trend Sheet - Layer 2 */}
      <BodyTrendSheet 
        isOpen={bodySheetOpen}
        onClose={() => setBodySheetOpen(false)}
        onOpenQuickLog={() => {
          setBodySheetOpen(false);
          setQuickLogConfig({ open: true, tab: 'weight' });
        }}
      />

      {/* Peptides Sheet - Layer 2 */}
      <PeptidesSheet 
        isOpen={peptidesSheetOpen}
        onClose={() => setPeptidesSheetOpen(false)}
      />

      {/* Training Day Sheet - Layer 2 */}
      <TrainingDaySheet 
        isOpen={trainingSheetOpen}
        onClose={() => setTrainingSheetOpen(false)}
        onOpenLogger={() => {
          setTrainingSheetOpen(false);
          setQuickLogConfig({ open: true, tab: 'training' });
        }}
      />

      {/* Supplements Day Sheet - Layer 2 */}
      <SupplementsDaySheet 
        isOpen={supplementsSheetOpen}
        onClose={() => setSupplementsSheetOpen(false)}
        onOpenLogger={() => {
          setSupplementsSheetOpen(false);
          setQuickLogConfig({ open: true, tab: 'supplements' });
        }}
      />

      {/* Sleep Day Sheet - Layer 2 */}
      <SleepDaySheet 
        isOpen={sleepSheetOpen}
        onClose={() => setSleepSheetOpen(false)}
        onOpenLogger={() => {
          setSleepSheetOpen(false);
          setQuickLogConfig({ open: true, tab: 'sleep' });
        }}
      />

      {/* Bio-Age Sheet - Layer 2 */}
      <BioAgeSheet 
        isOpen={bioAgeSheetOpen}
        onClose={() => setBioAgeSheetOpen(false)}
      />
    </div>
  );
}
