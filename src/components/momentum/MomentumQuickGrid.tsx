import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Moon, Scale, Utensils, Dumbbell, Pill, Plus } from "lucide-react";
import { openMeal, openSleep, openSupplements, openWorkout } from "@/components/quick/quickAddBus";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuickWeightModal } from "@/components/quick/QuickWeightModal";
import { quickAddBus } from "@/components/quick/quickAddBus";

export const MomentumQuickGrid: React.FC = () => {
  const { user } = useAuth();
  const [weightOpen, setWeightOpen] = useState(false);

  const addFluid = async (ml: number) => {
    try {
      if (!user) { toast.error('Bitte zuerst anmelden'); return; }
      const today = new Date().toISOString().slice(0,10);
      const { error } = await supabase.from('user_fluids').insert({ user_id: user.id, amount_ml: ml, date: today, consumed_at: new Date().toISOString() });
      if (error) throw error;
      toast.success(`+${ml} ml erfasst`);
    } catch (e) {
      console.error(e);
      toast.error('Eintrag fehlgeschlagen');
    }
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {/* Schlaf */}
      <Card className="rounded-2xl border border-border/40 p-4 modern-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Schlaf</div>
              <div className="text-xs text-muted-foreground">Noch nicht eingetragen</div>
            </div>
          </div>
          <Button size="sm" className="rounded-lg" onClick={() => openSleep()}>Erfassen</Button>
        </div>
      </Card>

      {/* Gewicht */}
      <Card className="rounded-2xl border border-border/40 p-4 modern-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Gewicht</div>
              <div className="text-xs text-muted-foreground">Noch nicht eingetragen</div>
            </div>
          </div>
          <Button size="sm" className="rounded-lg" onClick={() => setWeightOpen(true)}>Erfassen</Button>
        </div>
        <QuickWeightModal isOpen={weightOpen} onClose={() => setWeightOpen(false)} />
      </Card>

      {/* Flüssigkeit */}
      <Card className="rounded-2xl border border-border/40 p-4 modern-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Droplets className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Getränke</div>
              <div className="text-xs text-muted-foreground">Heute: —</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => addFluid(250)}>+250</Button>
            <Button size="sm" variant="secondary" className="rounded-lg" onClick={() => addFluid(500)}>+500</Button>
            <Button size="sm" className="rounded-lg" onClick={() => quickAddBus.emit({ type: 'fluid' })}>Mehr</Button>
          </div>
        </div>
      </Card>

      {/* Mahlzeiten */}
      <Card className="rounded-2xl border border-border/40 p-4 modern-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Mahlzeiten</div>
              <div className="text-xs text-muted-foreground">Keine heute</div>
            </div>
          </div>
          <Button size="sm" className="rounded-lg" onClick={() => openMeal()}>Hinzufügen</Button>
        </div>
      </Card>

      {/* Training */}
      <Card className="rounded-2xl border border-border/40 p-4 modern-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Training</div>
              <div className="text-xs text-muted-foreground">Noch nicht gestartet</div>
            </div>
          </div>
          <Button size="sm" className="rounded-lg" onClick={() => openWorkout({ recommendedType: 'walking' })}>Starten</Button>
        </div>
      </Card>

      {/* Supplements */}
      <Card className="rounded-2xl border border-border/40 p-4 modern-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl grid place-items-center bg-muted">
              <Pill className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">Supplements</div>
              <div className="text-xs text-muted-foreground">Keine heute</div>
            </div>
          </div>
          <Button size="sm" className="rounded-lg" onClick={() => openSupplements()}>Hinzufügen</Button>
        </div>
      </Card>
    </section>
  );
};

export default MomentumQuickGrid;
