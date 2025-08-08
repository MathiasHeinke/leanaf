import React, { useMemo, useState, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell, Footprints, Utensils, Plus } from "lucide-react";
import { toast } from "sonner";

export const MomentumFab: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [modalType, setModalType] = useState<"walking" | "kraft" | null>(null);

  const toggle = () => setOpen(v => !v);

  const onAddMeal = () => {
    toast.info("Mahlzeiten‑Quick‑Add kommt bald. Nutze die Liste oben.");
    setOpen(false);
  };

  const onAddWalking = () => {
    setModalType("walking");
    setOpen(false);
  };

  const onAddWorkout = () => {
    setModalType("kraft");
    setOpen(false);
  };

  const closeModal = () => setModalType(null);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="mb-2 flex flex-col items-end gap-2">
            <Button size="sm" variant="secondary" className="shadow-md" onClick={onAddMeal}>
              <Utensils className="h-4 w-4 mr-2" /> Mahlzeit
            </Button>
            <Button size="sm" variant="secondary" className="shadow-md" onClick={onAddWalking}>
              <Footprints className="h-4 w-4 mr-2" /> Schritte
            </Button>
            <Button size="sm" variant="secondary" className="shadow-md" onClick={onAddWorkout}>
              <Dumbbell className="h-4 w-4 mr-2" /> Workout
            </Button>
          </div>
        )}
        <Button size="icon" className="rounded-full shadow-lg" onClick={toggle} aria-label="Schnellaktionen">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <Suspense fallback={null}>
        {modalType && (
          <QuickWorkoutModal isOpen={!!modalType} onClose={closeModal} contextData={{ recommendedType: modalType }} />
        )}
      </Suspense>
    </>
  );
};

// Lazy import to keep initial bundle light
const QuickWorkoutModal = lazy(() =>
  import("@/components/QuickWorkoutModal").then((m) => ({ default: m.QuickWorkoutModal }))
);
