import React, { useEffect, useState } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { usePlusData } from '@/hooks/usePlusData';
import { BoardStickyHeader } from '@/components/plus/BoardStickyHeader';
import { HeroActionTile } from '@/components/plus/HeroActionTile';
import { CompactDeficitRing } from '@/components/plus/CompactDeficitRing';
import { CompactMacros } from '@/components/plus/CompactMacros';
import { CompactTraining } from '@/components/plus/CompactTraining';
import { PlusSupportTiles } from '@/components/plus/PlusSupportTiles';
import { QuickActionsSheet } from '@/components/plus/QuickActionsSheet';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const MomentumBoard: React.FC = () => {
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();
  const enabled = isEnabled('feature_plus_dashboard');
  const data = usePlusData();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const handleQuickAction = (action: string) => {
    // TODO: Implement actual quick add functionality
    toast.success(`${action} erfassen - Coming soon!`);
  };

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
    <div className="relative min-h-screen">
      <BoardStickyHeader />
      
      <main className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-primary/10 to-transparent" />
        
        <div className="container mx-auto px-4 pt-6 pb-20 max-w-5xl space-y-6 animate-fade-in">
          {/* Hero Action Tile */}
          <HeroActionTile data={data} />
          
          {/* Metrics Grid */}
          <div className="space-y-4">
            {/* Calorie Deficit */}
            <CompactDeficitRing data={data} />
            
            {/* Macros Row */}
            <CompactMacros data={data} />
            
            {/* Training & Steps Row */}
            <CompactTraining data={data} />
            
            {/* Support (Collapsed by default) */}
            <details className="group">
              <summary className="cursor-pointer">
                <Card className="group-open:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Hydration & Schlaf</span>
                      <Plus className="h-4 w-4 group-open:rotate-45 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </summary>
              <div className="mt-3">
                <PlusSupportTiles data={data} />
              </div>
            </details>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setQuickActionsOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Quick Actions Sheet */}
      <QuickActionsSheet
        open={quickActionsOpen}
        onOpenChange={setQuickActionsOpen}
        onSelect={handleQuickAction}
      />
    </div>
  );
};

export default MomentumBoard;
