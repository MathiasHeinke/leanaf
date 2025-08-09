import React, { useEffect, useState, useCallback } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { usePlusData } from '@/hooks/usePlusData';
import { MomentumXPBar } from '@/components/momentum/MomentumXPBar';
import { MomentumHeaderTriptych } from '@/components/momentum/MomentumHeaderTriptych';
import { StreakLevelHeader } from '@/components/plus/StreakLevelHeader';
import { PlusDeficitRing } from '@/components/plus/PlusDeficitRing';
import { PlusMacroDeltas } from '@/components/plus/PlusMacroDeltas';
import { PlusTrainingSteps } from '@/components/plus/PlusTrainingSteps';
import { PlusSupportTiles } from '@/components/plus/PlusSupportTiles';
import { MomentumNextAction } from '@/components/momentum/MomentumNextAction';
import { MiniJournalQuick } from '@/components/plus/MiniJournalQuick';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MomentumBottomComposer } from '@/components/momentum/MomentumBottomComposer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QuickHydrationCard } from '@/components/momentum/quick/QuickHydrationCard';
import { QuickSupplementsCard } from '@/components/momentum/quick/QuickSupplementsCard';
import { QuickWeightCard } from '@/components/momentum/quick/QuickWeightCard';
import { QuickSleepCard } from '@/components/momentum/quick/QuickSleepCard';
import { QuickTrainingCard } from '@/components/momentum/quick/QuickTrainingCard';
import { QuickMealsCard } from '@/components/momentum/quick/QuickMealsCard';

const MomentumBoard: React.FC = () => {
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const enabled = isEnabled('feature_plus_dashboard');
  const data = usePlusData();
  const [xpDelta, setXpDelta] = useState<number>(0);
  const [previousMissions, setPreviousMissions] = useState<number>(0);

  // Tagesmission Dynamik aus Daten ableiten
  const macrosDone = typeof (data as any)?.proteinDelta === 'number' ? ((data as any).proteinDelta <= 0) : false;
  const sleepLogged = Boolean((data as any)?.sleepLoggedToday || (((data as any)?.sleepDurationToday ?? 0) > 0));
  const supplementsLogged = Boolean((data as any)?.supplementsLoggedToday);
  const stepsToday = (data as any)?.stepsToday ?? 0;
  const stepsTarget = (data as any)?.stepsTarget ?? 7000;
  const workoutLogged = Boolean((data as any)?.workoutLoggedToday || stepsToday >= stepsTarget);
  const hydrationLogged = (((data as any)?.hydrationMlToday ?? 0) >= 1500);
  const missionCompletedCount = [macrosDone, sleepLogged, supplementsLogged, workoutLogged, hydrationLogged].filter(Boolean).length;

  // XP calculation - simple mapping from mission progress
  const currentXP = missionCompletedCount * 20; // 0-100 XP based on 5 missions

  // Live-Update: Detect mission changes and show XP delta
  useEffect(() => {
    if (!data.loading && previousMissions > 0 && missionCompletedCount > previousMissions) {
      const xpGained = (missionCompletedCount - previousMissions) * 20;
      setXpDelta(xpGained);
      
      // Clear delta after animation
      setTimeout(() => setXpDelta(0), 3000);
    }
    
    if (!data.loading) {
      setPreviousMissions(missionCompletedCount);
    }
  }, [missionCompletedCount, data.loading, previousMissions]);

  // Page-level SEO: title, description, canonical
  useEffect(() => {
    document.title = 'Momentum-Board – Defizit, Protein, Schritte | GetLeanAI+';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = 'Dein tägliches Momentum: Kalorien-Defizit, Protein-Delta, Carb-Budget und mehr – inklusive 7‑Tage‑Trend.';
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = `${window.location.origin}/momentum-board`;
  }, []);

  // Clean UI cards (white, minimal color) for quick inputs
  // integrated as a grid above the PLUS widgets
  
  if (flagsLoading) {
    return (
      <div className="container mx-auto px-4 pt-0 pb-6 max-w-5xl space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="container mx-auto px-4 pt-0 pb-6 max-w-5xl space-y-6">
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-xl font-semibold">Momentum‑Board (Beta)</div>
            <div className="text-muted-foreground mt-2">Dieses Feature ist noch nicht freigeschaltet.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <main className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-primary/20 via-background to-background blur-2xl" />
        
        {/* XP Bar - Sticky */}
        <MomentumXPBar 
          xp={currentXP} 
          goal={100} 
          loading={flagsLoading}
          deltaBadge={xpDelta}
          onBurst={useCallback(() => {
            // Burst animation for stage completion
            console.log('🎆 Stage completed!');
            // Can trigger confetti or other effects here
          }, [])}
        />
        
        {/* Header Triptychon */}
        <MomentumHeaderTriptych 
          data={data}
          missionCompletedCount={missionCompletedCount}
          missionTotal={5}
          key={`header-${missionCompletedCount}-${currentXP}`} // Force re-render on changes
        />
        
        <div className="container mx-auto px-4 md:px-4 lg:px-4 pt-0 pb-6 max-w-5xl font-display">
          <header className="board-hero animate-fade-in mt-2 mb-5">
            <h1 className="text-3xl md:text-4xl">Momentum-Board</h1>
            <p className="text-muted-foreground mt-1">Dein tägliches Momentum: Defizit, Protein, Schritte & mehr.</p>
          </header>

          <section aria-label="Schnellerfassung" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <QuickHydrationCard />
              <QuickSupplementsCard />
              <QuickWeightCard />
              <QuickSleepCard />
              <QuickTrainingCard />
              <QuickMealsCard />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 md:gap-6 lg:gap-8 animate-fade-in">
            <div><StreakLevelHeader /></div>
            <div><MomentumNextAction data={data} missionCompletedCount={missionCompletedCount} /></div>
            <div><PlusDeficitRing data={data} /></div>
            <div><PlusMacroDeltas data={data} /></div>
            <div><PlusTrainingSteps data={data} /></div>
            <div><PlusSupportTiles data={data} /></div>
            <div><MiniJournalQuick /></div>
          </div>
        </div>
        {/* Spacer to avoid overlap with bottom composer */}
        <div aria-hidden className="h-24" />
        <MomentumBottomComposer />
      </main>
    </ErrorBoundary>
  );
};

export default MomentumBoard;
