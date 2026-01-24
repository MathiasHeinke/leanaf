import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Brain, Check, Wind, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { NootropicStack } from "@/hooks/useNootropicStacks";

interface NootropicIntakeLoggerProps {
  stack: NootropicStack;
  onLogged: () => void;
}

export function NootropicIntakeLogger({ stack, onLogged }: NootropicIntakeLoggerProps) {
  const [focusScore, setFocusScore] = useState(stack.current_focus_score || 5);
  const [isLogging, setIsLogging] = useState(false);
  const { toast } = useToast();

  const handleLog = async () => {
    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht eingeloggt");

      // Log intake to peptide_intake_log
      const { error: logError } = await supabase.from('peptide_intake_log').insert({
        user_id: user.id,
        protocol_id: stack.id,
        peptide_name: stack.substance_name,
        dose_mcg: stack.dose_mcg,
        dose_unit: 'mcg',
        timing: stack.timing,
        notes: `Focus Score: ${focusScore}/10`,
        taken_at: new Date().toISOString(),
        skipped: false,
      });

      if (logError) throw logError;

      // Update focus score on stack
      const updateData: Record<string, any> = {
        current_focus_score: focusScore,
        updated_at: new Date().toISOString(),
      };

      if (stack.baseline_focus_score === null) {
        updateData.baseline_focus_score = focusScore;
      }

      await (supabase as any)
        .from('nootropic_stacks')
        .update(updateData)
        .eq('id', stack.id);

      toast({
        title: "Dosis geloggt ✓",
        description: `${stack.dose_mcg}mcg ${stack.substance_name} - Focus: ${focusScore}/10`,
      });

      onLogged();
    } catch (err) {
      toast({
        title: "Fehler",
        description: err instanceof Error ? err.message : "Log fehlgeschlagen",
        variant: "destructive",
      });
    } finally {
      setIsLogging(false);
    }
  };

  if (!stack.is_on_cycle) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">Aktuell in Pause-Phase</p>
          <p className="text-sm text-muted-foreground">
            Keine Einnahme während der 2-Wochen-Pause
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Einnahme loggen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dosis-Anzeige */}
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <div className="text-3xl font-bold">{stack.dose_mcg}mcg</div>
          <div className="text-sm text-muted-foreground capitalize">
            {stack.substance_name} {stack.administration_route}
          </div>
        </div>

        {/* Nasale Applikation Anleitung */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Wind className="w-4 h-4" />
            Nasale Applikation
          </Label>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Nase sanft schnäuzen</li>
            <li>Kopf leicht nach hinten neigen</li>
            <li>1-2 Sprühstöße pro Nasenloch</li>
            <li>Leicht schnüffeln (nicht stark einatmen)</li>
          </ol>
        </div>

        {/* Focus Score */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Aktueller Focus-Score</Label>
            <span className="text-lg font-bold">{focusScore}/10</span>
          </div>
          <Slider
            value={[focusScore]}
            onValueChange={([val]) => setFocusScore(val)}
            min={1}
            max={10}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>😴 Niedrig</span>
            <span>🧠 Optimal</span>
            <span>⚡ Peak</span>
          </div>
        </div>

        {/* Log Button */}
        <Button
          className="w-full"
          onClick={handleLog}
          disabled={isLogging}
        >
          {isLogging ? "Speichere..." : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Einnahme bestätigen
            </>
          )}
        </Button>

        {/* Timing Hinweis */}
        <p className="text-xs text-muted-foreground text-center">
          💡 Beste Wirkung: {stack.timing === 'morning' ? 'Morgens nach dem Aufwachen' : 
                            stack.timing === 'pre_work' ? '30 Min vor Arbeitsstart' :
                            stack.timing === 'split_am_pm' ? 'Morgens + Nachmittags' : stack.timing}
        </p>
      </CardContent>
    </Card>
  );
}
