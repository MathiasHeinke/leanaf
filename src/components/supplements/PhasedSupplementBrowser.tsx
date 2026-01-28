import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, Zap, FlaskConical, Rocket, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplementRecommendationCard, SupplementRecommendationRow } from './SupplementRecommendationCard';
import { useSupplementsByPhase, useUserStack } from '@/hooks/useSupplementLibrary';
import { PHASE_CONFIG, NECESSITY_TIER_CONFIG, type SupplementLibraryItem } from '@/types/supplementLibrary';
import { cn } from '@/lib/utils';

interface PhasedSupplementBrowserProps {
  initialPhase?: number;
  onAddSupplement: (supplement: SupplementLibraryItem) => void;
  userPhase?: number;
}

export const PhasedSupplementBrowser: React.FC<PhasedSupplementBrowserProps> = ({
  initialPhase = 0,
  onAddSupplement,
  userPhase = 0,
}) => {
  const [selectedPhase, setSelectedPhase] = useState(initialPhase);
  const [showOnlyEssentials, setShowOnlyEssentials] = useState(true);
  const [showSpecialists, setShowSpecialists] = useState(false);

  const { data: phaseData, isLoading } = useSupplementsByPhase(selectedPhase);
  const { data: userStack } = useUserStack();

  // Get names of supplements already in user's stack
  const userStackNames = useMemo(() => {
    return new Set((userStack || []).map(s => s.name.toLowerCase().trim()));
  }, [userStack]);

  const isInStack = (supplement: SupplementLibraryItem) => {
    return userStackNames.has(supplement.name.toLowerCase().trim());
  };

  // Group supplements by category
  const groupedEssentials = useMemo(() => {
    const essentials = phaseData?.essentials || [];
    return essentials.reduce((acc, item) => {
      const category = item.category || 'Sonstige';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, SupplementLibraryItem[]>);
  }, [phaseData?.essentials]);

  const groupedOptimizers = useMemo(() => {
    const optimizers = phaseData?.optimizers || [];
    return optimizers.reduce((acc, item) => {
      const category = item.category || 'Sonstige';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, SupplementLibraryItem[]>);
  }, [phaseData?.optimizers]);

  const isHigherPhase = selectedPhase > userPhase;

  return (
    <div className="space-y-6">
      {/* Phase Tabs */}
      <Tabs 
        value={selectedPhase.toString()} 
        onValueChange={(v) => setSelectedPhase(parseInt(v))}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            {[0, 1, 2, 3].map((phase) => {
              const config = PHASE_CONFIG[phase];
              const isCurrentPhase = phase === userPhase;
              return (
                <TabsTrigger 
                  key={phase} 
                  value={phase.toString()}
                  className={cn(
                    "text-xs sm:text-sm",
                    isCurrentPhase && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <span className="mr-1">{config.icon}</span>
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden">{phase}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Filter Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="essentials-only"
                checked={showOnlyEssentials}
                onCheckedChange={setShowOnlyEssentials}
              />
              <Label htmlFor="essentials-only" className="text-sm">
                Nur Essentials
              </Label>
            </div>
          </div>
        </div>

        {/* Phase Content */}
        {[0, 1, 2, 3].map((phase) => (
          <TabsContent key={phase} value={phase.toString()} className="mt-0">
            {/* Phase Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{PHASE_CONFIG[phase].icon}</span>
                <h3 className="text-xl font-bold">{PHASE_CONFIG[phase].label}</h3>
                {phase === userPhase && (
                  <Badge variant="default" className="ml-2">Deine Phase</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {PHASE_CONFIG[phase].description}
              </p>
            </div>

            {/* Higher Phase Warning */}
            {selectedPhase > userPhase && (
              <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      Fortgeschrittene Phase
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Diese Supplements sind für {PHASE_CONFIG[selectedPhase].description}. 
                      Stelle sicher, dass du die Grundlagen aus Phase 0 abgedeckt hast.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-8">
                {/* ESSENTIALS Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{NECESSITY_TIER_CONFIG.essential.icon}</span>
                    <h4 className="font-bold text-lg">{NECESSITY_TIER_CONFIG.essential.label}</h4>
                    <Badge variant="outline" className="ml-2">
                      {phaseData?.essentials?.length || 0}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {NECESSITY_TIER_CONFIG.essential.description}
                  </p>

                  {Object.keys(groupedEssentials).length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">
                      Keine Essential-Supplements für diese Phase definiert.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedEssentials).map(([category, supplements]) => (
                        <div key={category}>
                          <h5 className="text-sm font-medium text-muted-foreground mb-3">
                            {category}
                          </h5>
                          <div className="grid gap-3">
                            {supplements.map((supplement) => (
                              <SupplementRecommendationCard
                                key={supplement.id}
                                supplement={supplement}
                                onAdd={onAddSupplement}
                                isInStack={isInStack(supplement)}
                                variant="essential"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* OPTIMIZERS Section - Only if not filtering */}
                {!showOnlyEssentials && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">{NECESSITY_TIER_CONFIG.optimizer.icon}</span>
                      <h4 className="font-bold text-lg">{NECESSITY_TIER_CONFIG.optimizer.label}</h4>
                      <Badge variant="outline" className="ml-2">
                        {phaseData?.optimizers?.length || 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {NECESSITY_TIER_CONFIG.optimizer.description}
                    </p>

                    {Object.keys(groupedOptimizers).length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4">
                        Keine Optimizer-Supplements für diese Phase definiert.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedOptimizers).map(([category, supplements]) => (
                          <div key={category}>
                            <h5 className="text-sm font-medium text-muted-foreground mb-2">
                              {category}
                            </h5>
                            <div className="border rounded-lg divide-y">
                              {supplements.map((supplement) => (
                                <SupplementRecommendationRow
                                  key={supplement.id}
                                  supplement={supplement}
                                  onAdd={onAddSupplement}
                                  isInStack={isInStack(supplement)}
                                  variant="optimizer"
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* SPECIALISTS Section - Collapsible */}
                {!showOnlyEssentials && (phaseData?.specialists?.length || 0) > 0 && (
                  <Collapsible open={showSpecialists} onOpenChange={setShowSpecialists}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <span>{NECESSITY_TIER_CONFIG.specialist.icon}</span>
                          <span>{NECESSITY_TIER_CONFIG.specialist.label}</span>
                          <Badge variant="outline">
                            {phaseData?.specialists?.length || 0}
                          </Badge>
                        </div>
                        {showSpecialists ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        {NECESSITY_TIER_CONFIG.specialist.description}
                      </p>
                      <div className="border rounded-lg divide-y">
                        {phaseData?.specialists?.map((supplement) => (
                          <SupplementRecommendationRow
                            key={supplement.id}
                            supplement={supplement}
                            onAdd={onAddSupplement}
                            isInStack={isInStack(supplement)}
                            variant="specialist"
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export default PhasedSupplementBrowser;
