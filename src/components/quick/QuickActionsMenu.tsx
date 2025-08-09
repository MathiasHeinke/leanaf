import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Moon, Pill, MessageCircle, Utensils, Droplets, Coffee, Wine } from "lucide-react";

export type ActionType = "meal" | "workout" | "sleep" | "supplements" | "coach";

interface QuickActionsMenuProps {
  open: boolean;
  onSelect: (type: ActionType) => void;
  onClose: () => void;
  statuses?: Partial<Record<ActionType, 'ok' | 'partial' | 'due'>>;
}

const actions: { key: ActionType; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "meal", label: "Mahlzeit", Icon: Utensils },
  { key: "workout", label: "Workout", Icon: Dumbbell },
  { key: "sleep", label: "Schlaf", Icon: Moon },
  { key: "supplements", label: "Supps", Icon: Pill },
  { key: "coach", label: "Coach", Icon: MessageCircle },
];

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({ open, onSelect, onClose, statuses }) => {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartY = useRef<number | null>(null);

  // Initial focus + keyboard controls (Esc to close, arrows to navigate)
  useEffect(() => {
    if (!open) return;

    const raf = requestAnimationFrame(() => {
      buttonRefs.current[0]?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        moveFocus(-1);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const moveFocus = (delta: number) => {
    const refs = buttonRefs.current;
    const active = document.activeElement as HTMLElement | null;
    const currentIndex = refs.findIndex((el) => el === active);
    const count = actions.length;
    const nextIndex = ((currentIndex >= 0 ? currentIndex : -1) + delta + count) % count;
    refs[nextIndex]?.focus();
  };

  const onOverlayTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onOverlayTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartY.current;
    if (start == null) return;
    const endY = e.changedTouches[0]?.clientY ?? start;
    if (endY - start > 40) onClose(); // swipe down closes
    touchStartY.current = null;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Schnellaktionen"
        >
          {/* Backdrop overlay - appears only when menu is open */}
          <div
            aria-hidden
            onClick={onClose}
            onTouchStart={onOverlayTouchStart}
            onTouchEnd={onOverlayTouchEnd}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />

          {/* Actions cluster - bottom right, large thumb targets */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="pointer-events-auto absolute right-4 bottom-24 md:right-6 md:bottom-28 flex flex-col items-end gap-3"
          >
            {actions.map((a, idx) => {
              const Icon = a.Icon;
              return (
                <motion.button
                  key={a.key}
                  ref={(el) => (buttonRefs.current[idx] = el)}
                  initial={{ scale: 0.8, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 8 }}
                  transition={{ delay: 0.02 * idx, type: "spring", stiffness: 300, damping: 22 }}
                  onClick={() => onSelect(a.key)}
                  className="relative glass-card rounded-full shadow-lg border border-border/40 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring w-14 h-14 flex items-center justify-center"
                  aria-label={a.label}
                >
                  <Icon className="w-6 h-6 text-foreground" />
                  {/* status dot */}
                  { (typeof (open) !== 'undefined') && (
                    <span
                      className={
                        `absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
                          (statuses?.[a.key] === 'due') ? 'bg-destructive animate-pulse' :
                          (statuses?.[a.key] === 'partial') ? 'bg-warning' :
                          (statuses?.[a.key] === 'ok') ? 'bg-fats' : 'bg-transparent'
                        }`
                      }
                      aria-hidden
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
