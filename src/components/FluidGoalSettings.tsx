import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Droplets, Calculator, User } from 'lucide-react';
import { useFluidGoalCalculation } from '@/hooks/useFluidGoalCalculation';
import { toast } from 'sonner';

export const FluidGoalSettings: React.FC = () => {
  const { data: fluidGoal, loading, updateFluidGoal } = useFluidGoalCalculation();
  const [customGoal, setCustomGoal] = useState(fluidGoal?.goalMl?.toString() || '2500');
  const [useAutoCalculation, setUseAutoCalculation] = useState(fluidGoal?.isAutoCalculated || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const goalValue = parseInt(customGoal);
    if (isNaN(goalValue) || goalValue < 1000 || goalValue > 5000) {
      toast.error('Bitte geben Sie einen Wert zwischen 1000ml und 5000ml ein');
      return;
    }

    setSaving(true);
    try {
      const success = await updateFluidGoal(goalValue, useAutoCalculation);
      if (success) {
        toast.success('Flüssigkeitsziel erfolgreich gespeichert');
      } else {
        toast.error('Fehler beim Speichern des Ziels');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern des Ziels');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Flüssigkeitsziel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Lädt...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Flüssigkeitsziel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <div className="font-medium">Aktuelles Ziel</div>
            <div className="text-sm text-muted-foreground">
              {fluidGoal?.goalMl}ml täglich
            </div>
          </div>
          <Badge variant={fluidGoal?.isAutoCalculated ? "default" : "secondary"}>
            {fluidGoal?.isAutoCalculated ? (
              <>
                <Calculator className="h-3 w-3 mr-1" />
                Auto
              </>
            ) : (
              <>
                <User className="h-3 w-3 mr-1" />
                Manuell
              </>
            )}
          </Badge>
        </div>

        {/* Weight-based Recommendation */}
        {fluidGoal?.userWeight && (
          <div className="p-3 border rounded-lg">
            <div className="text-sm font-medium mb-1">Empfehlung basierend auf Körpergewicht</div>
            <div className="text-sm text-muted-foreground mb-2">
              {fluidGoal.userWeight}kg × 35ml = {fluidGoal.recommendedMl}ml
            </div>
            <div className="text-xs text-muted-foreground">
              Diese Empfehlung basiert auf der Formel: 35ml pro Kilogramm Körpergewicht
            </div>
          </div>
        )}

        {/* Auto Calculation Toggle */}
        {fluidGoal?.userWeight && (
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-calc">Automatische Berechnung</Label>
              <div className="text-sm text-muted-foreground">
                Ziel automatisch basierend auf Körpergewicht berechnen
              </div>
            </div>
            <Switch
              id="auto-calc"
              checked={useAutoCalculation}
              onCheckedChange={(checked) => {
                setUseAutoCalculation(checked);
                if (checked && fluidGoal?.recommendedMl) {
                  setCustomGoal(fluidGoal.recommendedMl.toString());
                }
              }}
            />
          </div>
        )}

        {/* Manual Goal Input */}
        <div className="space-y-2">
          <Label htmlFor="fluid-goal">
            {useAutoCalculation ? 'Automatisch berechnetes Ziel' : 'Manuelles Ziel (ml)'}
          </Label>
          <Input
            id="fluid-goal"
            type="number"
            min="1000"
            max="5000"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            disabled={useAutoCalculation}
            placeholder="z.B. 2500"
          />
          <div className="text-xs text-muted-foreground">
            Empfohlener Bereich: 1000ml - 5000ml
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving || (useAutoCalculation && fluidGoal?.isAutoCalculated)}
          className="w-full"
        >
          {saving ? 'Speichert...' : 'Ziel speichern'}
        </Button>
      </CardContent>
    </Card>
  );
};