import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pill, Plus, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupplementOption {
  id: string;
  name: string;
  category: string;
  default_dosage: string;
  default_unit: string;
  common_timing: string[];
  description: string;
}

interface SupplementTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    profileData?: any;
    currentSupplements?: any[];
    recommendations?: string[];
    compliance?: number;
  };
}

const timingOptions = [
  { value: 'morning', label: 'Morgens' },
  { value: 'noon', label: 'Mittags' },
  { value: 'evening', label: 'Abends' },
  { value: 'pre_workout', label: 'Vor dem Training' },
  { value: 'post_workout', label: 'Nach dem Training' },
  { value: 'before_bed', label: 'Vor dem Schlafengehen' }
];

export const SupplementTrackingModal = ({ isOpen, onClose, contextData }: SupplementTrackingModalProps) => {
  const [supplements, setSupplements] = useState<SupplementOption[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('mg');
  const [selectedTimings, setSelectedTimings] = useState<string[]>([]);
  const [goal, setGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      loadSupplements();
    }
  }, [isOpen]);

  // Pre-fill with context recommendations
  useEffect(() => {
    if (contextData?.recommendations && contextData.recommendations.length > 0) {
      const firstRecommendation = contextData.recommendations[0];
      setCustomName(firstRecommendation);
      setShowCustomForm(true);
    }
  }, [contextData]);

  const loadSupplements = async () => {
    try {
      const { data, error } = await supabase
        .from('supplement_database')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSupplements(data || []);
    } catch (error) {
      console.error('Error loading supplements:', error);
      toast.error('Fehler beim Laden der Supplement-Datenbank');
    }
  };

  const handleSupplementSelect = (value: string) => {
    if (value === 'custom') {
      setShowCustomForm(true);
      setSelectedSupplement('');
      return;
    }

    setSelectedSupplement(value);
    setShowCustomForm(false);
    
    const supplement = supplements.find(s => s.id === value);
    if (supplement) {
      setDosage(supplement.default_dosage);
      setUnit(supplement.default_unit);
      setSelectedTimings(supplement.common_timing);
    }
  };

  const toggleTiming = (timing: string) => {
    setSelectedTimings(prev => 
      prev.includes(timing) 
        ? prev.filter(t => t !== timing)
        : [...prev, timing]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!selectedSupplement && !customName) || !dosage || selectedTimings.length === 0) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    setIsSubmitting(true);

    try {
      const supplementData = {
        user_id: user.id,
        supplement_id: selectedSupplement || null,
        custom_name: selectedSupplement ? null : customName,
        dosage,
        unit,
        timing: selectedTimings,
        goal: goal || null,
        notes: notes || null
      };

      const { error } = await supabase
        .from('user_supplements')
        .insert([supplementData]);

      if (error) throw error;

      toast.success('Supplement erfolgreich hinzugefügt');
      onClose();
      
    } catch (error) {
      console.error('Error adding supplement:', error);
      toast.error('Fehler beim Hinzufügen des Supplements');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimingLabel = (timing: string): string => {
    const option = timingOptions.find(opt => opt.value === timing);
    return option ? option.label : timing;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Supplement hinzufügen
          </DialogTitle>
        </DialogHeader>

        {/* Context Summary */}
        {contextData && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="text-sm space-y-2">
              {contextData.compliance !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Aktuelle Compliance: <span className="font-semibold">{contextData.compliance}%</span></span>
                </div>
              )}
              {contextData.currentSupplements && contextData.currentSupplements.length > 0 && (
                <p>Aktuelle Supplements: <span className="font-semibold">{contextData.currentSupplements.length}</span></p>
              )}
              {contextData.recommendations && contextData.recommendations.length > 0 && (
                <div>
                  <p className="font-semibold text-primary">Coach-Empfehlungen:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contextData.recommendations.map((rec, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {rec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!showCustomForm ? (
            <div className="space-y-2">
              <Label>Supplement auswählen</Label>
              <Select value={selectedSupplement} onValueChange={handleSupplementSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Supplement aus Datenbank wählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Eigenes Supplement hinzufügen
                    </div>
                  </SelectItem>
                  {supplements.map((supplement) => (
                    <SelectItem key={supplement.id} value={supplement.id}>
                      <div>
                        <div className="font-medium">{supplement.name}</div>
                        <div className="text-xs text-muted-foreground">{supplement.category}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="customName">Supplement Name *</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="z.B. Vitamin D3, Omega-3, etc."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomName('');
                }}
                className="text-sm"
              >
                ← Zurück zur Datenbank
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">Dosierung *</Label>
              <Input
                id="dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="z.B. 1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Einheit</Label>
              <Select value={unit} onValueChange={setUnit}>
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
          </div>

          <div className="space-y-2">
            <Label>Einnahmezeiten * (mindestens eine auswählen)</Label>
            <div className="grid grid-cols-2 gap-2">
              {timingOptions.map((timing) => (
                <div key={timing.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={timing.value}
                    checked={selectedTimings.includes(timing.value)}
                    onCheckedChange={() => toggleTiming(timing.value)}
                  />
                  <Label htmlFor={timing.value} className="text-sm">
                    {timing.label}
                  </Label>
                </div>
              ))}
            </div>
            {selectedTimings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTimings.map((timing) => (
                  <Badge key={timing} variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimingLabel(timing)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Ziel (optional)</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="z.B. Immunsystem stärken, Muskelaufbau..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Besonderheiten, Nebenwirkungen, etc."
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!selectedSupplement && !customName) || !dosage || selectedTimings.length === 0}
              className="flex-1"
            >
              {isSubmitting ? 'Hinzufügen...' : 'Supplement hinzufügen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};