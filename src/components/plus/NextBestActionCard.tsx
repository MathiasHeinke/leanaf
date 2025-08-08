import React, { useEffect, useMemo, useState } from 'react';
import { CardContent } from '@/components/ui/card';
import PlusCard from '@/components/plus/PlusCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UsePlusDataResult } from '@/hooks/usePlusData';
import { Zap, ArrowRight, Check, Moon, Dumbbell, Droplets, Pill, Utensils } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';
import { openMeal, openSleep, openSupplements, openWorkout } from '@/components/quick/quickAddBus';
import { supabase } from '@/integrations/supabase/client';
import { triggerDataRefresh } from '@/hooks/useDataRefresh';
import { toast } from '@/components/ui/sonner';

interface NextBestActionCardProps {
  data: UsePlusDataResult;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  cta: string;
  type:
    | 'macros'
    | 'sleep'
    | 'supplements'
    | 'workout'
    | 'hydration';
  completed: boolean;
  heat: number; // higher = hotter
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({ data }) => {
  const { loading, proteinDelta } = data as any;

  // Heuristics from available data with safe fallbacks
  const macrosDone = typeof proteinDelta === 'number' ? proteinDelta <= 0 : false;
  const sleepLogged = Boolean((data as any)?.sleepLoggedToday || ((data as any)?.sleepDurationToday ?? 0) > 0);
  const supplementsLogged = Boolean((data as any)?.supplementsLoggedToday);
  const stepsToday: number = (data as any)?.stepsToday ?? 0;
  const stepsTarget: number = (data as any)?.stepsTarget ?? 7000;
  const workoutLogged = Boolean((data as any)?.workoutLoggedToday || stepsToday >= stepsTarget);
  const hydrationMl: number = (data as any)?.hydrationMlToday ?? 0;
  const hydrationLogged = hydrationMl >= 1500;

  const currentHour = new Date().getHours();

  const missions = useMemo<Mission[]>(() => {
    const heatProtein = typeof proteinDelta === 'number' ? Math.min(100, Math.max(0, proteinDelta)) : 40;
    const heatSleep = sleepLogged ? 10 : currentHour < 14 ? 90 : 70;
    const heatSupps = supplementsLogged ? 5 : 60;
    const heatWorkout = workoutLogged ? 15 : (currentHour < 18 ? 80 : 65);
    const heatHydration = hydrationLogged ? 8 : 55;

    const list: Mission[] = [
      {
        id: 'macros',
        title: macrosDone && typeof proteinDelta === 'number' ? '+0g Protein' : `+${Math.max(0, Math.round(proteinDelta || 0))}g Protein`,
        description: macrosDone
          ? 'Makro-Ziele sind für heute im grünen Bereich'
          : `Dir fehlen noch ${Math.max(0, Math.round(proteinDelta || 0))}g Protein heute`,
        cta: macrosDone ? 'Ansehen' : 'Mahlzeit/Makros eintragen',
        type: 'macros',
        completed: macrosDone,
        heat: heatProtein,
        Icon: Utensils,
      },
      {
        id: 'sleep',
        title: 'Schlaf eintragen',
        description: sleepLogged ? 'Schlaf ist protokolliert' : 'Letzte Nacht eintragen (Start/Ende oder Dauer)'
        ,
        cta: sleepLogged ? 'Ansehen' : 'Schlaf hinzufügen',
        type: 'sleep',
        completed: sleepLogged,
        heat: heatSleep,
        Icon: Moon,
      },
      {
        id: 'supplements',
        title: 'Supplements',
        description: supplementsLogged ? 'Supplements heute erledigt' : 'Heute eingenommene Supplements abhaken',
        cta: supplementsLogged ? 'Ansehen' : 'Supplements abhaken',
        type: 'supplements',
        completed: supplementsLogged,
        heat: heatSupps,
        Icon: Pill,
      },
      {
        id: 'workout',
        title: 'Workout/Laufen',
        description: workoutLogged ? 'Bewegung/Workout erfasst' : 'Workout starten oder Schritte sammeln',
        cta: workoutLogged ? 'Ansehen' : 'Workout/Run starten',
        type: 'workout',
        completed: workoutLogged,
        heat: heatWorkout,
        Icon: Dumbbell,
      },
      {
        id: 'hydration',
        title: 'Hydration',
        description: hydrationLogged ? 'Genug getrunken' : '2 Gläser Wasser (ca. 500ml) hinzufügen',
        cta: hydrationLogged ? 'Ansehen' : '500ml hinzufügen',
        type: 'hydration',
        completed: hydrationLogged,
        heat: heatHydration,
        Icon: Droplets,
      },
    ];

    // Sort hot → cold; completed items go to the end but keep order
    const incomplete = list.filter((m) => !m.completed).sort((a, b) => b.heat - a.heat);
    const complete = list.filter((m) => m.completed).sort((a, b) => b.heat - a.heat);
    return [...incomplete, ...complete];
  }, [proteinDelta, macrosDone, sleepLogged, supplementsLogged, workoutLogged, hydrationLogged, currentHour]);

  const completedCount = missions.filter((m) => m.completed).length;
  const totalMissions = missions.length;
  const progressPct = Math.round((completedCount / totalMissions) * 100);

  // Celebrate at milestones (>=3 and then 100%)
  const [celebrated3, setCelebrated3] = useState(false);
  const [celebratedAll, setCelebratedAll] = useState(false);
  useEffect(() => {
    if (!celebrated3 && completedCount >= 3) {
      setCelebrated3(true);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
    }
    if (!celebratedAll && completedCount === totalMissions) {
      setCelebratedAll(true);
      confetti({ particleCount: 150, spread: 70, scalar: 1.1, origin: { y: 0.7 } });
    }
  }, [completedCount, totalMissions, celebrated3, celebratedAll]);

  // Local optimistic state to mark as done via CTA when no deep integration yet
  const [manualDone, setManualDone] = useState<Record<string, boolean>>({});
  const effectiveMissions = missions.map((m) => ({
    ...m,
    completed: m.completed || manualDone[m.id] === true,
  }));
  const effCompleted = effectiveMissions.filter((m) => m.completed).length;
  const effProgressPct = Math.round((effCompleted / totalMissions) * 100);

  return (
    <PlusCard className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6 space-y-4">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <div className="text-sm font-medium text-primary">Next Best Action</div>
              </div>
              <Badge variant="secondary" className="text-xs">Jetzt</Badge>
            </div>

            {/* Carousel */}
            <Carousel opts={{ align: 'start' }}>
              <CarouselContent>
                {effectiveMissions.map((m) => (
                  <CarouselItem key={m.id} className="basis-full">
                    <div className="space-y-3">
                      <div className="text-xl font-semibold flex items-center gap-2">
                        <m.Icon className="h-5 w-5 text-primary" />
                        <span>{m.title}</span>
                        {m.completed && (
                          <Check className="h-5 w-5 text-primary" aria-label="erledigt" />
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">{m.description}</div>

                      <Button
                        className="w-full"
                        size="sm"
                        onClick={async () => {
                          if (m.completed) return;
                          try {
                            switch (m.type) {
                              case 'macros':
                                openMeal();
                                break;
                              case 'sleep':
                                openSleep();
                                break;
                              case 'supplements':
                                openSupplements();
                                break;
                              case 'workout':
                                openWorkout({ recommendedType: 'walking' });
                                break;
                              case 'hydration': {
                                const { data: auth } = await supabase.auth.getUser();
                                const userId = auth.user?.id;
                                if (!userId) { toast.error('Bitte zuerst anmelden'); break; }
                                const today = new Date().toISOString().slice(0,10);
                                const { error } = await supabase.from('user_fluids').insert({ user_id: userId, amount_ml: 500, date: today, consumed_at: new Date().toISOString() });
                                if (error) throw error;
                                toast.success('500 ml hinzugefügt');
                                triggerDataRefresh();
                                break;
                              }
                            }
                            setManualDone((prev) => ({ ...prev, [m.id]: true }));
                          } catch (e) {
                            toast.error('Aktion fehlgeschlagen');
                          }
                        }}
                        disabled={m.completed}
                      >
                        <span>{m.cta}</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Dots with checkmarks */}
            <div className="flex items-center justify-center gap-2">
              {effectiveMissions.map((m, idx) => (
                <div
                  key={m.id}
                  className={`h-2.5 w-2.5 rounded-full border border-primary/40 ${
                    m.completed ? 'bg-primary' : 'bg-primary/10'
                  }`}
                  aria-label={`Slide ${idx + 1} ${m.completed ? 'fertig' : ''}`}
                />
              ))}
            </div>

            {/* Tagesmission Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="font-medium">Tagesmission</div>
                <div className="text-muted-foreground tabular-nums">{effCompleted}/{totalMissions}</div>
              </div>
              <Progress
                value={effProgressPct}
                indicatorClassName="bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
                aria-label="Tagesmission Fortschritt"
              />
              <div className="text-[11px] text-muted-foreground">
                {effCompleted >= 3 && effCompleted < totalMissions
                  ? 'Bonus: Erledige mehr für Multiplikatoren!'
                  : effCompleted === totalMissions
                  ? 'Mission erfüllt!'
                  : 'Erledige 3 von 5 für die Tagesmission'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </PlusCard>
  );
};
