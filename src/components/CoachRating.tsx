import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CoachRatingProps {
  coachId: string;
  coachName: string;
  trigger?: React.ReactNode;
  onRatingChanged?: () => void;
}

interface Rating {
  id: string;
  rating: number;
  comment?: string;
}

export const CoachRating = ({ coachId, coachName, trigger, onRatingChanged }: CoachRatingProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user && isOpen) {
      loadExistingRating();
    }
  }, [user, isOpen, coachId]);

  const loadExistingRating = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('coach_ratings')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', coachId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading rating:', error);
        return;
      }

      if (data) {
        setExistingRating(data);
        setRating(data.rating);
        setComment(data.comment || '');
      }
    } catch (error) {
      console.error('Error loading rating:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error('Bitte wähle eine Bewertung aus');
      return;
    }

    setIsSubmitting(true);
    try {
      const ratingData = {
        user_id: user.id,
        coach_id: coachId,
        rating,
        comment: comment.trim() || null
      };

      const { error } = await supabase
        .from('coach_ratings')
        .upsert(ratingData, { onConflict: 'user_id,coach_id' });

      if (error) throw error;

      toast.success('Bewertung erfolgreich gespeichert!');
      setIsOpen(false);
      onRatingChanged?.();
    } catch (error: any) {
      console.error('Error saving rating:', error);
      toast.error('Fehler beim Speichern der Bewertung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarIcon = ({ filled, hoverable, onClick, onMouseEnter, onMouseLeave }: {
    filled: boolean;
    hoverable?: boolean;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }) => (
    <Star
      className={`h-5 w-5 transition-colors cursor-pointer ${
        filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
      } ${hoverable ? 'hover:text-yellow-400 hover:fill-yellow-400' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4 mr-1" />
            Bewerten
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingRating ? 'Bewertung bearbeiten' : 'Coach bewerten'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Wie findest du {coachName}?
            </p>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  filled={star <= (hoveredRating || rating)}
                  hoverable
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                />
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground">
                {rating === 1 && 'Sehr schlecht'}
                {rating === 2 && 'Schlecht'}
                {rating === 3 && 'Okay'}
                {rating === 4 && 'Gut'}
                {rating === 5 && 'Sehr gut'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="comment" className="text-sm font-medium">
              Kommentar (optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Was hat dir besonders gefallen oder was könnte besser sein?"
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Speichern...' : 'Bewertung speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Compact rating display for coach cards
interface CoachRatingDisplayProps {
  coachId: string;
  showCount?: boolean;
  className?: string;
}

export const CoachRatingDisplay = ({ coachId, showCount = true, className = '' }: CoachRatingDisplayProps) => {
  const [averageRating, setAverageRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);

  useEffect(() => {
    loadRatingStats();
  }, [coachId]);

  const loadRatingStats = async () => {
    try {
      const { data, error } = await supabase
        .from('coach_ratings')
        .select('rating')
        .eq('coach_id', coachId);

      if (error) throw error;

      if (data && data.length > 0) {
        const total = data.reduce((sum, item) => sum + item.rating, 0);
        setAverageRating(total / data.length);
        setRatingCount(data.length);
      }
    } catch (error) {
      console.error('Error loading rating stats:', error);
    }
  };

  if (ratingCount === 0) {
    return (
      <div className={`flex items-center gap-1 text-gray-400 ${className}`}>
        <Star className="h-4 w-4" />
        <span className="text-sm">Keine Bewertungen</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(averageRating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {averageRating.toFixed(1)}
        {showCount && ` (${ratingCount})`}
      </span>
    </div>
  );
};