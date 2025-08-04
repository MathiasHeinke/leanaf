import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Scale, Target, Camera, Plus, Dumbbell, TrendingUp, Upload, Zap, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { useTargetImages } from '@/hooks/useTargetImages';
import { useStrengthGoals } from '@/hooks/useStrengthGoals';
import { toast } from 'sonner';

export const QuickBodyDataWidget: React.FC = () => {
  const { user } = useAuth();
  const { photos, uploadProgressPhoto } = useProgressPhotos();
  const { targetImages, uploadTargetImage, generateTargetImage } = useTargetImages();
  const { goals, addStrengthGoal, deleteStrengthGoal } = useStrengthGoals();
  
  const [newGoal, setNewGoal] = useState({ exercise: '', current: '', target: '' });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  const handleAddGoal = async () => {
    if (!newGoal.exercise || !newGoal.target) {
      toast.error('Bitte Übung und Zielgewicht eingeben');
      return;
    }

    await addStrengthGoal({
      exercise_name: newGoal.exercise,
      current_1rm_kg: newGoal.current ? parseFloat(newGoal.current) : undefined,
      target_1rm_kg: parseFloat(newGoal.target)
    });

    setNewGoal({ exercise: '', current: '', target: '' });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadProgressPhoto(file);
    }
  };

  const handleTargetImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadTargetImage(file);
    }
  };

  const commonExercises = [
    'Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken',
    'Langhantelrudern', 'Klimmzüge', 'Dips', 'Bizep Curls'
  ];

  return (
    <Card className="border-muted bg-muted/30 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <Scale className="h-4 w-4" />
          Körper & Ziele
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Progress Photos Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Fortschrittsfotos</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => photoInputRef.current?.click()}
              className="h-8 px-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              Foto
            </Button>
          </div>
          
          {photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(0, 4).map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(photo.image_url)}
                >
                  <img
                    src={photo.image_url}
                    alt="Progress"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 border border-dashed border-border text-center">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Noch keine Fortschrittsfotos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dokumentiere deinen Fortschritt mit Fotos
              </p>
            </div>
          )}
        </div>

        {/* Target Image Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Zielbild</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => targetInputRef.current?.click()}
                className="h-8 px-3"
              >
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toast.info('AI-Generierung kommt bald!');
                }}
                className="h-8 px-3"
              >
                <Zap className="h-3 w-3 mr-1" />
                AI
              </Button>
            </div>
          </div>
          
          {targetImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {targetImages.slice(0, 2).map((image) => (
                <div
                  key={image.id}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative"
                  onClick={() => setSelectedImage(image.image_url)}
                >
                  <img
                    src={image.image_url}
                    alt="Target"
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs"
                  >
                    {image.image_type === 'ai_generated' ? 'AI' : 'Upload'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-6 border border-dashed border-border text-center">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Kein Zielbild definiert</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lade ein Foto hoch oder erstelle eins mit AI
              </p>
            </div>
          )}
        </div>

        {/* Strength Goals Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Kraftziele</span>
          </div>
          
          {goals.length > 0 && (
            <div className="space-y-2">
              {goals.slice(0, 3).map((goal) => (
                <div
                  key={goal.id}
                  className="bg-background/60 rounded-lg p-3 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{goal.exercise_name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteStrengthGoal(goal.id)}
                          className="h-6 w-6 p-0 hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {goal.current_1rm_kg && (
                          <span>{goal.current_1rm_kg}kg</span>
                        )}
                        <TrendingUp className="h-3 w-3" />
                        <span className="font-medium text-primary">
                          {goal.target_1rm_kg}kg
                        </span>
                        {goal.estimated_weeks && (
                          <span className="ml-auto">
                            ~{goal.estimated_weeks}w
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Goal */}
          <div className="bg-muted/50 rounded-lg p-3 border border-dashed border-border">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Input
                placeholder="Übung"
                value={newGoal.exercise}
                onChange={(e) => setNewGoal(prev => ({ ...prev, exercise: e.target.value }))}
                className="h-8 text-xs"
                list="exercises"
              />
              <datalist id="exercises">
                {commonExercises.map(exercise => (
                  <option key={exercise} value={exercise} />
                ))}
              </datalist>
              <Input
                placeholder="Aktuell (kg)"
                value={newGoal.current}
                onChange={(e) => setNewGoal(prev => ({ ...prev, current: e.target.value }))}
                className="h-8 text-xs"
                type="number"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ziel (kg)"
                value={newGoal.target}
                onChange={(e) => setNewGoal(prev => ({ ...prev, target: e.target.value }))}
                className="h-8 text-xs flex-1"
                type="number"
              />
              <Button
                size="sm"
                onClick={handleAddGoal}
                className="h-8 px-3"
                disabled={!newGoal.exercise || !newGoal.target}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ziel
              </Button>
            </div>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <input
          ref={targetInputRef}
          type="file"
          accept="image/*"
          onChange={handleTargetImageUpload}
          className="hidden"
        />

        {/* Image Modal */}
        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bild ansehen</DialogTitle>
              </DialogHeader>
              <div className="aspect-square overflow-hidden rounded-lg">
                <img
                  src={selectedImage}
                  alt="Full size view"
                  className="w-full h-full object-cover"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};