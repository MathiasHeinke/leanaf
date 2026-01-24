import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Leaf, AlertTriangle } from 'lucide-react';
import { useSenolytCycles } from '@/hooks/useSenolytCycles';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface StartSenolytCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartSenolytCycleDialog({ open, onOpenChange }: StartSenolytCycleDialogProps) {
  const { startCycle, calculateFisetinDose, cycles } = useSenolytCycles();
  
  const [senolyticType, setSenolyticType] = useState<'fisetin' | 'quercetin_dasatinib'>('fisetin');
  const [durationDays, setDurationDays] = useState(2);
  const [weightKg, setWeightKg] = useState(75);
  const [fastingDuringCycle, setFastingDuringCycle] = useState(true);
  const [quercetinPreload, setQuercetinPreload] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const cycleNumber = cycles.length > 0 ? (cycles[0]?.cycle_number || 0) + 1 : 1;
  const endDate = addDays(new Date(), durationDays - 1);
  const nextCycleDate = addDays(endDate, 30);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startCycle({
        senolytic_type: senolyticType,
        duration_days: durationDays,
        user_weight_kg: senolyticType === 'fisetin' ? weightKg : undefined,
        fasting_during_cycle: fastingDuringCycle,
        quercetin_preload: quercetinPreload,
      });
      onOpenChange(false);
    } finally {
      setIsStarting(false);
    }
  };

  const calculatedDose = calculateFisetinDose(weightKg);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-500" />
            <DialogTitle>Senolytischen Zyklus starten</DialogTitle>
          </div>
          <DialogDescription>
            Hit-and-Run Protokoll zur Eliminierung seneszenter Zellen.
            Zyklus #{cycleNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Senolytic Type Selection */}
          <div className="space-y-3">
            <Label>Senolytikum wählen</Label>
            <RadioGroup 
              value={senolyticType} 
              onValueChange={(v) => setSenolyticType(v as 'fisetin' | 'quercetin_dasatinib')}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="fisetin" id="fisetin" />
                <Label htmlFor="fisetin" className="flex-1 cursor-pointer">
                  <div className="font-medium">Fisetin (Mayo-Protokoll)</div>
                  <div className="text-xs text-muted-foreground">
                    20mg/kg Körpergewicht, 2-3 Tage
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="quercetin_dasatinib" id="qd" />
                <Label htmlFor="qd" className="flex-1 cursor-pointer">
                  <div className="font-medium">Quercetin + Dasatinib</div>
                  <div className="text-xs text-muted-foreground">
                    Q: 1000mg + D: 100mg, 2 Tage (stärker, verschreibungspflichtig)
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Weight Input (for Fisetin) */}
          {senolyticType === 'fisetin' && (
            <div className="space-y-3">
              <Label>Körpergewicht (kg)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-24"
                />
                <div className="flex-1 p-2 rounded bg-green-500/10 text-sm">
                  <span className="text-muted-foreground">Berechnete Dosis: </span>
                  <span className="font-medium">{calculatedDose}mg</span>
                </div>
              </div>
            </div>
          )}

          {/* Duration Slider */}
          <div className="space-y-3">
            <Label>Zyklusdauer: {durationDays} Tage</Label>
            <Slider
              value={[durationDays]}
              onValueChange={(v) => setDurationDays(v[0])}
              min={2}
              max={3}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Mayo-Protokoll empfiehlt 2-3 konsekutive Tage
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Nüchtern einnehmen</Label>
                <p className="text-xs text-muted-foreground">Verstärkt senolytische Wirkung</p>
              </div>
              <Switch
                checked={fastingDuringCycle}
                onCheckedChange={setFastingDuringCycle}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Quercetin-Preload (24h vorher)</Label>
                <p className="text-xs text-muted-foreground">Optional, für Fisetin empfohlen</p>
              </div>
              <Switch
                checked={quercetinPreload}
                onCheckedChange={setQuercetinPreload}
              />
            </div>
          </div>

          {/* Timeline Preview */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span>{format(new Date(), 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ende</span>
              <span>{format(endDate, 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nächster Zyklus</span>
              <span>{format(nextCycleDate, 'dd. MMMM yyyy', { locale: de })}</span>
            </div>
          </div>

          {/* Warnings */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm space-y-1">
            <div className="flex items-center gap-2 font-medium text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              Wichtige Hinweise
            </div>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              <li>Nicht öfter als 1x pro Monat durchführen</li>
              <li>2-3 Tage Ruhe nach dem Zyklus einplanen</li>
              <li>Leichte Müdigkeit ist normal (Zellen sterben ab)</li>
              {senolyticType === 'quercetin_dasatinib' && (
                <li className="text-amber-600">Dasatinib ist verschreibungspflichtig!</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleStart} disabled={isStarting}>
            {isStarting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Zyklus starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
