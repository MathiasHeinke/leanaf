
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Target, Scale } from "lucide-react";
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
    
    if (Math.abs(diff) < 0.1) return { icon: Target, color: 'text-gray-500', text: 'Stabil', bgColor: 'bg-gray-100' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+${diff.toFixed(1)}kg`, bgColor: 'bg-red-50' };
    return { icon: TrendingDown, color: 'text-green-500', text: `${diff.toFixed(1)}kg`, bgColor: 'bg-green-50' };
  };

  const trend = getWeightTrend();

  return (
    <Card className="glass-card hover-scale">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Scale className="h-4 w-4 text-primary" />
          </div>
          <h4 className="font-medium text-foreground">Gewicht eintragen</h4>
        </div>
        
        <div className="flex gap-3">
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
            className="px-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Hinzufügen
          </Button>
        </div>
        
        {/* Trend Badge */}
        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className={`${trend.color} border-current`}>
              <trend.icon className="h-3 w-3 mr-1" />
              {trend.text}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
