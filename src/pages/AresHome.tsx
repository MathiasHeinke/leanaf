/**
 * AresHome - Premium Apple-like Homescreen
 * The new main entry point with XP beam, focus card, and chat overlay
 */

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { useBioAge } from '@/hooks/useBioAge';
import { useProtocolStatus } from '@/hooks/useProtocolStatus';
import { usePlusData } from '@/hooks/usePlusData';
import { useAresGreeting } from '@/hooks/useAresGreeting';
import { useDailyFocus } from '@/hooks/useDailyFocus';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGlobalMealInput } from '@/hooks/useGlobalMealInput';
import { useFrequentMeals, type Daypart } from '@/hooks/useFrequentMeals';

import { ExperienceBeam } from '@/components/home/ExperienceBeam';
import { AresTopNav } from '@/components/home/AresTopNav';
import { AresGreeting } from '@/components/home/AresGreeting';
import { BioAgeBadge } from '@/components/home/BioAgeBadge';
import { DynamicFocusCard } from '@/components/home/DynamicFocusCard';
import { BentoStatsGrid } from '@/components/home/BentoStatsGrid';
import { FloatingDock } from '@/components/home/FloatingDock';
import { ChatOverlay } from '@/components/home/ChatOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MealConfirmationDialog } from '@/components/MealConfirmationDialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Camera, Mic, ArrowRight, Square, X } from 'lucide-react';
import { SmartChip } from '@/components/ui/smart-chip';
import { SimpleProgressBar } from '@/components/SimpleProgressBar';

export default function AresHome() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);

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
    closeDialog
  } = useGlobalMealInput();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize constants
  const MIN_H = 40;
  const MAX_LINES = 5;
  const LINE_H = 18;
  const MAX_H = MIN_H + LINE_H * (MAX_LINES - 1);

  // Data hooks
  const { userPoints } = usePointsSystem();
  const { latestMeasurement } = useBioAge();
  const { status: protocolStatus, phase0Progress } = useProtocolStatus();
  const plusData = usePlusData();
  const { userName, streak } = useAresGreeting();
  const { focusTask } = useDailyFocus();
  const { profileData } = useUserProfile();

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

  // Submit handler
  const handleSubmit = useCallback(async () => {
    const hasImages = uploadedImages.length > 0 || optimisticImages.some(img => img.status === 'completed');
    const hasText = inputText.trim();
    
    if (!hasText && !hasImages) return;
    
    await handleSubmitMeal();
    setMealOpen(false); // Close sheet after submission
  }, [inputText, uploadedImages, optimisticImages, handleSubmitMeal]);

  // Auth check
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Calculate XP values
  const currentXP = userPoints?.total_points || 0;
  const pointsToNext = userPoints?.points_to_next_level || 100;
  const level = userPoints?.current_level || 1;
  const maxXP = currentXP + pointsToNext;

  // Bio age values
  const bioAge = latestMeasurement?.calculated_bio_age || null;
  const realAge = latestMeasurement?.chronological_age || null;

  // Nutrition from plusData
  const todaySummary = plusData.today;
  const goals = plusData.goals;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      {/* XP Beam - Fixed at very top */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <ExperienceBeam currentXP={currentXP} maxXP={maxXP} level={level} />
      </div>

      {/* Top Navigation */}
      <AresTopNav onOpenChat={() => setShowChat(true)} />

      {/* Main Content */}
      <main className="relative z-10 max-w-md mx-auto px-5 pt-14 pb-28 space-y-5">
        
        {/* Header: Greeting + Bio Age */}
        <div className="flex justify-between items-start">
          <AresGreeting userName={userName} streak={streak || undefined} />
          <BioAgeBadge 
            bioAge={bioAge} 
            realAge={realAge} 
            chronologicalAge={profileData?.age}
          />
        </div>

        {/* Hero: Dynamic Focus Card */}
        <DynamicFocusCard 
          task={focusTask} 
          onInteract={() => setShowChat(true)} 
        />

        {/* Bento Stats Grid */}
        <BentoStatsGrid 
          calories={{
            current: todaySummary?.total_calories || 0,
            target: goals?.calories || 2000
          }}
          protein={{
            current: todaySummary?.total_protein || 0,
            target: goals?.protein || 150
          }}
          carbs={{
            current: todaySummary?.total_carbs || 0,
            target: goals?.carbs || 200
          }}
          fats={{
            current: todaySummary?.total_fats || 0,
            target: goals?.fats || 65
          }}
          protocolPhase={protocolStatus?.current_phase || 0}
          protocolProgress={{
            completed: phase0Progress || 0,
            total: 9
          }}
          weeklyWorkouts={{
            completed: plusData.workoutLoggedToday ? 1 : 0,
            target: 4
          }}
          onNavigateToDashboard={() => navigate('/dashboard')}
        />
      </main>

      {/* Floating Dock */}
      <FloatingDock 
        onChatOpen={() => setShowChat(true)}
        onMealInput={() => setMealOpen(true)}
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
            {/* Smart Chips for frequent meals */}
            {getCurrentMealSuggestions().length > 0 && (
              <div className="flex gap-2 overflow-x-auto scroll-smooth flex-nowrap hide-scrollbar pb-1">
                {getCurrentMealSuggestions().map((meal, index) => (
                  <SmartChip
                    key={index}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMealChipClick(meal)}
                  >
                    {meal}
                  </SmartChip>
                ))}
              </div>
            )}

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
              rows={1}
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

      {/* Chat Overlay */}
      <ChatOverlay 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
      />
    </div>
  );
}
