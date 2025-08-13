export type MealEntryUI = {
  id: string;
  ts: string;
  title: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string | null;
  source: 'index';
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

