import React, { useState } from 'react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent } from './ui/card';
import { Clock, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupplementRecommendation {
  name: string;
  dosage: string;
  unit: string;
  timing: string;
  goal?: string;
  notes?: string;
}

interface InlineSupplementListProps {
  recommendations: SupplementRecommendation[];
  title?: string;
  onConfirm?: () => void;
}

const timingLabels: { [key: string]: string } = {
  'morning': 'Morgens',
  'noon': 'Mittags', 
  'evening': 'Abends',
  'pre_workout': 'Vor dem Training',
  'post_workout': 'Nach dem Training',
  'before_bed': 'Vor dem Schlafengehen'
};

export const InlineSupplementList: React.FC<InlineSupplementListProps> = ({
  recommendations,
  title = "Supplement-Plan",
  onConfirm
}) => {
  const { user } = useAuth();
  const [selectedSupplements, setSelectedSupplements] = useState<boolean[]>(
    new Array(recommendations.length).fill(true)
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckboxChange = (index: number, checked: boolean) => {
    const newSelected = [...selectedSupplements];
    newSelected[index] = checked;
    setSelectedSupplements(newSelected);
  };

  const handleConfirm = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const selectedItems = recommendations.filter((_, index) => selectedSupplements[index]);
      
      if (selectedItems.length === 0) {
        toast.error('Bitte wähle mindestens ein Supplement aus');
        return;
      }

      // Add selected supplements to user's supplement list
      const supplementsToAdd = selectedItems.map(item => ({
        user_id: user.id,
        custom_name: item.name,
        dosage: item.dosage,
        unit: item.unit,
        timing: [item.timing],
        goal: item.goal || null,
        notes: item.notes || null,
        is_active: true,
        frequency_days: 1 // Daily by default
      }));

      const { error } = await supabase
        .from('user_supplements')
        .insert(supplementsToAdd);

      if (error) throw error;

      // Trigger unified event to refresh supplement list
      window.dispatchEvent(new CustomEvent('supplement-stack-changed'));
      
      toast.success(`${selectedItems.length} Supplement(e) zu deinem Plan hinzugefügt!`);
      onConfirm?.();
    } catch (error) {
      console.error('Error adding supplements:', error);
      toast.error('Fehler beim Hinzufügen der Supplements');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = selectedSupplements.filter(Boolean).length;

  return (
    <Card className="w-full max-w-full bg-muted/50 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recommendations.map((supplement, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-2 rounded-lg bg-background/60 border border-border/50"
            >
              <Checkbox
                checked={selectedSupplements[index]}
                onCheckedChange={(checked) => handleCheckboxChange(index, checked as boolean)}
                className="shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{supplement.name}</div>
                <div className="text-xs text-muted-foreground">
                  {supplement.dosage} {supplement.unit}
                </div>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {timingLabels[supplement.timing] || supplement.timing}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {selectedCount} von {recommendations.length} ausgewählt
          </span>
          
          <Button 
            onClick={handleConfirm}
            disabled={isLoading || selectedCount === 0}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? 'Wird hinzugefügt...' : `${selectedCount} bestätigen`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};