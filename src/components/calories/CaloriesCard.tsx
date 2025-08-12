import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Flame, ChevronDown, ChevronUp, Clock, Utensils, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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

function truncateTitle(title: string, maxLength: number = 20): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + "...";
}

function getMealType(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 11) return "Frühstück";
  if (hour >= 11 && hour < 15) return "Mittag";
  if (hour >= 15 && hour < 19) return "Snack";
  if (hour >= 19 && hour < 23) return "Abend";
  return "Nacht";
}

function formatFullDateTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getMealScore(meal: any): number {
  // Simple scoring based on macro balance and calories
  const baseScore = Math.min(10, Math.floor((meal.kcal || 0) / 50));
  const macroBonus = (meal.protein || 0) > 10 ? 2 : 0;
  return Math.min(10, baseScore + macroBonus);
}

function getMealQuality(score: number): string {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Gut";
  if (score >= 4) return "Okay";
  return "Verbesserbar";
}

function MacroPill({ label, left, unit = "g", macroType }: { label: string; left: number; unit?: string; macroType?: 'protein' | 'carbs' | 'fat' }) {
  const colorClass = macroType ? {
    protein: "text-protein border-protein/20 bg-protein/10",
    carbs: "text-carbs border-carbs/20 bg-carbs/10", 
    fat: "text-fats border-fats/20 bg-fats/10"
  }[macroType] : "";

  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-md border bg-card px-3 py-2",
      colorClass
    )}>
      <div className="text-xs text-muted-foreground/80">{label}</div>
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
  isExpanded,
}: {
  meal: any;
  targets: { protein: number; carbs: number; fat: number };
  onEditMeal?: (meal: any) => void;
  onDeleteMeal?: (mealId: string) => void;
  isExpanded: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ts = meal.ts || meal.created_at;
  const time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const kcal = meal.kcal ?? meal.calories ?? 0;
  const title = meal.title || meal.text || meal.name || meal.dish_name || meal.food_name || meal.description || "Unbenanntes Gericht";
  const imageUrl = meal.imageUrl || (Array.isArray(meal.images) ? meal.images[0] : meal.photo_url || meal.image_url);
  
  // Optimized title display based on parent expansion state
  const displayTitle = isExpanded ? title : truncateTitle(title);
  
  // Extended meal information
  const mealType = ts ? getMealType(ts) : "Unbekannt";
  const fullDateTime = ts ? formatFullDateTime(ts) : "Unbekannt";
  const score = getMealScore(meal);
  const quality = getMealQuality(score);

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
          <div className="text-sm font-medium truncate">{time} · {displayTitle}</div>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          {formatNumber(kcal)} kcal
          {(onEditMeal || onDeleteMeal) && (
            <div className="flex items-center gap-1 ml-1">
              {onEditMeal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditMeal(meal);
                  }}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
              {onDeleteMeal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeal(meal.id);
                  }}
                  className="p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {open ? <ChevronUp className="inline h-4 w-4 ml-1" /> : <ChevronDown className="inline h-4 w-4 ml-1" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {imageUrl && (
            <img src={imageUrl} alt={`${title} foto`} className="mt-2 w-full rounded-md object-cover max-h-44" loading="lazy" />
          )}
          
          {/* Full title when expanded */}
          <div className="mt-3">
            <h4 className="font-semibold text-base">{title}</h4>
          </div>
          
          {/* Extended meal information */}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {fullDateTime}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {mealType}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {score}/10 Punkte
            </Badge>
            <Badge variant="outline" className="text-xs">
              {quality}
            </Badge>
          </div>
          
          <div className="mt-3 space-y-2">
            {/* Macros colored with progress */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-protein">P {formatNumber(meal.protein || 0)}g</div>
                <Progress value={pct(meal.protein || 0, targets.protein || 0)} indicatorClassName="bg-protein" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-carbs">K {formatNumber(meal.carbs || 0)}g</div>
                <Progress value={pct(meal.carbs || 0, targets.carbs || 0)} indicatorClassName="bg-carbs" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-fats">F {formatNumber(meal.fats ?? meal.fat ?? 0)}g</div>
                <Progress value={pct(meal.fats ?? meal.fat ?? 0, targets.fat || 0)} indicatorClassName="bg-fats" />
              </div>
            </div>

            {/* Improved action buttons */}
            {(onEditMeal || onDeleteMeal) && (
              <div className="flex items-center gap-2 pt-2">
                {onEditMeal && (
                  <button 
                    type="button" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
                    onClick={() => onEditMeal(meal)}
                  >
                    <Edit2 className="h-3 w-3" />
                    Bearbeiten
                  </button>
                )}
                {onDeleteMeal && (
                  <button 
                    type="button" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => onDeleteMeal(String(meal.id))}
                  >
                    <Trash2 className="h-3 w-3" />
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
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Kalorien</h2>
          </div>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
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
          </CollapsibleTrigger>
        </div>

        {/* Collapsed summary when card is closed */}
        {!open && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <div className="font-semibold">{formatNumber(totals.caloriesUsed)} / {formatNumber(totals.caloriesTarget)} kcal</div>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-protein">P {formatNumber(totals.protein || 0)}g</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-carbs">K {formatNumber(totals.carbs || 0)}g</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-fats">F {formatNumber(totals.fat || 0)}g</span>
          </div>
        )}

        {/* Smart Chips for frequent meals - visible in both collapsed and expanded states */}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <SmartChip key={c} text={c} onClick={() => onAddQuickMeal?.(c)} />
            ))}
          </div>
        )}

        <CollapsibleContent>
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

        {/* Macros left with colors */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MacroPill label="Protein" left={proteinLeft} macroType="protein" />
          <MacroPill label="Kohlenhydrate" left={carbsLeft} macroType="carbs" />
          <MacroPill label="Fett" left={fatLeft} macroType="fat" />
        </div>


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
                meals.map((m: any) => (
                  <MealRow
                    key={m.id}
                    meal={m}
                    targets={{
                      protein: totals.targetProtein || 0,
                      carbs: totals.targetCarbs || 0,
                      fat: totals.targetFat || 0,
                    }}
                    onEditMeal={onEditMeal}
                    onDeleteMeal={onDeleteMeal}
                    isExpanded={open}
                  />
                ))
              )}
            </div>
          )}
        </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
