import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTodayFluids } from '@/hooks/useTodayFluids';
import { useAddFluid } from '@/hooks/useAddFluid';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuickFluidInputProps {
  weightKg?: number;
  currentDate?: Date;
}

export function QuickFluidInput({ weightKg, currentDate }: QuickFluidInputProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const { hydrationMl, goalMl, percent, loading } = useTodayFluids(user?.id, currentDate);
  const addFluid = useAddFluid(user?.id);

  const add = async (ml: number, opts?: { category?: string; alcohol_percent?: number; name?: string }) => {
    if (!user?.id || pending) return;
    setPending(true);
    try { 
      await addFluid(ml, { 
        name: opts?.name,
        has_alcohol: opts?.alcohol_percent ? true : false
      });
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    } finally { 
      setPending(false); 
    }
  };

  const goalL = (goalMl / 1000).toFixed(1);
  const doneL = (hydrationMl / 1000).toFixed(1);

  if (loading) {
    return <div className="rounded-xl border p-3">Lädt...</div>;
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">
          Flüssigkeit: <span className="tabular-nums">{doneL} / {goalL} L</span>
        </div>
        <div className="text-xs">{percent}%</div>
      </div>

      {/* Smart Chips */}
      <div className="mb-2 flex flex-wrap gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(250, { name: "250ml Wasser" })} 
          disabled={pending}
        >
          250 ml
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(500, { name: "500ml Wasser" })} 
          disabled={pending}
        >
          500 ml
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(750, { name: "750ml Wasser" })} 
          disabled={pending}
        >
          750 ml
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(330, { name: "330ml Softdrink" })} 
          disabled={pending}
        >
          330 ml Softdrink
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(500, { name: "500ml Bier", alcohol_percent: 5 })} 
          disabled={pending}
        >
          500 ml Bier
        </Button>
      </div>

      {/* Ziel setzen - simplified for now */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Ziel: {goalL}L täglich
        </span>
      </div>
    </div>
  );
}