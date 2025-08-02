import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Utensils } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardMealProps {
  payload: {
    food_name: string;
    amount?: number;
    unit?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    meal_type?: string;
    actions?: Array<{
      type: string;
      label: string;
      data: any;
    }>;
  };
}

export const CardMeal = ({ payload }: CardMealProps) => {
  const { toast } = useToast();

  const handleSaveMeal = async () => {
    try {
      const action = payload.actions?.find(a => a.type === 'save_meal');
      if (!action) return;

      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          date: action.data.date,
          meal_type: payload.meal_type || 'snack',
          text: `${action.data.amount || ''} ${action.data.unit || ''} ${action.data.food_name}`.trim(),
          calories: action.data.calories || 0,
          protein: action.data.protein || 0,
          carbs: action.data.carbs || 0,
          fats: action.data.fats || 0
        });

      if (error) throw error;

      toast({
        title: "Mahlzeit gespeichert",
        description: "Deine Mahlzeit wurde erfolgreich protokolliert 🍽️"
      });
    } catch (error) {
      console.error('Error saving meal:', error);
      toast({
        title: "Fehler",
        description: "Mahlzeit konnte nicht gespeichert werden",
        variant: "destructive"
      });
    }
  };

  const totalMacros = (payload.protein || 0) + (payload.carbs || 0) + (payload.fats || 0);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Utensils className="h-4 w-4" />
          Mahlzeit erfasst
          <Badge variant="secondary">
            {payload.amount} {payload.unit} {payload.food_name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {payload.calories && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Kalorien</span>
            <span className="text-lg font-bold">{payload.calories} kcal</span>
          </div>
        )}

        {totalMacros > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Makronährstoffe</div>
            
            {payload.protein && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Protein</span>
                  <span>{payload.protein}g</span>
                </div>
                <Progress 
                  value={(payload.protein / totalMacros) * 100} 
                  className="h-1"
                />
              </div>
            )}
            
            {payload.carbs && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Kohlenhydrate</span>
                  <span>{payload.carbs}g</span>
                </div>
                <Progress 
                  value={(payload.carbs / totalMacros) * 100} 
                  className="h-1"
                />
              </div>
            )}
            
            {payload.fats && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Fette</span>
                  <span>{payload.fats}g</span>
                </div>
                <Progress 
                  value={(payload.fats / totalMacros) * 100} 
                  className="h-1"
                />
              </div>
            )}
          </div>
        )}

        {payload.actions && (
          <div className="flex gap-2 pt-2">
            {payload.actions.map((action, index) => (
              <Button
                key={index}
                onClick={handleSaveMeal}
                size="sm"
                className="flex-1"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};