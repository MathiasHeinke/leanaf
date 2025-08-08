import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Plus } from "lucide-react";
import { QuickActionsMenu, ActionType } from "./QuickActionsMenu";
import { toast } from "@/components/ui/sonner";
import { quickAddBus } from "./quickAddBus";

const QuickMealSheet = lazy(() => import("./QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));
const QuickWorkoutModal = lazy(() => import("@/components/QuickWorkoutModal").then(m => ({ default: m.QuickWorkoutModal })));
const QuickSleepModal = lazy(() => import("@/components/quick/QuickSleepModal"));
const QuickSupplementsModal = lazy(() => import("@/components/quick/QuickSupplementsModal"));

export const QuickAddFAB: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [suppsOpen, setSuppsOpen] = useState(false);
  const [recommendedWorkoutType, setRecommendedWorkoutType] = useState<string | undefined>('walking');

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const handleSelect = useCallback((type: ActionType) => {
    if (type === "meal") {
      setMenuOpen(false);
      setMealOpen(true);
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
  }, []);

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
          className="rounded-full w-16 h-16 md:w-16 md:h-16 grid place-items-center bg-background text-foreground border border-border shadow-lg transition-all duration-200 hover:scale-105"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Overlay menu */}
      <QuickActionsMenu open={menuOpen} onSelect={handleSelect} onClose={() => setMenuOpen(false)} />

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
