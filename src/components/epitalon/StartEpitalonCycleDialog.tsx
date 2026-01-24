import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useEpitalonCycles } from "@/hooks/useEpitalonCycles";
import { Syringe, AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";

interface StartEpitalonCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartEpitalonCycleDialog({ open, onOpenChange }: StartEpitalonCycleDialogProps) {
  const { startNewCycle, cycles } = useEpitalonCycles();
  const [duration, setDuration] = useState(10);
  const [isStarting, setIsStarting] = useState(false);

  const cycleNumber = cycles.length + 1;
  const endDate = addDays(new Date(), duration);
  const nextCycleDate = addDays(endDate, 180); // 6 months

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startNewCycle(duration);
      onOpenChange(false);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-purple-500" />
            Epitalon-Zyklus #{cycleNumber} starten
          </DialogTitle>
          <DialogDescription>
            Khavinson-Protokoll: 10mg täglich, subkutan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Zyklus-Dauer</Label>
              <span className="text-lg font-bold text-purple-500">{duration} Tage</span>
            </div>
            <Slider
              value={[duration]}
              onValueChange={(val) => setDuration(val[0])}
              min={10}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10 Tage (Standard)</span>
              <span>20 Tage (Extended)</span>
            </div>
          </div>

          {/* Timeline Preview */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4" />
              Zeitplan
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start</span>
                <span className="font-medium">{format(new Date(), 'dd. MMM yyyy', { locale: de })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ende</span>
                <span className="font-medium">{format(endDate, 'dd. MMM yyyy', { locale: de })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Nächster Zyklus fällig</span>
                <span className="font-medium text-purple-500">
                  {format(nextCycleDate, 'dd. MMMM yyyy', { locale: de })}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Hinweise:</p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• Abends injizieren (Melatonin-Synergie)</li>
                <li>• Nüchtern-Injektion nicht erforderlich</li>
                <li>• Injektionsorte rotieren (Bauch, Oberschenkel, Schulter)</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starte...
              </>
            ) : (
              <>
                <Syringe className="w-4 h-4 mr-2" />
                {duration}-Tage-Zyklus starten
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
