import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { QuickActionsMenu, ActionType } from "./QuickActionsMenu";
import { toast } from "@/components/ui/sonner";
import { quickAddBus } from "@/components/quick/quickAddBus";

const QuickMealSheet = lazy(() => import("./QuickMealSheet").then(m => ({ default: m.QuickMealSheet })));
const QuickWorkoutModal = lazy(() => import("@/components/QuickWorkoutModal").then(m => ({ default: m.QuickWorkoutModal })));
const QuickSleepModal = lazy(() => import("@/components/quick/QuickSleepModal"));
const QuickFluidModal = lazy(() => import("@/components/quick/QuickFluidModal"));
const ChemistryStackSheet = lazy(() => import("@/components/home/ChemistryStackSheet"));
const BodyStackSheet = lazy(() => import("@/components/home/BodyStackSheet"));

export const QuickAddFAB: React.FC<{ statuses?: Partial<Record<ActionType, 'ok' | 'partial' | 'due'>> }> = ({ statuses }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fluidOpen, setFluidOpen] = useState(false);
  const [chemistryOpen, setChemistryOpen] = useState(false);
  const [bodyOpen, setBodyOpen] = useState(false);
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
    if (type === "chemistry") {
      setMenuOpen(false);
      setChemistryOpen(true);
      return;
    }
    if (type === "body") {
      setMenuOpen(false);
      setBodyOpen(true);
      return;
    }
    if (type === "journal") {
      setMenuOpen(false);
      setFluidOpen(true); // TODO: Replace with Journal modal when ready
      return;
    }
    if (type === "bloodwork") {
      setMenuOpen(false);
      navigate('/bloodwork?tab=entry');
      return;
    }

    if (type === "coach") toast.info("Coach-Zugang kommt bald ✨");
    setMenuOpen(false);
  }, [navigate]);

  useEffect(() => {
    const unsub = quickAddBus.subscribe((action) => {
      setMenuOpen(false);
      if (action.type === 'meal') setMealOpen(true);
      if (action.type === 'sleep') setSleepOpen(true);
      if (action.type === 'chemistry') setChemistryOpen(true);
      if (action.type === 'fluid') setFluidOpen(true);
      if (action.type === 'body') setBodyOpen(true);
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

      {/* Chemistry Stack (Supplements + Peptide) */}
      <Suspense fallback={null}>
        <ChemistryStackSheet isOpen={chemistryOpen} onClose={() => setChemistryOpen(false)} />
      </Suspense>

      {/* Body Stack (Weight + Tape) */}
      <Suspense fallback={null}>
        <BodyStackSheet isOpen={bodyOpen} onClose={() => setBodyOpen(false)} />
      </Suspense>

      {/* Fluid flow */}
      <Suspense fallback={null}>
        <QuickFluidModal isOpen={fluidOpen} onClose={() => setFluidOpen(false)} />
      </Suspense>
    </>
  );
};

export default QuickAddFAB;
