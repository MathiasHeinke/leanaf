/**
 * AresHome - Premium Apple-like Homescreen
 * The new main entry point with XP beam, focus card, and chat overlay
 */

import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { useBioAge } from '@/hooks/useBioAge';
import { useProtocolStatus } from '@/hooks/useProtocolStatus';
import { usePlusData } from '@/hooks/usePlusData';
import { useAresGreeting } from '@/hooks/useAresGreeting';
import { useDailyFocus } from '@/hooks/useDailyFocus';
import { useUserProfile } from '@/hooks/useUserProfile';

import { ExperienceBeam } from '@/components/home/ExperienceBeam';
import { AresTopNav } from '@/components/home/AresTopNav';
import { AresGreeting } from '@/components/home/AresGreeting';
import { BioAgeBadge } from '@/components/home/BioAgeBadge';
import { DynamicFocusCard } from '@/components/home/DynamicFocusCard';
import { BentoStatsGrid } from '@/components/home/BentoStatsGrid';
import { FloatingDock } from '@/components/home/FloatingDock';
import { ChatOverlay } from '@/components/home/ChatOverlay';
import { Skeleton } from '@/components/ui/skeleton';

export default function AresHome() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showChat, setShowChat] = useState(false);

  // Data hooks
  const { userPoints } = usePointsSystem();
  const { latestMeasurement } = useBioAge();
  const { status: protocolStatus, phase0Progress } = useProtocolStatus();
  const plusData = usePlusData();
  const { userName, streak } = useAresGreeting();
  const { focusTask } = useDailyFocus();
  const { profileData } = useUserProfile();

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
        onMealInput={() => navigate('/plus')}
      />

      {/* Chat Overlay */}
      <ChatOverlay 
        isOpen={showChat} 
        onClose={() => setShowChat(false)} 
      />
    </div>
  );
}
