import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Pill, Package, Sparkles, Plus, Beaker, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplementTimeline } from '@/components/supplements/SupplementTimeline';
import { SupplementInventory } from '@/components/supplements/SupplementInventory';
import { StackScoreCard } from '@/components/supplements/StackScoreCard';
import { SupplementTrackingModal } from '@/components/SupplementTrackingModal';
import { 
  useUserStackByTiming, 
  useUserStackByCategory, 
  useMissingEssentials,
  useAutoActivateEssentials,
} from '@/hooks/useSupplementLibrary';
import { shouldShowSupplement } from '@/lib/schedule-utils';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import type { UserStackItem, SupplementLibraryItem, PreferredTiming } from '@/types/supplementLibrary';
import type { SupplementSchedule } from '@/lib/schedule-utils';

type ViewMode = 'flow' | 'protocol';

// Stat Card Component
const StatCard: React.FC<{
  value: string | number;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  colorClass?: string;
  className?: string;
}> = ({ value, label, sublabel, icon, colorClass = 'bg-primary/10 text-primary', className }) => (
  <Card className={cn("bg-card/50 snap-start min-w-[140px] shrink-0", className)}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {sublabel && (
            <p className="text-[10px] text-muted-foreground/70 truncate">{sublabel}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function SupplementsPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewMode>('flow');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // User's current phase (default to 0 = Foundation)
  const userPhase = 0;

  // Fetch data with today's intake logs
  const {
    groupedByTiming,
    activeStack,
    todayIntakes,
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useUserStackByTiming();

  const {
    groupedByCategory,
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useUserStackByCategory();

  // Missing essentials indicator
  const { missingCount, totalEssentials } = useMissingEssentials(userPhase);

  // Auto-activate essentials hook
  const { activateEssentials, isActivating } = useAutoActivateEssentials();

  const isLoading = timelineLoading || inventoryLoading;

  // Calculate stats
  const totalInStack = Object.values(groupedByCategory).reduce(
    (sum, items) => sum + items.length,
    0
  );
  const totalActive = activeStack?.length || 0;

  // Smart scheduling: count how many are due TODAY
  const todayCount = useMemo(() => {
    return (activeStack || []).filter((s) => {
      // Safely cast schedule - it's stored as JSON in DB
      const schedule = s.schedule && typeof s.schedule === 'object' && 'type' in s.schedule
        ? (s.schedule as unknown as SupplementSchedule)
        : null;
      return shouldShowSupplement(schedule);
    }).length;
  }, [activeStack]);

  // Stack Score: % of essentials activated
  const stackScore = useMemo(() => {
    if (totalEssentials === 0) return 100;
    const activeEssentials = totalEssentials - missingCount;
    return Math.round((activeEssentials / totalEssentials) * 100);
  }, [totalEssentials, missingCount]);

  // Filter groupedByTiming to only show supplements due today
  const todaysGroupedByTiming = useMemo(() => {
    const filtered: Record<PreferredTiming, UserStackItem[]> = {} as any;
    for (const [timing, items] of Object.entries(groupedByTiming)) {
      filtered[timing as PreferredTiming] = (items || []).filter((s) => {
        // Safely cast schedule
        const schedule = s.schedule && typeof s.schedule === 'object' && 'type' in s.schedule
          ? (s.schedule as unknown as SupplementSchedule)
          : null;
        return shouldShowSupplement(schedule);
      });
    }
    return filtered;
  }, [groupedByTiming]);

  // Handle add button click
  const handleAdd = () => {
    setIsAddModalOpen(true);
  };

  const handleAddComplete = () => {
    setIsAddModalOpen(false);
    refetchTimeline();
    refetchInventory();
    window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
  };

  // Handle auto-activate essentials
  const handleAutoActivate = async () => {
    await activateEssentials();
    refetchTimeline();
    refetchInventory();
  };

  // Log stack completion to DB
  const handleLogStack = useCallback(async (timing: PreferredTiming, supplementIds: string[]) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const logs = supplementIds.map(id => ({
      user_id: user.id,
      user_supplement_id: id,
      timing,
      taken: true,
      date: today,
    }));

    const { error } = await supabase
      .from('supplement_intake_log')
      .upsert(logs, { onConflict: 'user_supplement_id,date,timing' });

    if (error) {
      console.error('Error logging stack:', error);
      toast.error('Fehler beim Speichern');
      return;
    }

    haptics.success();
    refetchTimeline();
    window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
  }, [user, refetchTimeline]);

  // Cross-layer sync: listen for changes from other layers
  useEffect(() => {
    const handleStackChanged = () => {
      refetchTimeline();
      refetchInventory();
    };
    window.addEventListener('supplement-stack-changed', handleStackChanged);
    return () => window.removeEventListener('supplement-stack-changed', handleStackChanged);
  }, [refetchTimeline, refetchInventory]);

  return (
    <div className="container max-w-2xl py-6 pb-24 space-y-5">
      {/* Header */}
        <div className="flex items-start gap-3 px-1">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Pill className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-0.5">Stack Architect</h1>
            <p className="text-muted-foreground text-xs">
              Optimiere dein Supplement-Timing für maximale Absorption
            </p>
          </div>
        </div>

      {/* Horizontal Scroll Stats */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
        <StatCard
          value={totalActive}
          label="Aktiv"
          sublabel={`${todayCount} heute fällig`}
          icon={<Package className="h-4 w-4" />}
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          value={totalInStack}
          label="Im Stack"
          icon={<Beaker className="h-4 w-4" />}
          colorClass="bg-blue-500/10 text-blue-500"
        />
        <StackScoreCard
          score={stackScore}
          essentialsActive={totalEssentials - missingCount}
          essentialsTotal={totalEssentials}
        />
        {missingCount > 0 && (
          <StatCard
            value={missingCount}
            label="Essentials fehlen"
            icon={<Sparkles className="h-4 w-4" />}
            colorClass="bg-amber-500/10 text-amber-500"
          />
        )}
      </div>

      {/* Segmented Control (iOS-Style Tab Switcher) */}
      <div className="bg-muted/50 p-1 rounded-xl">
        <div className="relative flex">
          {/* Animated background slider */}
          <motion.div
            className="absolute top-0 bottom-0 bg-background rounded-lg shadow-sm"
            initial={false}
            animate={{
              x: activeView === 'flow' ? 0 : '100%',
              width: '50%',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />

          <button
            onClick={() => setActiveView('flow')}
            className={cn(
              "flex-1 relative z-10 py-2.5 text-sm font-medium transition-colors text-center flex items-center justify-center gap-2 rounded-lg",
              activeView === 'flow' ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <CalendarClock className="h-4 w-4" />
            Tagesablauf
          </button>

          <button
            onClick={() => setActiveView('protocol')}
            className={cn(
              "flex-1 relative z-10 py-2.5 text-sm font-medium transition-colors text-center flex items-center justify-center gap-2 rounded-lg",
              activeView === 'protocol' ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Beaker className="h-4 w-4" />
            Protokoll
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingSkeleton />
          </motion.div>
        ) : activeView === 'flow' ? (
          <motion.div
            key="flow"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <SupplementTimeline
              groupedByTiming={todaysGroupedByTiming}
              todayIntakes={todayIntakes}
              onLogStack={handleLogStack}
              onAutoActivateEssentials={handleAutoActivate}
              onRefetch={refetchTimeline}
              isActivating={isActivating}
            />
          </motion.div>
        ) : (
          <motion.div
            key="protocol"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <SupplementInventory
              groupedByCategory={groupedByCategory}
              onAdd={handleAdd}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Supplement Modal */}
      <SupplementTrackingModal
        isOpen={isAddModalOpen}
        onClose={handleAddComplete}
      />
    </div>
  );
}

// Loading skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-4 rounded-xl border border-border/30 bg-card/50">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);
