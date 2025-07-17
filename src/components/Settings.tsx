import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Target, Save } from "lucide-react";

interface SettingsProps {
  dailyGoal: number;
  onGoalChange: (goal: number) => void;
  onClose: () => void;
}

const Settings = ({ dailyGoal, onGoalChange, onClose }: SettingsProps) => {
  const [goal, setGoal] = useState(dailyGoal.toString());
  const { toast } = useToast();

  const handleSave = () => {
    const newGoal = parseInt(goal);
    if (newGoal < 800 || newGoal > 5000) {
      toast({
        title: "Ungültiges Ziel",
        description: "Das Kalorienziel sollte zwischen 800 und 5000 kcal liegen.",
        variant: "destructive"
      });
      return;
    }
    
    onGoalChange(newGoal);
    toast({
      title: "Ziel gespeichert! 🎯",
      description: `Neues Tagesziel: ${newGoal} kcal`
    });
    onClose();
  };

  return (
    <Card className="p-6 shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-primary to-primary-glow p-2 rounded-lg">
            <SettingsIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold">Einstellungen</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Schließen
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="daily-goal" className="text-base font-medium">
            Tägliches Kalorienziel
          </Label>
          <div className="flex items-center gap-3 mt-2">
            <Target className="h-5 w-5 text-primary" />
            <Input
              id="daily-goal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              min="800"
              max="5000"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">kcal</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Empfohlen: 1200-2500 kcal je nach Geschlecht und Aktivität
          </p>
        </div>

        <div className="pt-4 border-t">
          <Button variant="hero" onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Ziel speichern
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Settings;