import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Flame, ChevronDown, ChevronUp, Clock, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

type Totals = {
  caloriesUsed: number;
  caloriesTarget: number;
  protein: number;
  carbs: number;
  fat: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
};

type RawMeal = any;

type Frequent = Partial<{
  morning: string[];
  noon: string[];
  evening: string[];
  night: string[];
}>;

export type CaloriesCardProps = {
  date: Date;
  totals: Totals;
  meals: RawMeal[];
  frequent?: Frequent;
  onAddQuickMeal?: (text: string) => void;
  onEditMeal?: (meal: any) => void;
  onDeleteMeal?: (mealId: string) => void;
};

function formatNumber(n: number) {
  return Math.max(0, Math.round(n));
}

function MacroPill({ label, left, unit = "g" }: { label: string; left: number; unit?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{formatNumber(left)}{unit}</div>
    </div>
  );
}

function SmartChip({ text, onClick }: { text: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border bg-secondary/50 hover:bg-secondary px-3 py-1 text-xs transition-colors"
    >
      <Utensils className="h-3.5 w-3.5 mr-1.5" />
      <span className="truncate max-w-[10rem]">{text}</span>
    </button>
  );
}

function MealRow({
  meal,
  targets,
  onEditMeal,
  onDeleteMeal,
}: {
  meal: any;
  targets: { protein: number; carbs: number; fat: number };
  onEditMeal?: (meal: any) => void;
  onDeleteMeal?: (mealId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ts = meal.ts || meal.created_at;
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const kcal = meal.kcal ?? meal.calories ?? 0;
  const title = meal.title || meal.name || "Meal";
  const imageUrl = meal.imageUrl || (Array.isArray(meal.images) ? meal.images[0] : meal.photo_url || meal.image_url);

  const pct = (v: number, t: number) => (t > 0 ? Math.min(100, Math.max(0, (Number(v || 0) / Number(t)) * 100)) : 0);

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${title} mini`}
              className="h-6 w-6 rounded-sm object-cover"
              loading="lazy"
            />
          ) : (
            <Utensils className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="text-sm font-medium truncate">{time} · {title}</div>
        </div>
        <div className="text-sm font-semibold whitespace-nowrap">
          {formatNumber(kcal)} kcal {open ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {imageUrl && (
            <img src={imageUrl} alt={`${title} foto`} className="mt-2 w-full rounded-md object-cover max-h-44" loading="lazy" />
          )}
          <div className="mt-3 space-y-2">
            {/* Macros colored with progress */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-[hsl(var(--protein))]">P {formatNumber(meal.protein || 0)}g</div>
                <Progress value={pct(meal.protein || 0, targets.protein || 0)} indicatorClassName="bg-[hsl(var(--protein))]" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-[hsl(var(--carbs))]">K {formatNumber(meal.carbs || 0)}g</div>
                <Progress value={pct(meal.carbs || 0, targets.carbs || 0)} indicatorClassName="bg-[hsl(var(--carbs))]" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-[hsl(var(--fats))]">F {formatNumber(meal.fats ?? meal.fat ?? 0)}g</div>
                <Progress value={pct(meal.fats ?? meal.fat ?? 0, targets.fat || 0)} indicatorClassName="bg-[hsl(var(--fats))]" />
              </div>
            </div>

            {(onEditMeal || onDeleteMeal) && (
              <div className="flex items-center gap-2 pt-1">
                {onEditMeal && (
                  <button type="button" className="text-xs underline text-muted-foreground hover:text-foreground" onClick={() => onEditMeal(meal)}>
                    Bearbeiten
                  </button>
                )}
                {onDeleteMeal && (
                  <button type="button" className="text-xs underline text-destructive hover:opacity-80" onClick={() => onDeleteMeal(String(meal.id))}>
                    Löschen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CaloriesCard({ date, totals, meals, frequent, onAddQuickMeal, onEditMeal, onDeleteMeal }: CaloriesCardProps) {
  const [open, setOpen] = useState(true);
  const [showMeals, setShowMeals] = useState(false);

  const kcalLeft = Math.max(0, (totals.caloriesTarget || 0) - (totals.caloriesUsed || 0));
  const proteinLeft = Math.max(0, (totals.targetProtein || 0) - (totals.protein || 0));
  const carbsLeft = Math.max(0, (totals.targetCarbs || 0) - (totals.carbs || 0));
  const fatLeft = Math.max(0, (totals.targetFat || 0) - (totals.fat || 0));

  const daypart = (() => {
    const h = date.getHours();
    if (h >= 5 && h < 11) return "morning" as const;
    if (h >= 11 && h < 15) return "noon" as const;
    if (h >= 15 && h < 22) return "evening" as const;
    return "night" as const;
  })();

  const chips = (frequent?.[daypart] || []).slice(0, 3);

  return (
    <Collapsible open={open}>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Kalorien</h2>
          </div>
          <button
            type="button"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <>
                Einklappen <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Ausklappen <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Header numbers */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Verbraucht / Ziel</div>
            <div className="text-lg font-semibold">{formatNumber(totals.caloriesUsed)} / {formatNumber(totals.caloriesTarget)} kcal</div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">kcal übrig</div>
            <div className="text-lg font-semibold">{formatNumber(kcalLeft)} kcal</div>
          </div>
        </div>

        {/* Macros left */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MacroPill label="Protein" left={proteinLeft} />
          <MacroPill label="Kohlenhydrate" left={carbsLeft} />
          <MacroPill label="Fett" left={fatLeft} />
        </div>

        {/* Smart chips */}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <SmartChip key={c} text={c} onClick={() => onAddQuickMeal?.(c)} />
            ))}
          </div>
        )}

        {/* Meals list toggle */}
        <div className="mt-4">
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-md border bg-card px-3 py-2 hover:bg-muted/50"
            onClick={() => setShowMeals((v) => !v)}
          >
            <div className="text-sm font-medium">Mahlzeiten anzeigen</div>
            {showMeals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showMeals && (
            <div className="mt-3 space-y-2">
              {meals.length === 0 ? (
                <div className="text-sm text-muted-foreground">Keine Mahlzeiten erfasst.</div>
              ) : (
                meals.map((m: any) => <MealRow key={m.id} meal={m} />)
              )}
            </div>
          )}
        </div>
      </Card>
    </Collapsible>
  );
}
