/**
 * BodyStackSheet - Weight & Measurements Quick-Log Overlay
 * Segmented control: Waage (default) | Maßband
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Ruler } from 'lucide-react';
import { WeightLogger } from './loggers/WeightLogger';
import { TapeLogger } from './loggers/TapeLogger';

interface BodyStackSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BodyStackSheet: React.FC<BodyStackSheetProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'weight' | 'tape'>('weight');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-4 pb-8">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-lg font-semibold">Body Stack</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="weight" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span>Waage</span>
            </TabsTrigger>
            <TabsTrigger value="tape" className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              <span>Maßband</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weight" className="mt-0">
            <WeightLogger onClose={onClose} />
          </TabsContent>

          <TabsContent value="tape" className="mt-0">
            <TapeLogger onClose={onClose} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default BodyStackSheet;
