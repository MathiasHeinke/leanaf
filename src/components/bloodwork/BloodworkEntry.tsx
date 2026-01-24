// Bloodwork Entry Form
// Categorized form for entering new bloodwork results with OCR upload support

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { MarkerInput } from './MarkerInput';
import { BloodworkUpload, ExtractedBloodwork } from './BloodworkUpload';
import { MARKER_CATEGORIES, MARKER_DISPLAY_NAMES, BloodworkEntry as BloodworkEntryType, ReferenceRange } from './types';
import { useBloodwork } from '@/hooks/useBloodwork';
import { Syringe, Activity, Flame, Heart, Pill, Droplet, Stethoscope, Save, Loader2, Calendar, Upload, CheckCircle, AlertTriangle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  // OCR mode state
  const [showUpload, setShowUpload] = useState(!existingEntry);
  const [extractedData, setExtractedData] = useState<ExtractedBloodwork | null>(null);

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

  // Handle extracted OCR data
  const handleExtracted = (data: ExtractedBloodwork) => {
    console.log('[BloodworkEntry] OCR data received:', data);
    
    // Apply metadata
    if (data.lab_name) setLabName(data.lab_name);
    if (data.test_date) setTestDate(data.test_date);
    if (data.is_fasted !== undefined) setIsFasted(data.is_fasted);

    // Apply marker values (convert to German decimal format)
    const newValues: Record<string, string> = {};
    Object.entries(data.markers || {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        // Convert to string with comma as decimal separator for display
        newValues[key] = value.toString().replace('.', ',');
      }
    });
    setMarkerValues(newValues);

    setExtractedData(data);
    setShowUpload(false);

    const markerCount = Object.keys(newValues).length;
    toast.success(
      `${markerCount} Werte per OCR erkannt!`, 
      { 
        description: "Bitte kontrolliere alle Werte vor dem Speichern.",
        duration: 5000 
      }
    );
  };

  const handleExtractError = (error: string) => {
    console.error('[BloodworkEntry] OCR error:', error);
    // Stay on upload view, error toast is shown by BloodworkUpload
  };

  const resetToUpload = () => {
    setExtractedData(null);
    setShowUpload(true);
    setMarkerValues({});
    setLabName('');
    setTestDate(new Date().toISOString().split('T')[0]);
    setIsFasted(false);
    setNotes('');
  };

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
        setExtractedData(null);
        setShowUpload(true);
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
          {showUpload && !extractedData
            ? 'Lade deinen Laborbericht hoch oder gib die Werte manuell ein.'
            : 'Trage deine Laborergebnisse ein. Nur ausgefüllte Werte werden gespeichert.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OCR Success Alert */}
        {extractedData && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-400">
              {Object.keys(extractedData.markers || {}).filter(k => extractedData.markers[k] != null).length} Werte erkannt
            </AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-300">
              Konfidenz: {Math.round(extractedData.confidence * 100)}% — Bitte alle Werte kontrollieren!
              {extractedData.notes && (
                <span className="block mt-1 text-sm opacity-80">{extractedData.notes}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Unrecognized markers warning */}
        {extractedData?.unrecognized && extractedData.unrecognized.length > 0 && (
          <Alert variant="default" className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-400">
              {extractedData.unrecognized.length} nicht zugeordnete Werte
            </AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              <ul className="list-disc list-inside mt-1 text-sm">
                {extractedData.unrecognized.slice(0, 5).map((item, i) => (
                  <li key={i}>
                    {item.name}: {item.value}{item.unit ? ` ${item.unit}` : ''}
                  </li>
                ))}
                {extractedData.unrecognized.length > 5 && (
                  <li>...und {extractedData.unrecognized.length - 5} weitere</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Zone OR Form */}
        {showUpload && !extractedData ? (
          <div className="space-y-4">
            <BloodworkUpload 
              onExtracted={handleExtracted}
              onError={handleExtractError}
            />
            
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground px-2">oder</span>
              <Separator className="flex-1" />
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowUpload(false)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Manuell eingeben
            </Button>
          </div>
        ) : (
          <>
            {/* Back to upload button when form is shown */}
            {!existingEntry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToUpload}
                className="mb-2 -mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                {extractedData ? 'Neuen Bericht hochladen' : 'Bericht hochladen statt manuell'}
              </Button>
            )}

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
            <Accordion 
              type="multiple" 
              defaultValue={extractedData ? Object.keys(MARKER_CATEGORIES) : ['hormones']} 
              className="w-full"
            >
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
                {extractedData && (
                  <span className="ml-2 text-green-600">
                    (via OCR)
                  </span>
                )}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
