import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Dumbbell, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MediaUploadZone } from '@/components/MediaUploadZone';

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
  image_url?: string;
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
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  const categories = [
    'Kraft',
    'Cardio',
    'Flexibilität',
    'Core',
    'Funktional',
    'Plyometrie',
    'Rehabilitation'
  ];

  const commonMuscleGroups = [
    'Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Unterarme',
    'Quadrizeps', 'Hamstrings', 'Gesäß', 'Waden', 'Core', 'Bauch'
  ];

  useEffect(() => {
    if (isOpen && user) {
      loadCustomExercises();
    }
  }, [isOpen, user]);

  const loadCustomExercises = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addMuscleGroup = () => {
    if (newMuscleGroup.trim() && !muscleGroups.includes(newMuscleGroup.trim())) {
      setMuscleGroups([...muscleGroups, newMuscleGroup.trim()]);
      setNewMuscleGroup('');
    }
  };

  const removeMuscleGroup = (muscleGroup: string) => {
    setMuscleGroups(muscleGroups.filter(mg => mg !== muscleGroup));
  };

  const resetForm = () => {
    setExerciseName('');
    setCategory('');
    setDescription('');
    setInstructions('');
    setEquipment('');
    setMuscleGroups([]);
    setDifficulty(1);
    setIsCompound(false);
    setNewMuscleGroup('');
    setUploadedImageUrl('');
  };

  const handleImageUpload = async (urls: string[]) => {
    if (urls.length === 0) return;
    
    const imageUrl = urls[0];
    setUploadedImageUrl(imageUrl);

    toast({
      title: "Bild hochgeladen",
      description: "Das Übungsbild wurde erfolgreich hinzugefügt.",
    });
  };

  const handleSubmit = async () => {
    if (!user || !exerciseName.trim() || !category || muscleGroups.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte fülle alle Pflichtfelder aus.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the uploaded image URL if available
      const imageUrl = uploadedImageUrl || null;

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: exerciseName.trim(),
          category,
          muscle_groups: muscleGroups,
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          equipment: equipment.trim() || null,
          difficulty_level: difficulty,
          is_compound: isCompound,
          created_by: user.id,
          is_public: false,
          image_url: imageUrl
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Übung erstellt",
        description: `Die Übung "${exerciseName}" wurde erfolgreich hinzugefügt.`,
      });

      resetForm();
      loadCustomExercises();
      onExerciseAdded();
      
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast({
        title: "Fehler",
        description: "Die Übung konnte nicht erstellt werden.",
        variant: "destructive",
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
        description: "Die Übung wurde erfolgreich entfernt.",
      });

      loadCustomExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast({
        title: "Fehler",
        description: "Die Übung konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Eigene Übungen verwalten
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Eigene Übungen verwalten
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Add Exercise Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Neue Übung hinzufügen</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Übungsname *</Label>
                <Input
                  id="name"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="z.B. Bankdrücken"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle eine Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Muskelgruppen *</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Select value={newMuscleGroup} onValueChange={setNewMuscleGroup}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Muskelgruppe wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonMuscleGroups
                          .filter(mg => !muscleGroups.includes(mg))
                          .map((muscle) => (
                            <SelectItem key={muscle} value={muscle}>{muscle}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addMuscleGroup} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {muscleGroups.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="flex items-center gap-1">
                        {muscle}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeMuscleGroup(muscle)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung der Übung"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Ausführung</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Schritt-für-Schritt Anleitung"
                  rows={4}
                />
              </div>

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
                <Label htmlFor="difficulty">Schwierigkeitsgrad (1-5)</Label>
                <Select value={difficulty.toString()} onValueChange={(value) => setDifficulty(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Anfänger</SelectItem>
                    <SelectItem value="2">2 - Leicht Fortgeschritten</SelectItem>
                    <SelectItem value="3">3 - Mittelstufe</SelectItem>
                    <SelectItem value="4">4 - Fortgeschritten</SelectItem>
                    <SelectItem value="5">5 - Experte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="compound">Compound-Übung</Label>
                <Select value={isCompound ? 'true' : 'false'} onValueChange={(value) => setIsCompound(value === 'true')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Übungsbild (optional)</Label>
                <div className="space-y-4">
                  {!uploadedImageUrl ? (
                    <MediaUploadZone
                      onMediaUploaded={handleImageUpload}
                      accept={['image/*']}
                      maxFiles={1}
                      className="border-dashed border-2 border-muted-foreground/25 rounded-lg p-6 text-center"
                    />
                  ) : (
                    <div className="relative">
                      <img 
                        src={uploadedImageUrl} 
                        alt="Übungsvorschau" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setUploadedImageUrl('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || !exerciseName.trim() || !category || muscleGroups.length === 0}
                className="w-full"
              >
                {isLoading ? 'Wird erstellt...' : 'Übung hinzufügen'}
              </Button>
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deine Übungen</h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : customExercises.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine eigenen Übungen erstellt</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {customExercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{exercise.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExercise(exercise.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Exercise Image */}
                      {exercise.image_url && (
                        <div className="w-full h-32 rounded-lg overflow-hidden">
                          <img 
                            src={exercise.image_url} 
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{exercise.category}</Badge>
                        {exercise.muscle_groups.map((muscle) => (
                          <Badge key={muscle} variant="outline" className="text-xs">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                      
                      {exercise.description && (
                        <p className="text-sm text-muted-foreground">
                          {exercise.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Level: {exercise.difficulty_level}</span>
                        {exercise.is_compound && (
                          <Badge variant="outline" className="text-xs">Compound</Badge>
                        )}
                        {exercise.equipment && (
                          <span>Equipment: {exercise.equipment}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};