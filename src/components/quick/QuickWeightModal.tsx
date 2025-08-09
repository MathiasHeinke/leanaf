import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickWeightInput } from "@/components/QuickWeightInput";

interface QuickWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickWeightModal: React.FC<QuickWeightModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gewicht eintragen</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <QuickWeightInput onWeightAdded={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickWeightModal;
