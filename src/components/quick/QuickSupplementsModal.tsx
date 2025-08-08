import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickSupplementInput } from "@/components/QuickSupplementInput";

interface QuickSupplementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSupplementsModal: React.FC<QuickSupplementsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplemente eintragen</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <QuickSupplementInput />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSupplementsModal;
