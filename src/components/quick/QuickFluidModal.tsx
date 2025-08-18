import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickFluidInput } from "@/components/fluids/QuickFluidInput";

interface QuickFluidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickFluidModal: React.FC<QuickFluidModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Getränke eintragen</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <QuickFluidInput />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickFluidModal;
