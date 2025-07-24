import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { QuickWeightInput } from "./QuickWeightInput";

interface WeightEntry {
  id: string;
  weight: number;
  body_fat?: number;
  muscle_mass?: number;
  date: string;
  created_at: string;
}

interface WeightProgressCardProps {
  weightHistory: WeightEntry[];
  onWeightAdded: () => void;
}

export const WeightProgressCard = ({ weightHistory, onWeightAdded }: WeightProgressCardProps) => {
  const [showQuickInput, setShowQuickInput] = useState(false);

  // Get last 10 entries for display
  const recentEntries = weightHistory.slice(0, 10);
  const currentWeight = recentEntries[0]?.weight;
  const previousWeight = recentEntries[1]?.weight;
  
  // Calculate trends
  const weightTrend = currentWeight && previousWeight ? currentWeight - previousWeight : 0;
  const avgBodyFat = recentEntries.reduce((sum, entry) => sum + (entry.body_fat || 0), 0) / recentEntries.filter(e => e.body_fat).length || 0;
  const avgMuscle = recentEntries.reduce((sum, entry) => sum + (entry.muscle_mass || 0), 0) / recentEntries.filter(e => e.muscle_mass).length || 0;

  // Prepare chart data
  const chartData = recentEntries.slice().reverse().map(entry => ({
    weight: entry.weight,
    date: new Date(entry.date).getTime()
  }));

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Gewichtsentwicklung</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQuickInput(!showQuickInput)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {showQuickInput && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <QuickWeightInput onWeightAdded={() => {
              onWeightAdded();
              setShowQuickInput(false);
            }} />
          </div>
        )}

        {recentEntries.length > 0 ? (
          <>
            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{currentWeight?.toFixed(1) || '--'}</div>
                <div className="text-sm text-muted-foreground">kg</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getTrendIcon(weightTrend)}
                  <span className="text-xs">{Math.abs(weightTrend).toFixed(1)}kg</span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{avgBodyFat > 0 ? avgBodyFat.toFixed(1) : '--'}</div>
                <div className="text-sm text-muted-foreground">% KFA</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{avgMuscle > 0 ? avgMuscle.toFixed(1) : '--'}</div>
                <div className="text-sm text-muted-foreground">% Muskeln</div>
              </div>
            </div>

            {/* Mini Chart */}
            {chartData.length > 1 && (
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Entries */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Letzte Einträge</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recentEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-sm p-2 rounded bg-muted/30">
                    <span>{new Date(entry.date).toLocaleDateString('de-DE')}</span>
                    <div className="flex gap-4 text-xs">
                      <span>{entry.weight.toFixed(1)}kg</span>
                      {entry.body_fat && <span className="text-blue-600">{entry.body_fat.toFixed(1)}% KFA</span>}
                      {entry.muscle_mass && <span className="text-green-600">{entry.muscle_mass.toFixed(1)}% M</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-sm">Noch keine Gewichtsdaten vorhanden</div>
            <div className="text-xs mt-1">Füge dein erstes Gewicht hinzu</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};