import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FeatureRequestDialogProps {
  trigger?: React.ReactNode;
}

const categories = [
  { value: 'ui_ux', label: 'UI/UX Verbesserung' },
  { value: 'functionality', label: 'Neue Funktionalität' },
  { value: 'performance', label: 'Performance' },
  { value: 'integration', label: 'Integration' },
  { value: 'content', label: 'Content/Inhalte' },
  { value: 'other', label: 'Sonstiges' }
];

const priorities = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'critical', label: 'Kritisch' }
];

export function FeatureRequestDialog({ trigger }: FeatureRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Fehler',
        description: 'Du musst angemeldet sein, um Feature-Anfragen zu stellen.',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: 'Fehler',
        description: 'Bitte fülle alle Pflichtfelder aus.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          priority
        });

      if (error) throw error;

      toast({
        title: 'Erfolgreich eingereicht!',
        description: 'Deine Feature-Anfrage wurde erfolgreich eingereicht. Vielen Dank für dein Feedback!',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setPriority('medium');
      setOpen(false);
    } catch (error) {
      console.error('Error submitting feature request:', error);
      toast({
        title: 'Fehler',
        description: 'Ein Fehler ist beim Einreichen der Feature-Anfrage aufgetreten.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setPriority('medium');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start gap-2">
            <Lightbulb className="h-4 w-4" />
            Feature anfragen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Feature anfragen
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kurze Beschreibung des Features"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Kategorie *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Wähle eine Kategorie" />
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

          <div>
            <Label htmlFor="priority">Priorität</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((prio) => (
                  <SelectItem key={prio.value} value={prio.value}>
                    {prio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Beschreibung *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe das gewünschte Feature im Detail. Was soll es können? Warum ist es nützlich?"
              rows={4}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              className="flex-1"
            >
              Zurücksetzen
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Feature einreichen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}