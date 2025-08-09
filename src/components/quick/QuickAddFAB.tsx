import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Plus } from "lucide-react";
import { QuickActionsMenu, ActionType } from "./QuickActionsMenu";
import { toast } from "@/components/ui/sonner";
import { quickAddBus } from "./quickAddBus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const QuickMealSheet = lazy(() => import("./QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));
const QuickWorkoutModal = lazy(() => import("@/components/QuickWorkoutModal").then(m => ({ default: m.QuickWorkoutModal })));
const QuickSleepModal = lazy(() => import("@/components/quick/QuickSleepModal"));
const QuickSupplementsModal = lazy(() => import("@/components/quick/QuickSupplementsModal"));

export const QuickAddFAB: React.FC<{ statuses?: Partial<Record<ActionType, 'ok' | 'partial' | 'due'>> }> = ({ statuses }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [suppsOpen, setSuppsOpen] = useState(false);
  const [recommendedWorkoutType, setRecommendedWorkoutType] = useState<string | undefined>('walking');

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const { user } = useAuth();

  const handleQuickFluid = useCallback(async (fluidType: 'water' | 'coffee' | 'tea') => {
    if (!user) {
      toast.error("Bitte zuerst anmelden");
      return;
    }

    const amounts = { water: 250, coffee: 200, tea: 200 };
    const fluidNames = { water: 'Wasser', coffee: 'Kaffee', tea: 'Tee' };
    
    try {
      const { error } = await supabase.from('user_fluids').insert({
        user_id: user.id,
        custom_name: fluidNames[fluidType],
        amount_ml: amounts[fluidType],
        consumed_at: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      toast.success(`${amounts[fluidType]}ml ${fluidNames[fluidType]} hinzugefügt`);
    } catch (error) {
      toast.error("Fehler beim Hinzufügen");
    }
  }, [user]);

  const handleSelect = useCallback((type: ActionType) => {
    if (type === "meal") {
      setMenuOpen(false);
      setMealOpen(true);
      return;
    }
    if (type === "water" || type === "coffee" || type === "tea") {
      setMenuOpen(false);
      handleQuickFluid(type as 'water' | 'coffee' | 'tea');
      return;
    }
    if (type === "workout") {
      setMenuOpen(false);
      setRecommendedWorkoutType('walking');
      setWorkoutOpen(true);
      return;
    }
    if (type === "sleep") {
      setMenuOpen(false);
      setSleepOpen(true);
      return;
    }
    if (type === "supplements") {
      setMenuOpen(false);
      setSuppsOpen(true);
      return;
    }

    if (type === "coach") toast.info("Coach-Zugang kommt bald ✨");
    setMenuOpen(false);
  }, [handleQuickFluid]);

  useEffect(() => {
    const unsub = quickAddBus.subscribe((action) => {
      setMenuOpen(false);
      if (action.type === 'meal') setMealOpen(true);
      if (action.type === 'sleep') setSleepOpen(true);
      if (action.type === 'supplements') setSuppsOpen(true);
      if (action.type === 'workout') {
        setRecommendedWorkoutType(action.payload?.recommendedType);
        setWorkoutOpen(true);
      }
    });
    return unsub;
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <div
        className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={toggleMenu}
          aria-label={menuOpen ? "Schnellmenü schließen" : "Schnellmenü öffnen"}
          aria-pressed={menuOpen}
          className="rounded-full w-16 h-16 md:w-16 md:h-16 grid place-items-center bg-background text-foreground border border-border shadow-lg transition-all duration-300 hover:scale-105"
         >
           {/* Plus ➜ Minus animation */}
           <span className={`relative block w-7 h-7 transition-transform duration-300 ${menuOpen ? 'rotate-90' : 'rotate-0'}`}>
             <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] w-7 bg-foreground rounded-full transition-all duration-300`} />
             <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-7 bg-foreground rounded-full transition-all duration-300 ${menuOpen ? 'scale-y-0' : 'scale-y-100'}`} />
           </span>
         </button>
      </div>

      {/* Overlay menu */}
      <QuickActionsMenu open={menuOpen} onSelect={handleSelect} onClose={() => setMenuOpen(false)} statuses={statuses} />

      {/* Meal flow (Sheet) */}
      <Suspense fallback={null}>
        <QuickMealSheet open={mealOpen} onOpenChange={setMealOpen} />
      </Suspense>

      {/* Workout flow (existing modal) */}
      <Suspense fallback={null}>
        <QuickWorkoutModal isOpen={workoutOpen} onClose={() => setWorkoutOpen(false)} contextData={{ recommendedType: recommendedWorkoutType ?? 'walking' }} />
      </Suspense>

      {/* Sleep flow */}
      <Suspense fallback={null}>
        <QuickSleepModal isOpen={sleepOpen} onClose={() => setSleepOpen(false)} />
      </Suspense>

      {/* Supplements flow */}
      <Suspense fallback={null}>
        <QuickSupplementsModal isOpen={suppsOpen} onClose={() => setSuppsOpen(false)} />
      </Suspense>
    </>
  );
};

export default QuickAddFAB;
