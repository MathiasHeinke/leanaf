import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTodayFluids } from '@/hooks/useTodayFluids';
import { useAddFluid } from '@/hooks/useAddFluid';
import { useFrequentFluids } from '@/hooks/useFrequentFluids';
import { useFluidTargets } from '@/hooks/useFluidTargets';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface QuickFluidInputProps {
  weightKg?: number;
  currentDate?: Date;
}

export function QuickFluidInput({ weightKg, currentDate }: QuickFluidInputProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  
  const { hydrationMl, goalMl, percent, loading } = useTodayFluids(user?.id, currentDate);
  const { frequent, loading: frequentLoading } = useFrequentFluids(user?.id);
  const { goalMl: targetGoalMl, setGoalMl } = useFluidTargets(user?.id, weightKg, currentDate);
  const addFluid = useAddFluid(user?.id);

  const add = async (ml: number, opts?: { name?: string; is_water?: boolean; has_alcohol?: boolean }) => {
    if (!user?.id || pending) return;
    setPending(true);
    try { 
      await addFluid(ml, opts);
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    } finally { 
      setPending(false); 
    }
  };

  const handleCustomAdd = async () => {
    const amount = parseInt(customAmount);
    if (amount > 0) {
      await add(amount, { name: `${amount}ml Getränk`, is_water: false });
      setCustomAmount('');
    }
  };

  // Use fluid targets goal, fallback to calculated goal
  const displayGoalMl = targetGoalMl || goalMl;
  const goalL = (displayGoalMl / 1000).toFixed(1);
  const doneL = (hydrationMl / 1000).toFixed(1);

  // Filter out alcohol from frequent fluids (user is alcohol-free)
  const alcoholFreeFrequent = frequent.drinks.filter(drink => 
    !drink.toLowerCase().includes('bier') && 
    !drink.toLowerCase().includes('wein') && 
    !drink.toLowerCase().includes('alkohol') &&
    !drink.toLowerCase().includes('schnaps') &&
    !drink.toLowerCase().includes('whisky') &&
    !drink.toLowerCase().includes('vodka')
  );

  if (loading) {
    return <div className="rounded-xl border p-3">Lädt...</div>;
  }

  return (
    <div className="rounded-xl border p-3 space-y-4">
      {/* Progress Display */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Flüssigkeit: <span className="tabular-nums text-primary">{doneL} / {goalL} L</span>
        </div>
        <div className="text-xs font-medium text-muted-foreground">{percent}%</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300" 
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* Personalized Smart Chips (Alcohol-Free) */}
      {!frequentLoading && alcoholFreeFrequent.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Deine häufigen Getränke:</div>
          <div className="flex flex-wrap gap-2">
            {alcoholFreeFrequent.slice(0, 3).map((drink, index) => {
              const amount = frequent.amounts[index] || 250;
              return (
                <Button 
                  key={drink}
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => add(amount, { 
                    name: `${amount}ml ${drink}`,
                    is_water: drink.toLowerCase().includes('wasser'),
                    has_alcohol: false 
                  })} 
                  disabled={pending}
                  className="text-xs"
                >
                  {amount}ml {drink}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Water Options */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Schnelle Wasser-Optionen:</div>
        <div className="flex flex-wrap gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => add(250, { name: "250ml Wasser", is_water: true })} 
            disabled={pending}
            className="text-xs"
          >
            250ml Wasser
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => add(500, { name: "500ml Wasser", is_water: true })} 
            disabled={pending}
            className="text-xs"
          >
            500ml Wasser
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => add(750, { name: "750ml Wasser", is_water: true })} 
            disabled={pending}
            className="text-xs"
          >
            750ml Wasser
          </Button>
        </div>
      </div>

      {/* Custom Amount Input */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="ml eingeben"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="flex-1 text-sm"
          min="1"
          max="2000"
        />
        <Button 
          onClick={handleCustomAdd}
          disabled={!customAmount || pending}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Goal Display & Achievement */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tagesziel: {goalL}L</span>
        {percent >= 100 && (
          <span className="text-green-600 font-medium">🎉 Ziel erreicht!</span>
        )}
        {percent >= 200 && (
          <span className="text-blue-600 font-medium">💪 Alkoholfrei seit 200+ Tagen!</span>
        )}
      </div>
    </div>
  );
}