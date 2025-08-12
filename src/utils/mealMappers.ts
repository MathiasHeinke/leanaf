export type MealEntryUI = {
  id: string;
  ts: string;
  title: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string | null;
  source: 'index' | 'momentum';
};

export const mapFromIndex = (r: any): MealEntryUI => ({
  id: r.id,
  ts: r.ts,
  title: r.title ?? r.text ?? r.name ?? 'Meal',
  kcal: Number(r.kcal ?? 0),
  protein: Number(r.protein ?? 0),
  carbs: Number(r.carbs ?? 0),
  fat: Number(r.fat ?? 0),
  imageUrl: r.image_url ?? null,
  source: 'index',
});

export const mapFromMomentum = (m: any): MealEntryUI => ({
  id: m.id,
  ts: m.ts ?? m.created_at,
  title: m.name ?? m.title ?? m.text ?? 'Meal',
  kcal: Number(m.kcal ?? m?.nutrition?.kcal ?? 0),
  protein: Number(m.protein ?? m?.nutrition?.protein ?? 0),
  carbs: Number(m.carbs ?? m?.nutrition?.carbs ?? 0),
  fat: Number(m.fat ?? m?.nutrition?.fat ?? 0),
  imageUrl: m.photo_url ?? m.image_url ?? null,
  source: 'momentum',
});
