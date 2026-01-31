import { Skull } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PHASE0_INTRO } from './lifeImpactData';

interface ViaNegativaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViaNegativaSheet({ open, onOpenChange }: ViaNegativaSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl">
        <SheetHeader className="text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <Skull className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <SheetTitle className="text-lg">{PHASE0_INTRO.title}</SheetTitle>
              <SheetDescription>{PHASE0_INTRO.subtitle}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Multiplier Formula */}
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 font-mono text-sm">
            <span className="text-destructive font-semibold">{PHASE0_INTRO.formula}</span>
          </div>
          
          {/* Main Quote */}
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm font-medium leading-relaxed">
              {PHASE0_INTRO.mainQuote}
            </p>
          </div>
          
          {/* Warning Quote */}
          <div className="p-4 rounded-lg border-l-4 border-amber-500/50 bg-amber-500/5">
            <p className="text-sm text-muted-foreground italic">
              "{PHASE0_INTRO.warningQuote}"
            </p>
          </div>
          
          {/* Key Principles */}
          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold">Das Prinzip:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">1.</span>
                <span>Zuerst alle Toxine und negativen Einflüsse eliminieren</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">2.</span>
                <span>Dann die Basis stabilisieren (Schlaf, Ernährung, Bewegung)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive font-bold">3.</span>
                <span>Erst danach wirken Interventionen mit vollem Potenzial</span>
              </li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
