import React, { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { QuickActionsMenu, ActionType } from "./QuickActionsMenu";
import { QuickMealSheet } from "./QuickMealSheet";
import { QuickWorkoutModal } from "@/components/QuickWorkoutModal";
import { toast } from "@/components/ui/sonner";

export const QuickAddFAB: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const handleSelect = useCallback((type: ActionType) => {
    if (type === "meal") {
      setMenuOpen(false);
      setMealOpen(true);
      return;
    }
    if (type === "workout") {
      setMenuOpen(false);
      setWorkoutOpen(true);
      return;
    }

    // Stubs for now
    if (type === "sleep") toast.info("Schlaf-Quick-Input kommt bald ✨");
    if (type === "supplements") toast.info("Supplement-Stack kommt bald ✨");
    if (type === "coach") toast.info("Coach-Zugang kommt bald ✨");
    setMenuOpen(false);
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
          className="rounded-full w-16 h-16 md:w-16 md:h-16 glass-card border border-border/40 modern-shadow hover-lift flex items-center justify-center"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>

      {/* Overlay menu */}
      <QuickActionsMenu open={menuOpen} onSelect={handleSelect} onClose={() => setMenuOpen(false)} />

      {/* Meal flow (Sheet) */}
      <QuickMealSheet open={mealOpen} onOpenChange={setMealOpen} />

      {/* Workout flow (existing modal) */}
      <QuickWorkoutModal isOpen={workoutOpen} onClose={() => setWorkoutOpen(false)} />
    </>
  );
};

export default QuickAddFAB;
