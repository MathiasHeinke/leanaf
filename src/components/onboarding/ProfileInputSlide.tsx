import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePointsSystem } from '@/hooks/usePointsSystem';
import { toast } from 'sonner';
import { Sparkles, User } from 'lucide-react';

interface ProfileInputSlideProps {
  onComplete: () => void;
}

interface FormData {
  preferred_name: string;
  weight: string;
  height: string;
  gender: string;
  activity_level: string;
  goal: string;
  target_date: string;
}

export const ProfileInputSlide = ({ onComplete }: ProfileInputSlideProps) => {
  const { user } = useAuth();
  const { awardPoints } = usePointsSystem();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    try {
      const profileData = {
        user_id: user.id,
        preferred_name: data.preferred_name,
        weight: parseFloat(data.weight),
        height: parseInt(data.height),
        gender: data.gender,
        activity_level: data.activity_level,
        goal: data.goal,
        target_date: data.target_date || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      // Award points for completing profile
      await awardPoints('profile_completed', 25, 'Profil vollständig ausgefüllt');

      toast.success('Willkommen bei GetLean AI! 🎉');
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Fehler beim Speichern des Profils');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          Jetzt starten – dein Profil
        </h2>
        <p className="text-white/60">
          Deine Basis für perfekte Kalorien- & Trainingspläne
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="preferred_name" className="text-white">
            Wie sollen dich die Coaches nennen?
          </Label>
          <Input
            id="preferred_name"
            placeholder="z.B. Alex"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            {...register('preferred_name', { required: 'Name ist erforderlich' })}
          />
          {errors.preferred_name && (
            <p className="text-red-400 text-sm">{errors.preferred_name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-white">
              Gewicht (kg)
            </Label>
            <Input
              id="weight"
              type="number"
              placeholder="z.B. 97"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              {...register('weight', { required: 'Gewicht ist erforderlich' })}
            />
            {errors.weight && (
              <p className="text-red-400 text-sm">{errors.weight.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="height" className="text-white">
              Größe (cm)
            </Label>
            <Input
              id="height"
              type="number"
              placeholder="z.B. 187"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              {...register('height', { required: 'Größe ist erforderlich' })}
            />
            {errors.height && (
              <p className="text-red-400 text-sm">{errors.height.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Geschlecht</Label>
          <Select onValueChange={(value) => setValue('gender', value)}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Wähle dein Geschlecht" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Männlich</SelectItem>
              <SelectItem value="female">Weiblich</SelectItem>
              <SelectItem value="other">Divers</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-red-400 text-sm">{errors.gender.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white">Aktivitätslevel</Label>
          <Select onValueChange={(value) => setValue('activity_level', value)}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Wie aktiv bist du?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Gering (Büro, kaum Bewegung)</SelectItem>
              <SelectItem value="moderate">Normal (2–3x Sport/Woche)</SelectItem>
              <SelectItem value="high">Hoch (täglich aktiv oder körperlich)</SelectItem>
            </SelectContent>
          </Select>
          {errors.activity_level && (
            <p className="text-red-400 text-sm">{errors.activity_level.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white">Dein Ziel</Label>
          <Select onValueChange={(value) => setValue('goal', value)}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Was willst du erreichen?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lose">Abnehmen</SelectItem>
              <SelectItem value="maintain">Gewicht halten</SelectItem>
              <SelectItem value="gain">Zunehmen</SelectItem>
            </SelectContent>
          </Select>
          {errors.goal && (
            <p className="text-red-400 text-sm">{errors.goal.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_date" className="text-white">
            Bis wann willst du dein Ziel erreichen? (optional)
          </Label>
          <Input
            id="target_date"
            type="date"
            className="bg-white/10 border-white/20 text-white"
            {...register('target_date')}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white py-6 text-lg mt-6"
        >
          {isSubmitting ? (
            'Speichere...'
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Starte deine Reise
            </>
          )}
        </Button>
      </form>
    </div>
  );
};