import React, { useEffect } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { usePlusData } from '@/hooks/usePlusData';
import { BoardStickyHeader } from '@/components/plus/BoardStickyHeader';
import { PlusDeficitRing } from '@/components/plus/PlusDeficitRing';
import { PlusMacroDeltas } from '@/components/plus/PlusMacroDeltas';
import { PlusTrainingSteps } from '@/components/plus/PlusTrainingSteps';
import { PlusSupportTiles } from '@/components/plus/PlusSupportTiles';
import { NextBestActionCard } from '@/components/plus/NextBestActionCard';
import { MiniJournalQuick } from '@/components/plus/MiniJournalQuick';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import QuickAddFAB from '@/components/quick/QuickAddFAB';

const MomentumBoard: React.FC = () => {
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const enabled = isEnabled('feature_plus_dashboard');
  const data = usePlusData();

  // Page-level SEO: title, description, canonical
  useEffect(() => {
    document.title = 'Momentum-Board – Defizit, Protein, Schritte | GetLeanAI+';
    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.content = 'Dein tägliches Momentum: Kalorien-Defizit, Protein-Delta, Carb-Budget und mehr – inklusive 7‑Tage‑Trend.';
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = `${window.location.origin}/plus`;
  }, []);

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
    <main className="relative">
      <BoardStickyHeader />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-primary/20 via-background to-background blur-2xl" />
      <div className="container mx-auto px-4 md:px-4 lg:px-4 pt-2 pb-20 max-w-5xl font-display">
        <section className="mt-2 mb-5 animate-fade-in">
          <NextBestActionCard data={data} />
        </section>

        <section aria-label="Tagesmetriken" className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 lg:gap-8 animate-fade-in">
          <div><PlusDeficitRing data={data} /></div>
          <div><PlusMacroDeltas data={data} /></div>
          <div><PlusTrainingSteps data={data} /></div>
          <div><PlusSupportTiles data={data} /></div>
          <div><MiniJournalQuick /></div>
        </section>
      </div>
      <QuickAddFAB />
    </main>
  );
};

export default MomentumBoard;
