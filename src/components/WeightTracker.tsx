import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

interface WeightTrackerProps {
  weightHistory: WeightEntry[];
  onWeightAdded: () => void;
}

export const WeightTracker = ({ weightHistory, onWeightAdded }: WeightTrackerProps) => {
  const [newWeight, setNewWeight] = useState('');
  const { user } = useAuth();

  const handleAddWeight = async () => {
    if (!user || !newWeight) return;

    try {
      const { error } = await supabase
        .from('weight_history')
        .insert({
          user_id: user.id,
          weight: parseFloat(newWeight),
          date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      // Update current weight in profile
      await supabase
        .from('profiles')
        .update({ weight: parseFloat(newWeight) })
        .eq('user_id', user.id);

      setNewWeight('');
      toast.success('Gewicht erfolgreich hinzugefügt!');
      onWeightAdded();
    } catch (error: any) {
      console.error('Error adding weight:', error);
      toast.error('Fehler beim Hinzufügen des Gewichts');
    }
  };

  const getWeightTrend = () => {
    if (weightHistory.length < 2) return null;
    const latest = weightHistory[0].weight;
    const previous = weightHistory[1].weight;
    const diff = latest - previous;
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg` };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg` };
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Aktuelles Gewicht</h3>
      <div className="flex gap-2">
        <Input
          type="number"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddWeight();
            }
          }}
          placeholder="z.B. 72.5"
          className="flex-1"
          step="0.1"
        />
        <Button 
          onClick={handleAddWeight} 
          disabled={!newWeight}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Eintragen
        </Button>
      </div>
      
      {(() => {
        const trend = getWeightTrend();
        if (!trend) return null;
        const IconComponent = trend.icon;
        return (
          <div className={`flex items-center gap-1 ${trend.color} text-sm`}>
            <IconComponent className="h-4 w-4" />
            <span>{trend.text}</span>
          </div>
        );
      })()}
    </div>
  );
};