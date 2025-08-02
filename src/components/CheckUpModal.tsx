import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserProfileSchema, UserProfile, InjuryEnum } from '@/schemas/user-profile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { X, ChevronLeft, ChevronRight, User, Clock, Target, AlertTriangle } from 'lucide-react';

interface CheckUpModalProps {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<UserProfile>;
  coachAvatar?: string;
  coachName?: string;
}

const INJURY_LABELS = {
  ruecken: 'Rücken',
  knie: 'Knie',
  schulter: 'Schulter',
  ellbogen: 'Ellbogen',
  huefte: 'Hüfte',
  sonstige: 'Sonstige'
};

const GOAL_LABELS = {
  hypertrophy: 'Muskelaufbau',
  strength: 'Kraftaufbau',
  endurance: 'Ausdauer',
  general: 'Allgemeine Fitness'
};

export const CheckUpModal: React.FC<CheckUpModalProps> = ({ 
  open, 
  onClose, 
  defaultValues,
  coachAvatar,
  coachName 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema.omit({ userId: true })),
    defaultValues: {
      experienceYears: defaultValues?.experienceYears,
      availableMinutes: defaultValues?.availableMinutes,
      weeklySessions: defaultValues?.weeklySessions,
      injuries: defaultValues?.injuries || [],
      goal: defaultValues?.goal,
      preferences: {
        cardio: defaultValues?.preferences?.cardio,
        pumpStyle: defaultValues?.preferences?.pumpStyle,
        strengthFocus: defaultValues?.preferences?.strengthFocus,
        periodization: defaultValues?.preferences?.periodization,
      }
    },
  });

  const watchedInjuries = watch('injuries') || [];
  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const toggleInjury = (injury: keyof typeof INJURY_LABELS) => {
    const current = getValues('injuries') || [];
    const updated = current.includes(injury) 
      ? current.filter(i => i !== injury)
      : [...current, injury];
    setValue('injuries', updated);
  };

  const onSubmit = async (data: Omit<UserProfile, 'userId'>) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const profileData = { ...data, userId: user.id };
      
      // Upsert user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          profile: profileData,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Log profile event
      const { error: eventError } = await supabase
        .from('user_profile_events')
        .insert({
          user_id: user.id,
          profile_delta: profileData,
          event_type: 'profile_update'
        });

      if (eventError) throw eventError;

      toast({
        title: "Profil aktualisiert",
        description: "Deine Trainingsdaten wurden erfolgreich gespeichert.",
      });

      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Fehler",
        description: "Beim Speichern ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    const values = getValues();
    switch (currentStep) {
      case 1:
        return values.experienceYears && values.availableMinutes && values.weeklySessions;
      case 2:
        return true; // Injuries are optional
      case 3:
        return values.goal;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {coachAvatar && (
                <img 
                  src={coachAvatar} 
                  alt={coachName} 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span>Profil Check-Up</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {coachName && (
            <p className="text-sm text-muted-foreground">
              Hey! {coachName} hier. Lass uns deine aktuellen Trainingsdaten aktualisieren, 
              damit ich dir den perfekten Plan erstellen kann.
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Schritt {currentStep} von {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Basis */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <User className="h-5 w-5 text-primary" />
                  Basis-Informationen
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experienceYears">Trainingserfahrung (Jahre)</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      min={0}
                      max={60}
                      {...register('experienceYears', { valueAsNumber: true })}
                      placeholder="z.B. 3"
                    />
                    {errors.experienceYears && (
                      <p className="text-sm text-destructive">{errors.experienceYears.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availableMinutes">Zeit pro Einheit (Minuten)</Label>
                    <Input
                      id="availableMinutes"
                      type="number"
                      min={15}
                      max={180}
                      {...register('availableMinutes', { valueAsNumber: true })}
                      placeholder="z.B. 60"
                    />
                    {errors.availableMinutes && (
                      <p className="text-sm text-destructive">{errors.availableMinutes.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weeklySessions">Trainingseinheiten pro Woche</Label>
                    <Input
                      id="weeklySessions"
                      type="number"
                      min={1}
                      max={14}
                      {...register('weeklySessions', { valueAsNumber: true })}
                      placeholder="z.B. 4"
                    />
                    {errors.weeklySessions && (
                      <p className="text-sm text-destructive">{errors.weeklySessions.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Injuries */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Verletzungen & Einschränkungen
                </div>

                <div className="space-y-4">
                  <Label>Hast du aktuelle Verletzungen oder Problembereiche?</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(INJURY_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleInjury(value as keyof typeof INJURY_LABELS)}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          watchedInjuries.includes(value as any)
                            ? 'bg-destructive/10 border-destructive text-destructive'
                            : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  
                  {watchedInjuries.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Super! Keine Verletzungen bedeutet mehr Übungsoptionen für deinen Plan.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Goals & Preferences */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Target className="h-5 w-5 text-primary" />
                  Ziele & Präferenzen
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Hauptziel</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(GOAL_LABELS).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setValue('goal', value as any)}
                          className={`p-4 rounded-lg border text-sm transition-colors ${
                            watch('goal') === value
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-background border-border hover:border-primary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {errors.goal && (
                      <p className="text-sm text-destructive">{errors.goal.message}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Trainingspräferenzen (optional)</Label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setValue('preferences.pumpStyle', !watch('preferences.pumpStyle'))}
                        className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                          watch('preferences.pumpStyle')
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        💪 Ich liebe den Pump (höhere Wiederholungen)
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setValue('preferences.strengthFocus', !watch('preferences.strengthFocus'))}
                        className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                          watch('preferences.strengthFocus')
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        🏋️ Kraftfokus (schwere Gewichte, niedrige Wiederholungen)
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setValue('preferences.periodization', !watch('preferences.periodization'))}
                        className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                          watch('preferences.periodization')
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        📊 Wissenschaftliche Periodisierung
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setValue('preferences.cardio', !watch('preferences.cardio'))}
                        className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                          watch('preferences.cardio')
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border hover:border-primary'
                        }`}
                      >
                        🏃 Cardio-Einheiten einbauen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!canProceed()}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading || !canProceed()}>
                  {isLoading ? 'Speichere...' : 'Profil speichern'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};