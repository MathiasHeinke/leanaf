// Bloodwork Entry Form
// Categorized form for entering new bloodwork results

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { MarkerInput } from './MarkerInput';
import { MARKER_CATEGORIES, MARKER_DISPLAY_NAMES, BloodworkEntry as BloodworkEntryType, ReferenceRange } from './types';
import { useBloodwork } from '@/hooks/useBloodwork';
import { Syringe, Activity, Flame, Heart, Pill, Droplet, Stethoscope, Save, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BloodworkEntryProps {
  onSubmit?: (entry: Partial<BloodworkEntryType>) => Promise<boolean>;
  onSuccess?: () => void;
  existingEntry?: BloodworkEntryType;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  hormones: Syringe,
  thyroid: Activity,
  metabolic: Flame,
  lipids: Heart,
  vitamins: Pill,
  blood: Droplet,
  organs: Stethoscope
};

export function BloodworkEntry({ onSubmit, onSuccess, existingEntry }: BloodworkEntryProps) {
  const { referenceRanges, evaluateMarker, userGender, createEntry } = useBloodwork();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [testDate, setTestDate] = useState(existingEntry?.test_date || new Date().toISOString().split('T')[0]);
  const [labName, setLabName] = useState(existingEntry?.lab_name || '');
  const [isFasted, setIsFasted] = useState(existingEntry?.is_fasted || false);
  const [notes, setNotes] = useState(existingEntry?.notes || '');
  const [markerValues, setMarkerValues] = useState<Record<string, string>>(() => {
    if (existingEntry) {
      const values: Record<string, string> = {};
      Object.entries(existingEntry).forEach(([key, value]) => {
        if (typeof value === 'number' && !isNaN(value)) {
          values[key] = value.toString();
        }
      });
      return values;
    }
    return {};
  });

  // Count filled markers per category
  const filledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(MARKER_CATEGORIES).forEach(([catKey, cat]) => {
      counts[catKey] = cat.markers.filter(m => 
        markerValues[m] && markerValues[m].trim() !== ''
      ).length;
    });
    return counts;
  }, [markerValues]);

  const totalFilled = Object.values(filledCounts).reduce((a, b) => a + b, 0);

  // Handle marker value change
  const handleMarkerChange = (markerKey: string, value: string) => {
    setMarkerValues(prev => ({
      ...prev,
      [markerKey]: value
    }));
  };

  // Get live evaluation for a marker
  const getMarkerEvaluation = (markerKey: string) => {
    const value = markerValues[markerKey];
    if (!value || value.trim() === '') return null;
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue)) return null;
    return evaluateMarker(markerKey, numValue, userGender);
  };

  // Handle form submit
  const handleSubmit = async () => {
    if (totalFilled === 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const entryData: Partial<BloodworkEntryType> = {
        test_date: testDate,
        lab_name: labName || null,
        is_fasted: isFasted,
        notes: notes || null
      };

      // Add marker values
      Object.entries(markerValues).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          const numValue = parseFloat(value.replace(',', '.'));
          if (!isNaN(numValue)) {
            entryData[key] = numValue;
          }
        }
      });

      const submitFn = onSubmit || createEntry;
      const success = await submitFn(entryData);
      
      if (success) {
        // Reset form
        setMarkerValues({});
        setTestDate(new Date().toISOString().split('T')[0]);
        setLabName('');
        setIsFasted(false);
        setNotes('');
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="h-5 w-5 text-primary" />
          {existingEntry ? 'Blutwerte bearbeiten' : 'Neuer Bluttest'}
        </CardTitle>
        <CardDescription>
          Trage deine Laborergebnisse ein. Nur ausgefüllte Werte werden gespeichert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meta data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test_date" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Testdatum
            </Label>
            <Input
              id="test_date"
              type="date"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab_name">Labor</Label>
            <Input
              id="lab_name"
              placeholder="z.B. MVZ Berlin"
              value={labName}
              onChange={e => setLabName(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_fasted"
                checked={isFasted}
                onCheckedChange={(checked) => setIsFasted(checked === true)}
              />
              <Label htmlFor="is_fasted" className="cursor-pointer">
                Nüchtern-Blutabnahme
              </Label>
            </div>
          </div>
        </div>

        {/* Marker categories accordion */}
        <Accordion type="multiple" defaultValue={['hormones']} className="w-full">
          {Object.entries(MARKER_CATEGORIES).map(([catKey, category]) => {
            const Icon = CATEGORY_ICONS[catKey] || Activity;
            const filledCount = filledCounts[catKey];
            
            return (
              <AccordionItem key={catKey} value={catKey}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{category.label}</span>
                    <Badge 
                      variant={filledCount > 0 ? 'default' : 'outline'}
                      className={cn(
                        'ml-auto mr-2',
                        filledCount > 0 && 'bg-primary/20 text-primary border-primary/30'
                      )}
                    >
                      {filledCount}/{category.markers.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {category.markers.map(markerKey => (
                      <MarkerInput
                        key={markerKey}
                        markerKey={markerKey}
                        value={markerValues[markerKey] || ''}
                        onChange={(value) => handleMarkerChange(markerKey, value)}
                        referenceRange={referenceRanges.get(markerKey)}
                        evaluation={getMarkerEvaluation(markerKey)}
                        gender={userGender}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notizen</Label>
          <Textarea
            id="notes"
            placeholder="Zusätzliche Informationen, z.B. Medikamente, Besonderheiten..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalFilled} Marker ausgefüllt
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || totalFilled === 0}
            size="lg"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Blutwerte speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
