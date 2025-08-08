import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Moon, Pill, MessageCircle, Utensils } from "lucide-react";

export type ActionType = "meal" | "workout" | "sleep" | "supplements" | "coach";

interface QuickActionsMenuProps {
  open: boolean;
  onSelect: (type: ActionType) => void;
  onClose: () => void;
}

const actions: { key: ActionType; label: string; Icon: React.ComponentType<any> }[] = [
  { key: "meal", label: "Mahlzeit", Icon: Utensils },
  { key: "workout", label: "Workout", Icon: Dumbbell },
  { key: "sleep", label: "Schlaf", Icon: Moon },
  { key: "supplements", label: "Supps", Icon: Pill },
  { key: "coach", label: "Coach", Icon: MessageCircle },
];

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({ open, onSelect, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="pointer-events-none fixed inset-0 z-50"
  role="dialog"
>
  {/* Actions cluster - bottom right, large thumb targets (no backdrop) */}
  <motion.div
    initial={{ y: 24, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 24, opacity: 0 }}
    transition={{ type: "spring", stiffness: 260, damping: 24 }}
    className="pointer-events-auto absolute right-4 bottom-24 md:right-6 md:bottom-28 flex flex-col items-end gap-3"
  >
    {actions.map((a, idx) => (
      <motion.button
        key={a.key}
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 8 }}
        transition={{ delay: 0.02 * idx, type: "spring", stiffness: 300, damping: 22 }}
        onClick={() => onSelect(a.key)}
        className="glass-card rounded-full shadow-lg border border-border/40 hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring w-14 h-14 flex items-center justify-center"
        aria-label={a.label}
      >
        <a.Icon className="w-6 h-6 text-foreground" />
      </motion.button>
    ))}
  </motion.div>
</motion.div>
      )}
    </AnimatePresence>
  );
};
