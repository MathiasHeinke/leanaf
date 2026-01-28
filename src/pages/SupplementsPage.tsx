import React, { useState } from 'react';
import { Pill, Clock, Package, Sparkles, Lightbulb, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplementTimeline } from '@/components/supplements/SupplementTimeline';
import { SupplementInventory } from '@/components/supplements/SupplementInventory';
import { PhasedSupplementBrowser } from '@/components/supplements/PhasedSupplementBrowser';
import { SupplementTrackingModal } from '@/components/SupplementTrackingModal';
import { useUserStackByTiming, useUserStackByCategory, useMissingEssentials } from '@/hooks/useSupplementLibrary';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UserStackItem, SupplementLibraryItem } from '@/types/supplementLibrary';

export default function SupplementsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'timeline' | 'inventory' | 'recommendations'>('timeline');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<SupplementLibraryItem | null>(null);

  // User's current phase (default to 0 = Foundation)
  const userPhase = 0; // TODO: Get from user profile/protocol status
  
  // Fetch data with both groupings
  const { 
    groupedByTiming, 
    activeStack,
    isLoading: timelineLoading,
    refetch: refetchTimeline 
  } = useUserStackByTiming();
  
  const { 
    groupedByCategory,
    isLoading: inventoryLoading,
    refetch: refetchInventory 
  } = useUserStackByCategory();

  // Missing essentials indicator
  const { missingCount, totalEssentials } = useMissingEssentials(userPhase);

  const isLoading = timelineLoading || inventoryLoading;

  // Toggle supplement active state
  const handleToggleActive = async (supplement: UserStackItem, isActive: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_supplements')
        .update({ is_active: isActive })
        .eq('id', supplement.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(isActive ? 'Supplement aktiviert' : 'Supplement pausiert');
      refetchTimeline();
      refetchInventory();
    } catch (err) {
      console.error('Error toggling supplement:', err);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Handle supplement click (for future edit modal)
  const handleSupplementClick = (supplement: UserStackItem) => {
    console.log('Supplement clicked:', supplement);
    // TODO: Open edit modal
  };

  // Handle add button click
  const handleAdd = () => {
    setSelectedRecommendation(null);
    setIsAddModalOpen(true);
  };

  // Handle add from recommendation
  const handleAddFromRecommendation = (supplement: SupplementLibraryItem) => {
    setSelectedRecommendation(supplement);
    setIsAddModalOpen(true);
  };

  const handleAddComplete = () => {
    setIsAddModalOpen(false);
    setSelectedRecommendation(null);
    refetchTimeline();
    refetchInventory();
    window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
  };

  // Stats
  const totalActive = activeStack?.length || 0;
  const totalInStack = Object.values(groupedByCategory).reduce(
    (sum, items) => sum + items.length, 0
  );

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Pill className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">Stack Architect</h1>
              <Badge variant="outline" className="text-xs">Layer 3</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Optimiere dein Supplement-Timing für maximale Absorption
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled>
            <Sparkles className="h-4 w-4" />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Hinzufügen
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInStack}</p>
                <p className="text-xs text-muted-foreground">Im Stack</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Clock className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-xs text-muted-foreground">Aktiv heute</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lightbulb className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {missingCount > 0 ? missingCount : '✓'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {missingCount > 0 ? 'Essentials fehlen' : 'Essentials komplett'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop: Tab Layout */}
      <div className="hidden lg:block">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'timeline' | 'inventory' | 'recommendations')}>
          <TabsList className="mb-6">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventar
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Empfehlungen
              {missingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {missingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <div className="grid lg:grid-cols-5 lg:gap-6">
              {/* Timeline (60%) */}
              <Card className="lg:col-span-3">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Tages-Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TimelineSkeleton />
                  ) : (
                    <SupplementTimeline
                      groupedByTiming={groupedByTiming}
                      onSupplementClick={handleSupplementClick}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Quick Inventory (40%) */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Inventar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <InventorySkeleton />
                  ) : (
                    <SupplementInventory
                      groupedByCategory={groupedByCategory}
                      onToggleActive={handleToggleActive}
                      onEdit={handleSupplementClick}
                      onAdd={handleAdd}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Vollständiges Inventar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <InventorySkeleton />
                ) : (
                  <SupplementInventory
                    groupedByCategory={groupedByCategory}
                    onToggleActive={handleToggleActive}
                    onEdit={handleSupplementClick}
                    onAdd={handleAdd}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  ARES Empfehlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhasedSupplementBrowser
                  initialPhase={userPhase}
                  userPhase={userPhase}
                  onAddSupplement={handleAddFromRecommendation}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile: Tabs */}
      <div className="lg:hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'timeline' | 'inventory' | 'recommendations')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1 text-xs">
              <Package className="h-3 w-3" />
              Inventar
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-1 text-xs">
              <Lightbulb className="h-3 w-3" />
              Tipps
              {missingCount > 0 && (
                <Badge variant="destructive" className="ml-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {missingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <TimelineSkeleton />
                ) : (
                  <SupplementTimeline
                    groupedByTiming={groupedByTiming}
                    onSupplementClick={handleSupplementClick}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <InventorySkeleton />
                ) : (
                  <SupplementInventory
                    groupedByCategory={groupedByCategory}
                    onToggleActive={handleToggleActive}
                    onEdit={handleSupplementClick}
                    onAdd={handleAdd}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <PhasedSupplementBrowser
                  initialPhase={userPhase}
                  userPhase={userPhase}
                  onAddSupplement={handleAddFromRecommendation}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Supplement Modal */}
      <SupplementTrackingModal 
        isOpen={isAddModalOpen} 
        onClose={handleAddComplete} 
      />
    </div>
  );
}

// Loading skeletons
const TimelineSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex gap-4">
        <Skeleton className="h-3 w-3 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const InventorySkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    ))}
  </div>
);
