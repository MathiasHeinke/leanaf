import { useState } from 'react';
import { Bug, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BugReportDialogProps {
  trigger?: React.ReactNode;
}

const BUG_CATEGORIES = [
  { value: 'ui', label: 'UI/Design Problem' },
  { value: 'functionality', label: 'Funktionalität funktioniert nicht' },
  { value: 'performance', label: 'Performance/Langsam' },
  { value: 'data', label: 'Datenproblem/Verlust' },
  { value: 'crash', label: 'App Absturz/Fehler' },
  { value: 'other', label: 'Sonstiges' }
];

export const BugReportDialog = ({ trigger }: BugReportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Bitte melde dich an');
      return;
    }

    if (!category || !description.trim()) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user.id,
          category,
          description: description.trim(),
        });

      if (error) throw error;

      toast.success('Bug-Report erfolgreich gesendet! Vielen Dank für dein Feedback.');
      
      // Reset form
      setCategory('');
      setDescription('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error submitting bug report:', error);
      toast.error('Fehler beim Senden des Bug-Reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCategory('');
    setDescription('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start">
            <Bug className="h-4 w-4 mr-2" />
            Bug melden
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Bug melden
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hilf uns dabei, die App zu verbessern! Beschreibe das Problem, damit wir es schnell beheben können.
          </p>

          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Kategorie *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Wähle eine Kategorie aus" />
              </SelectTrigger>
              <SelectContent>
                {BUG_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Beschreibung des Problems *
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe das Problem so detailliert wie möglich:&#10;- Was ist passiert?&#10;- Was hast du erwartet?&#10;- Wann tritt es auf?&#10;- Welche Schritte führen zum Problem?"
              className="mt-1"
              rows={6}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              💡 <strong>Tipp:</strong> Je detaillierter deine Beschreibung, desto schneller können wir das Problem beheben!
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                handleReset();
                setIsOpen(false);
              }}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!category || !description.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Senden...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Bug melden
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};