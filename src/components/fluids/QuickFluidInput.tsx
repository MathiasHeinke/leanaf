import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFluidsToday } from '@/hooks/useFluidsToday';
import { useFluidTargets } from '@/hooks/useFluidTargets';
import { quickAddFluid } from '@/services/fluids';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuickFluidInputProps {
  weightKg?: number;
}

export function QuickFluidInput({ weightKg }: QuickFluidInputProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const { totalMl, waterEqMl, loading: fluidsLoading } = useFluidsToday(user?.id);
  const { goalMl, recommendedMl, loading: goalsLoading, setGoalMl, source } =
    useFluidTargets(user?.id, weightKg);

  const add = async (ml: number, opts?: { category?: string; alcohol_percent?: number }) => {
    if (!user?.id || pending) return;
    setPending(true);
    try { 
      await quickAddFluid(user.id, ml, opts); 
      toast.success(`${ml}ml hinzugefügt`);
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    } finally { 
      setPending(false); 
    }
  };

  const goalL = (goalMl / 1000).toFixed(1);
  const doneL = (waterEqMl / 1000).toFixed(1);
  const pct = Math.min(100, Math.round((waterEqMl / Math.max(goalMl, 1)) * 100));

  if (fluidsLoading || goalsLoading) {
    return <div className="rounded-xl border p-3">Lädt...</div>;
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">
          Flüssigkeit: <span className="tabular-nums">{doneL} / {goalL} L</span>
          {source === 'fallback' && (
            <span className="ml-2 text-xs text-muted-foreground">
              (Empfehlung: {(recommendedMl/1000).toFixed(1)} L)
            </span>
          )}
        </div>
        <div className="text-xs">{pct}%</div>
      </div>

      {/* Smart Chips */}
      <div className="mb-2 flex flex-wrap gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(250)} 
          disabled={pending}
        >
          250 ml
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(500)} 
          disabled={pending}
        >
          500 ml
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(750)} 
          disabled={pending}
        >
          750 ml
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(330, { category: 'soda' })} 
          disabled={pending}
        >
          330 ml Softdrink
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => add(500, { category: 'beer', alcohol_percent: 5 })} 
          disabled={pending}
        >
          500 ml Bier
        </Button>
      </div>

      {/* Ziel setzen */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={1000} 
          step={100}
          defaultValue={goalMl}
          className="w-28"
          onBlur={(e) => {
            const v = Math.max(500, Math.min(8000, Number(e.currentTarget.value || 0)));
            if (v !== goalMl) setGoalMl(v);
          }}
        />
        <span className="text-xs text-muted-foreground">ml / Tag</span>
        {source === 'fallback' && (
          <Button 
            type="button" 
            variant="link" 
            size="sm"
            onClick={() => setGoalMl(recommendedMl)}
          >
            Empfehlung übernehmen
          </Button>
        )}
      </div>
    </div>
  );
}