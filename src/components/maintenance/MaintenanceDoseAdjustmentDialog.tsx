import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { MaintenanceProtocol } from "@/hooks/useMaintenanceProtocols";

interface MaintenanceDoseAdjustmentDialogProps {
  protocol: MaintenanceProtocol;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newDose: number, reason: string) => Promise<void>;
}

const ADJUSTMENT_REASONS = [
  { id: 'optimization', label: 'Optimierung', description: 'Basierend auf Blutwerten/Feedback' },
  { id: 'side_effects', label: 'Nebenwirkungen', description: 'Reduktion wegen Unverträglichkeit' },
  { id: 'tolerance', label: 'Toleranzentwicklung', description: 'Wirkung lässt nach' },
  { id: 'budget', label: 'Kostengründe', description: 'Wirtschaftlichere Dosierung' },
  { id: 'phase_transition', label: 'Phasenwechsel', description: 'Anpassung für neue Phase' },
  { id: 'doctor_recommendation', label: 'Ärztliche Empfehlung', description: 'Nach Rücksprache mit Arzt' },
  { id: 'other', label: 'Andere', description: 'Eigene Begründung' },
];

export function MaintenanceDoseAdjustmentDialog({
  protocol,
  open,
  onOpenChange,
  onConfirm,
}: MaintenanceDoseAdjustmentDialogProps) {
  const [newDose, setNewDose] = useState(protocol.dose_amount);
  const [selectedReason, setSelectedReason] = useState('optimization');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const percentChange = protocol.dose_amount > 0
    ? Math.round(((newDose - protocol.dose_amount) / protocol.dose_amount) * 100)
    : 0;

  const isSignificantChange = Math.abs(percentChange) > 50;

  const handleConfirm = async () => {
    const reason = selectedReason === 'other'
      ? customReason
      : ADJUSTMENT_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;

    setIsSubmitting(true);
    try {
      await onConfirm(newDose, reason);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dosis anpassen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vorher/Nachher Vergleich */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Aktuell</p>
              <p className="text-2xl font-bold">
                {protocol.dose_amount}{protocol.dose_unit}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Neu</p>
              <p className="text-2xl font-bold text-primary">
                {newDose}{protocol.dose_unit}
              </p>
            </div>
          </div>

          {percentChange !== 0 && (
            <div className="text-center">
              <span className={`text-sm font-medium ${percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {percentChange > 0 ? '+' : ''}{percentChange}%
              </span>
            </div>
          )}

          {/* Neue Dosis */}
          <div className="space-y-2">
            <Label>Neue Dosis</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newDose}
                onChange={(e) => setNewDose(parseFloat(e.target.value) || 0)}
                className="w-32"
                step={protocol.dose_unit === 'g' ? 0.1 : 1}
              />
              <span className="text-sm text-muted-foreground">
                {protocol.dose_unit}
              </span>
            </div>
          </div>

          {/* Warnung bei signifikanter Änderung */}
          {isSignificantChange && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Änderung über 50%! Bitte mit Vorsicht und ggf. nach Rücksprache mit Arzt.
              </AlertDescription>
            </Alert>
          )}

          {/* Begründung */}
          <div className="space-y-2">
            <Label>Begründung</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    <div className="flex flex-col">
                      <span>{reason.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {reason.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label>Eigene Begründung</Label>
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Beschreibe den Grund für die Anpassung..."
                rows={2}
              />
            </div>
          )}

          {/* Bisherige Anpassungen */}
          {protocol.dose_adjustments.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Bisherige Anpassungen ({protocol.dose_adjustments.length}):
              </p>
              <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                {protocol.dose_adjustments.slice(-3).map((adj, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span>{new Date(adj.date).toLocaleDateString('de-DE')}</span>
                    <span>{adj.old_dose} → {adj.new_dose}</span>
                    <span className="text-muted-foreground truncate">{adj.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={newDose === protocol.dose_amount || isSubmitting || (selectedReason === 'other' && !customReason)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Speichere...
              </>
            ) : (
              "Anpassung speichern"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
