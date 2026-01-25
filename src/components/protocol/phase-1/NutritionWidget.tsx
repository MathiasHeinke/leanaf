import { useDailyGoals } from '@/hooks/useDailyGoals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Apple, Beef, Flame, Droplets } from 'lucide-react';

export function NutritionWidget() {
  const { data: goals, loading } = useDailyGoals();
  
  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }
  
  const proteinGoal = goals?.protein ?? 180;
  const calorieGoal = goals?.calories ?? 2200;
  const carbsGoal = goals?.carbs ?? 200;
  const fatsGoal = goals?.fats ?? 70;
  const hydrationGoal = goals?.hydration ?? 2500;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Apple className="w-5 h-5 text-green-500" />
          <CardTitle className="text-lg">Ernährungsziele Phase 1</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Macro Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Protein */}
          <div className="bg-orange-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Beef className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Protein</span>
            </div>
            <span className="text-xl font-bold">{proteinGoal}g</span>
            <p className="text-xs text-muted-foreground">≥2g/kg Körpergewicht</p>
          </div>
          
          {/* Kalorien */}
          <div className="bg-red-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Kalorien</span>
            </div>
            <span className="text-xl font-bold">{calorieGoal}</span>
            <p className="text-xs text-muted-foreground">Moderates Defizit</p>
          </div>
          
          {/* Carbs */}
          <div className="bg-blue-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-500 text-sm">🌾</span>
              <span className="text-sm font-medium">Carbs</span>
            </div>
            <span className="text-xl font-bold">{carbsGoal}g</span>
            <p className="text-xs text-muted-foreground">Training-getimed</p>
          </div>
          
          {/* Fette */}
          <div className="bg-yellow-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-500 text-sm">🥑</span>
              <span className="text-sm font-medium">Fette</span>
            </div>
            <span className="text-xl font-bold">{fatsGoal}g</span>
            <p className="text-xs text-muted-foreground">Hormon-Support</p>
          </div>
        </div>
        
        {/* Hydration */}
        <div className="flex items-center justify-between bg-cyan-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium">Hydration</span>
          </div>
          <span className="font-bold">{(hydrationGoal / 1000).toFixed(1)}L</span>
        </div>
        
        {/* ARES Empfehlung */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>ARES:</strong> Protein-Priorität vor Kalorien. Bei Defizit immer 
            Protein-Ziel erreichen. GLP-1 Agonisten reduzieren Appetit - tracke genau!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
