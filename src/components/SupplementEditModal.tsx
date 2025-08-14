import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Save, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UserSupplement, TIMING_OPTIONS } from '@/hooks/useSupplementData';

interface SupplementEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  timing: string;
  supplements: UserSupplement[];
  onUpdate: () => void;
}

const timingOptions = [
  { value: 'morning', label: 'Morgens' },
  { value: 'noon', label: 'Mittags' },
  { value: 'evening', label: 'Abends' },
  { value: 'pre_workout', label: 'Vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training' },
  { value: 'before_bed', label: 'Vor dem Schlafengehen' }
];

export const SupplementEditModal: React.FC<SupplementEditModalProps> = ({
  isOpen,
  onClose,
  timing,
  supplements,
  onUpdate
}) => {
  const { user } = useAuth();
  const [editedSupplements, setEditedSupplements] = useState<UserSupplement[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditedSupplements([...supplements]);
    }
  }, [isOpen, supplements]);

  const timingOption = TIMING_OPTIONS.find(opt => opt.value === timing);
  const timingLabel = timingOption?.label || timing;

  const updateSupplement = (index: number, field: keyof UserSupplement, value: any) => {
    setEditedSupplements(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const deleteSupplement = async (supplementId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_supplements')
        .update({ is_active: false })
        .eq('id', supplementId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEditedSupplements(prev => prev.filter(s => s.id !== supplementId));
      toast.success('Supplement entfernt');
    } catch (error) {
      console.error('Error deleting supplement:', error);
      toast.error('Fehler beim Entfernen');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      for (const supplement of editedSupplements) {
        const { error } = await supabase
          .from('user_supplements')
          .update({
            custom_name: supplement.custom_name,
            dosage: supplement.dosage,
            unit: supplement.unit,
            timing: supplement.timing,
            goal: supplement.goal,
            notes: supplement.notes
          })
          .eq('id', supplement.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      toast.success('Supplements aktualisiert');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating supplements:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTiming = (supplementIndex: number, timingValue: string) => {
    const supplement = editedSupplements[supplementIndex];
    const currentTimings = Array.isArray(supplement.timing) ? supplement.timing : [supplement.timing];
    
    const newTimings = currentTimings.includes(timingValue)
      ? currentTimings.filter(t => t !== timingValue)
      : [...currentTimings, timingValue];
    
    updateSupplement(supplementIndex, 'timing', newTimings);
  };

  const getTimingLabel = (timing: string): string => {
    const option = timingOptions.find(opt => opt.value === timing);
    return option ? option.label : timing;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Supplements bearbeiten - {timingLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {editedSupplements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Keine Supplements für diese Kategorie gefunden.
            </p>
          ) : (
            editedSupplements.map((supplement, index) => (
              <div key={supplement.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {supplement.supplement_name || supplement.custom_name || 'Unbekanntes Supplement'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSupplement(supplement.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={supplement.custom_name || supplement.supplement_name || ''}
                      onChange={(e) => updateSupplement(index, 'custom_name', e.target.value)}
                      placeholder="Supplement Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dosierung</Label>
                    <Input
                      value={supplement.dosage || ''}
                      onChange={(e) => updateSupplement(index, 'dosage', e.target.value)}
                      placeholder="z.B. 1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Einheit</Label>
                    <Select 
                      value={supplement.unit || 'mg'} 
                      onValueChange={(value) => updateSupplement(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mg">mg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="mcg">mcg</SelectItem>
                        <SelectItem value="IU">IU</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="Stück">Stück</SelectItem>
                        <SelectItem value="Tabletten">Tabletten</SelectItem>
                        <SelectItem value="Kapseln">Kapseln</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ziel</Label>
                    <Input
                      value={supplement.goal || ''}
                      onChange={(e) => updateSupplement(index, 'goal', e.target.value)}
                      placeholder="z.B. Immunsystem stärken"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Einnahmezeiten</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {timingOptions.map((timingOpt) => (
                      <div key={timingOpt.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${supplement.id}-${timingOpt.value}`}
                          checked={Array.isArray(supplement.timing) 
                            ? supplement.timing.includes(timingOpt.value)
                            : supplement.timing === timingOpt.value
                          }
                          onCheckedChange={() => toggleTiming(index, timingOpt.value)}
                        />
                        <Label htmlFor={`${supplement.id}-${timingOpt.value}`} className="text-sm">
                          {timingOpt.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {supplement.timing && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Array.isArray(supplement.timing) ? supplement.timing : [supplement.timing]).map((timing) => (
                        <Badge key={timing} variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimingLabel(timing)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notizen</Label>
                  <Input
                    value={supplement.notes || ''}
                    onChange={(e) => updateSupplement(index, 'notes', e.target.value)}
                    placeholder="Besonderheiten, Nebenwirkungen..."
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};