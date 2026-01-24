import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MitochondrialIntakeLoggerProps {
  protocolId: string;
  substanceName: string;
  doseAmount: number;
  doseUnit: string;
  onLogged: () => void;
}

const TRAINING_CONTEXT = [
  { id: 'pre_zone2', label: 'Vor Zone 2 Cardio', icon: '🚴' },
  { id: 'pre_vo2max', label: 'Vor VO2max/HIIT', icon: '🏃' },
  { id: 'pre_strength', label: 'Vor Krafttraining', icon: '🏋️' },
  { id: 'rest_day', label: 'Ruhetag', icon: '😴' },
  { id: 'other', label: 'Anderer Kontext', icon: '📝' },
];

export function MitochondrialIntakeLogger({
  protocolId,
  substanceName,
  doseAmount,
  doseUnit,
  onLogged,
}: MitochondrialIntakeLoggerProps) {
  const [trainingContext, setTrainingContext] = useState('pre_zone2');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Map to peptide_intake_log schema
      const { error } = await supabase
        .from('peptide_intake_log')
        .insert({
          user_id: user.id,
          protocol_id: protocolId,
          peptide_name: substanceName,
          dose_mcg: doseUnit === 'mcg' ? doseAmount : doseAmount * 1000, // Convert mg to mcg
          dose_unit: doseUnit,
          timing: trainingContext,
          notes: notes || null,
          taken_at: new Date().toISOString(),
          skipped: false,
        });

      if (error) throw error;

      toast.success("Dosis geloggt ✓", {
        description: `${doseAmount}${doseUnit} ${substanceName}`
      });

      setNotes('');
      onLogged();
    } catch (err) {
      toast.error("Fehler", {
        description: err instanceof Error ? err.message : "Log fehlgeschlagen"
      });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Dosis loggen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosis-Anzeige */}
        <div className="text-center py-3 bg-primary/10 rounded-lg">
          <p className="text-2xl font-bold text-primary">{doseAmount}{doseUnit}</p>
          <p className="text-sm text-muted-foreground">{substanceName}</p>
        </div>

        {/* Training-Kontext */}
        <div className="space-y-2">
          <Label>Training-Kontext</Label>
          <Select value={trainingContext} onValueChange={setTrainingContext}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_CONTEXT.map((ctx) => (
                <SelectItem key={ctx.id} value={ctx.id}>
                  <span className="flex items-center gap-2">
                    <span>{ctx.icon}</span>
                    <span>{ctx.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notizen (optional) */}
        <div className="space-y-2">
          <Label>Notizen (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. Gefühle, Energie-Level, Nebenwirkungen..."
            rows={2}
          />
        </div>

        {/* Log Button */}
        <Button
          className="w-full"
          onClick={handleLog}
          disabled={isLogging}
        >
          {isLogging ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Speichere...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Dosis genommen
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
