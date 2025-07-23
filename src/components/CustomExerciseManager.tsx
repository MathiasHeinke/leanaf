import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CustomExercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  description?: string;
  instructions?: string;
  equipment?: string;
  difficulty_level: number;
  is_compound: boolean;
}

interface CustomExerciseManagerProps {
  onExerciseAdded: () => void;
}

export const CustomExerciseManager: React.FC<CustomExerciseManagerProps> = ({
  onExerciseAdded
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  
  // Form states
  const [exerciseName, setExerciseName] = useState('');
  const [category, setCategory] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [isCompound, setIsCompound] = useState(false);
  const [newMuscleGroup, setNewMuscleGroup] = useState('');

  const categories = [
    { value: 'push', label: 'Push (Drücken)' },
    { value: 'pull', label: 'Pull (Ziehen)' },
    { value: 'legs', label: 'Beine' },
    { value: 'core', label: 'Core/Rumpf' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'custom', label: 'Sonstiges' }
  ];

  const commonMuscleGroups = [
    'chest', 'shoulders', 'triceps', 'biceps', 'lats', 'rhomboids', 
    'traps', 'lower_back', 'quadriceps', 'hamstrings', 'glutes', 
    'calves', 'core', 'abs', 'forearms'
  ];

  useEffect(() => {
    if (user && isOpen) {
      loadCustomExercises();
    }
  }, [user, isOpen]);

  const loadCustomExercises = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order('name');

      if (error) throw error;
      setCustomExercises(data || []);
    } catch (error) {
      console.error('Error loading custom exercises:', error);
    }
  };

  const addMuscleGroup = () => {
    if (newMuscleGroup && !muscleGroups.includes(newMuscleGroup)) {
      setMuscleGroups([...muscleGroups, newMuscleGroup]);
      setNewMuscleGroup('');
    }
  };

  const removeMuscleGroup = (group: string) => {
    setMuscleGroups(muscleGroups.filter(g => g !== group));
  };

  const resetForm = () => {
    setExerciseName('');
    setCategory('');
    setMuscleGroups([]);
    setDescription('');
    setInstructions('');
    setEquipment('');
    setDifficulty(1);
    setIsCompound(false);
    setNewMuscleGroup('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !exerciseName || !category) return;

    try {
      setIsLoading(true);

      // First, insert into the exercises table
      const { error } = await supabase
        .from('exercises')
        .insert({
          name: exerciseName,
          category,
          muscle_groups: muscleGroups,
          description: description || null,
          instructions: instructions || null,
          equipment: equipment || null,
          difficulty_level: difficulty,
          is_compound: isCompound,
          created_by: user.id,
          is_public: false
        });

      if (error) throw error;

      toast({
        title: "Übung hinzugefügt",
        description: `${exerciseName} wurde erfolgreich zu deiner Liste hinzugefügt.`
      });

      resetForm();
      loadCustomExercises();
      onExerciseAdded();
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast({
        title: "Fehler",
        description: "Übung konnte nicht hinzugefügt werden.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExercise = async (exerciseId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId)
        .eq('created_by', user.id);

      if (error) throw error;

      toast({
        title: "Übung gelöscht",
        description: "Die Übung wurde erfolgreich entfernt."
      });

      loadCustomExercises();
      onExerciseAdded();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Fehler",
        description: "Übung konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Eigene Übungen verwalten
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eigene Übungen verwalten</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Exercise Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Neue Übung hinzufügen</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exerciseName">Übungsname *</Label>
                  <Input
                    id="exerciseName"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                    placeholder="z.B. Schrägbankdrücken"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Kategorie *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategorie wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Muskelgruppen</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newMuscleGroup}
                    onChange={(e) => setNewMuscleGroup(e.target.value)}
                    placeholder="Muskelgruppe hinzufügen"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMuscleGroup())}
                  />
                  <Button type="button" onClick={addMuscleGroup} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {commonMuscleGroups.map((group) => (
                    <Badge
                      key={group}
                      variant={muscleGroups.includes(group) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (muscleGroups.includes(group)) {
                          removeMuscleGroup(group);
                        } else {
                          setMuscleGroups([...muscleGroups, group]);
                        }
                      }}
                    >
                      {group}
                    </Badge>
                  ))}
                </div>
                {muscleGroups.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {muscleGroups.map((group) => (
                      <Badge key={group} variant="secondary" className="gap-1">
                        {group}
                        <button
                          type="button"
                          onClick={() => removeMuscleGroup(group)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung der Übung"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Anleitung</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ausführung Schritt für Schritt"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment">Equipment</Label>
                  <Input
                    id="equipment"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    placeholder="z.B. Langhantel, Kurzhanteln"
                  />
                </div>
                
                <div>
                  <Label htmlFor="difficulty">Schwierigkeit (1-5)</Label>
                  <Select value={difficulty.toString()} onValueChange={(v) => setDifficulty(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          {level} - {level === 1 ? 'Anfänger' : level === 5 ? 'Experte' : 'Fortgeschritten'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isCompound"
                  checked={isCompound}
                  onChange={(e) => setIsCompound(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isCompound">Grundübung (mehrere Muskelgruppen)</Label>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Hinzufügen...' : 'Übung hinzufügen'}
              </Button>
            </form>
          </div>

          {/* Exercise List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deine Übungen</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customExercises
                .filter(ex => (ex as any).created_by === user?.id)
                .map((exercise) => (
                <div key={exercise.id} className="p-3 border rounded-lg flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{exercise.name}</h4>
                    <p className="text-sm text-muted-foreground capitalize">{exercise.category}</p>
                    {exercise.muscle_groups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exercise.muscle_groups.slice(0, 3).map((group) => (
                          <Badge key={group} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                        {exercise.muscle_groups.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{exercise.muscle_groups.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteExercise(exercise.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {customExercises
                .filter(ex => (ex as any).created_by === user?.id)
                .length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine eigenen Übungen erstellt.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};