import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickSleepInput } from "@/components/QuickSleepInput";

interface QuickSleepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSleepModal: React.FC<QuickSleepModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schlaf eintragen</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <QuickSleepInput onSleepAdded={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSleepModal;
