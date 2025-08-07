import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dumbbell, Save, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface SetDetail {
  weight?: string;
  reps?: string;
  rpe?: number | string;
}

interface ExerciseItem {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  rpe?: number;
  rest_seconds?: number;
  sets_detail?: SetDetail[];
}

interface DayStruct {
  day: string;
  focus: string;
  exercises: ExerciseItem[];
}

interface PlanStruct {
  weekly_structure: DayStruct[];
  principles?: string[];
}

export interface PlanInlineEditorProps {
  initialPlan: {
    name: string;
    goal: string;
    daysPerWeek: number;
    structure: PlanStruct;
    analysis?: string;
  };
  onSave: (plan: any) => Promise<void>;
  onRequestMoreDays?: () => void;
}

export const PlanInlineEditor: React.FC<PlanInlineEditorProps> = ({ initialPlan, onSave, onRequestMoreDays }) => {
  const [plan, setPlan] = useState(initialPlan);
  const day = plan.structure.weekly_structure[0];
  const [isSaving, setIsSaving] = useState(false);
  const [askedMore, setAskedMore] = useState(false);

  // Ensure each exercise has 3 set rows (default)
  const normalizedExercises = useMemo(() => {
    return (day?.exercises || []).map((ex) => {
      const detail = ex.sets_detail && ex.sets_detail.length > 0
        ? ex.sets_detail
        : Array.from({ length: 3 }, () => ({ weight: ex.weight || '', reps: ex.reps || '8-12', rpe: ex.rpe ?? 8 }));
      const norm = { ...ex, sets_detail: detail.slice(0, 3) };
      if (norm.sets_detail.length < 3) {
        while (norm.sets_detail.length < 3) norm.sets_detail.push({ weight: ex.weight || '', reps: ex.reps || '8-12', rpe: ex.rpe ?? 8 });
      }
      return norm;
    });
  }, [day?.exercises]);

  const updateExercise = (idx: number, updates: Partial<ExerciseItem>) => {
    const copy = { ...plan };
    copy.structure = { ...copy.structure } as PlanStruct;
    copy.structure.weekly_structure = [...copy.structure.weekly_structure];
    const dayCopy = { ...copy.structure.weekly_structure[0] } as DayStruct;
    dayCopy.exercises = [...normalizedExercises];
    dayCopy.exercises[idx] = { ...dayCopy.exercises[idx], ...updates };
    copy.structure.weekly_structure[0] = dayCopy;
    setPlan(copy);
  };

  const updateSetDetail = (idx: number, setIdx: number, key: keyof SetDetail, value: string) => {
    const ex = normalizedExercises[idx];
    const details = [...(ex.sets_detail || [])];
    details[setIdx] = { ...details[setIdx], [key]: key === 'rpe' ? (value ? parseInt(value) : '') : value };
    updateExercise(idx, { sets_detail: details });
  };

  const removeExercise = (idx: number) => {
    const copy = { ...plan };
    const dayCopy = { ...copy.structure.weekly_structure[0] } as DayStruct;
    const list = [...normalizedExercises];
    list.splice(idx, 1);
    dayCopy.exercises = list;
    copy.structure.weekly_structure[0] = dayCopy;
    setPlan(copy);
  };

  const addEmptyExercise = () => {
    const copy = { ...plan };
    const dayCopy = { ...copy.structure.weekly_structure[0] } as DayStruct;
    const list = [...normalizedExercises];
    list.push({
      name: '',
      sets: 3,
      reps: '8-12',
      weight: '',
      rpe: 8,
      rest_seconds: 120,
      sets_detail: Array.from({ length: 3 }, () => ({ weight: '', reps: '8-12', rpe: 8 }))
    });
    dayCopy.exercises = list;
    copy.structure.weekly_structure[0] = dayCopy;
    setPlan(copy);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(plan);
      toast.success('Trainingsplan gespeichert');
      setAskedMore(true);
    } catch (e: any) {
      toast.error('Konnte nicht speichern');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-lg text-primary">Nächster Trainingstag</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">{plan.goal}</Badge>
        </div>
        <div className="mt-2 text-sm">
          <div className="font-semibold">{plan.name}</div>
          <div className="text-muted-foreground">{day?.day} · {day?.focus}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercises */}
        <div className="space-y-4">
          {normalizedExercises.map((ex, idx) => (
            <div key={idx} className="rounded-lg border bg-background/50">
              <div className="flex items-center gap-2 p-3 border-b">
                <Label className="text-xs w-16">Übung</Label>
                <Input
                  value={ex.name}
                  onChange={(e) => updateExercise(idx, { name: e.target.value })}
                  placeholder="z.B. Bankdrücken"
                  className="text-sm"
                />
                <Button variant="ghost" size="sm" onClick={() => removeExercise(idx)} className="ml-auto text-destructive">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Set rows */}
              <div className="grid grid-cols-1 gap-2 p-3">
                {[0,1,2].map((s) => (
                  <div key={s} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2 text-xs text-muted-foreground">Satz {s+1}</div>
                    <div className="col-span-3">
                      <Label className="text-xs">Gewicht (kg)</Label>
                      <Input
                        value={(ex.sets_detail?.[s]?.weight as string) ?? ''}
                        onChange={(e) => updateSetDetail(idx, s, 'weight', e.target.value)}
                        placeholder="80"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Wiederholungen</Label>
                      <Input
                        value={(ex.sets_detail?.[s]?.reps as string) ?? ''}
                        onChange={(e) => updateSetDetail(idx, s, 'reps', e.target.value)}
                        placeholder="8-12"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">RPE</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={String(ex.sets_detail?.[s]?.rpe ?? '')}
                        onChange={(e) => updateSetDetail(idx, s, 'rpe', e.target.value)}
                        placeholder="8"
                        className="text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add exercise (optional for now) */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={addEmptyExercise} className="gap-1">
              <Plus className="w-3 h-3" /> Übung hinzufügen
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" /> {isSaving ? 'Speichere…' : 'Speichern'}
          </Button>
        </div>

        {/* Prompt for more days */}
        {askedMore && (
          <div className="mt-2 p-3 rounded-md bg-muted/40 text-sm flex items-center gap-2">
            Weitere Tage auch gleich erstellen?
            <Button size="sm" className="ml-2" onClick={onRequestMoreDays}>Ja</Button>
            <Button size="sm" variant="outline" onClick={() => toast.message('Alles klar – viel Spaß beim Workout!')}>Nein</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
