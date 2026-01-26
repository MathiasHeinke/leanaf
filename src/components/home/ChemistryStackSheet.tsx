/**
 * ChemistryStackSheet - Supplements & Peptide Quick-Log Overlay
 * Segmented control: Supps (default) | Peptide
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Syringe } from 'lucide-react';
import { SupplementsLogger } from './loggers/SupplementsLogger';
import { PeptideLogger } from './loggers/PeptideLogger';

interface ChemistryStackSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChemistryStackSheet: React.FC<ChemistryStackSheetProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'supplements' | 'peptide'>('supplements');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-4 pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg font-semibold">Chemistry Stack</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="supplements" className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              <span>Supps</span>
            </TabsTrigger>
            <TabsTrigger value="peptide" className="flex items-center gap-2">
              <Syringe className="w-4 h-4" />
              <span>Peptide</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="supplements" className="mt-0">
            <SupplementsLogger onClose={onClose} />
          </TabsContent>

          <TabsContent value="peptide" className="mt-0">
            <PeptideLogger onClose={onClose} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ChemistryStackSheet;
