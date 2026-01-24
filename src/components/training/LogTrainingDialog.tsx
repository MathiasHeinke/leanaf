import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dumbbell, Heart, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { TrainingType } from "@/types/training";

interface LogTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TRAINING_OPTIONS = [
  {
    value: 'rpt' as TrainingType,
    label: 'RPT Krafttraining',
    description: 'Reverse Pyramid Training',
    icon: Dumbbell,
    iconColor: 'text-orange-500',
  },
  {
    value: 'zone2' as TrainingType,
    label: 'Zone 2 Cardio',
    description: 'Lockere Ausdauer',
    icon: Heart,
    iconColor: 'text-red-500',
  },
  {
    value: 'vo2max' as TrainingType,
    label: 'VO2max HIIT',
    description: 'Intensive Intervalle',
    icon: Zap,
    iconColor: 'text-yellow-500',
  },
];

export function LogTrainingDialog({ open, onOpenChange, onSuccess }: LogTrainingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<TrainingType>('rpt');
  const [duration, setDuration] = useState(45);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Use correct field names from schema
      const { error } = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          session_date: date,
          training_type: type,
          total_duration_minutes: type === 'zone2' ? duration : null,
          // Store vo2max protocol in session_data JSONB
          session_data: type === 'vo2max' ? { protocol: '4x4' } : {},
        });

      if (error) throw error;

      toast.success("Training eingetragen", {
        description: `${type.toUpperCase()} Session wurde gespeichert`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setType('rpt');
      setDuration(45);
      setDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Training eintragen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Datum</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Training Type */}
          <div className="space-y-2">
            <Label>Art des Trainings</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as TrainingType)}
              className="space-y-2"
            >
              {TRAINING_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="flex items-center">
                    <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                    <Label
                      htmlFor={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer w-full transition-colors ${
                        type === option.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${option.iconColor}`} />
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Duration (only for Zone 2) */}
          {type === 'zone2' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Dauer (Minuten)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                min={1}
                max={300}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Speichere..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
