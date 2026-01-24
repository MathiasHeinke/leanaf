import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBioAge } from "@/hooks/useBioAge";
import { Sparkles, AlertCircle } from "lucide-react";

interface AddDunedinPaceFormProps {
  chronologicalAge: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const TEST_PROVIDERS = [
  { id: 'trudiagnostic', name: 'TruDiagnostic', description: 'TruAge Complete' },
  { id: 'elysium', name: 'Elysium Health', description: 'Index by Elysium' },
  { id: 'other', name: 'Anderer Anbieter', description: '' },
];

export function AddDunedinPaceForm({ chronologicalAge, onSuccess, onCancel }: AddDunedinPaceFormProps) {
  const { addDunedinPaceMeasurement, dunedinPaceToBioAge } = useBioAge();
  const [paceScore, setPaceScore] = useState('');
  const [provider, setProvider] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedScore = parseFloat(paceScore) || 0;
  const isValidScore = parsedScore >= 0.4 && parsedScore <= 1.4;
  const previewBioAge = isValidScore ? dunedinPaceToBioAge(parsedScore, chronologicalAge) : null;

  const handleSubmit = async () => {
    if (!isValidScore) return;

    setIsSubmitting(true);
    try {
      const success = await addDunedinPaceMeasurement(
        parsedScore,
        chronologicalAge,
        provider || undefined,
        reportUrl || undefined,
        notes || undefined
      );
      if (success) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          DunedinPACE Ergebnis hinzufügen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Input */}
        <div className="space-y-2">
          <Label htmlFor="pace-score">DunedinPACE Score</Label>
          <div className="flex items-center gap-2">
            <Input
              id="pace-score"
              type="number"
              step="0.01"
              min="0.4"
              max="1.4"
              value={paceScore}
              onChange={(e) => setPaceScore(e.target.value)}
              placeholder="z.B. 0.72"
              className="text-2xl font-mono text-center"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Gültiger Bereich: 0.40 - 1.40 (Durchschnitt: ~0.95)
          </p>
          {!isValidScore && paceScore && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="w-3 h-3" />
              Ungültiger Score. Muss zwischen 0.40 und 1.40 liegen.
            </div>
          )}
        </div>

        {/* Preview */}
        {previewBioAge !== null && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground">Berechnetes Bio-Age:</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{previewBioAge} Jahre</span>
              <span className={`text-sm font-medium ${previewBioAge - chronologicalAge < 0 ? 'text-green-600' : 'text-red-600'}`}>
                ({previewBioAge - chronologicalAge > 0 ? '+' : ''}{previewBioAge - chronologicalAge} vs. chronologisch)
              </span>
            </div>
          </div>
        )}

        {/* Provider */}
        <div className="space-y-2">
          <Label>Test-Anbieter</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Anbieter auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {TEST_PROVIDERS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.description && <span className="text-muted-foreground ml-1">({p.description})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Report URL (optional) */}
        <div className="space-y-2">
          <Label htmlFor="report-url">Report-URL (optional)</Label>
          <Input
            id="report-url"
            value={reportUrl}
            onChange={(e) => setReportUrl(e.target.value)}
            placeholder="https://..."
            type="url"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notizen (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="z.B. Fasten-Status, Besonderheiten..."
            rows={2}
          />
        </div>

        {/* Info */}
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm">
          <p className="font-medium text-purple-800 dark:text-purple-300">Was ist DunedinPACE?</p>
          <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
            DunedinPACE misst die Geschwindigkeit des Alterns basierend auf epigenetischen Markern.
            Ein Score von 1.0 = durchschnittliche Alterungsrate.
            Unter 0.65 = Elite (top 0.1%).
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button onClick={handleSubmit} disabled={!isValidScore || isSubmitting}>
          {isSubmitting ? "Speichere..." : "Ergebnis speichern"}
        </Button>
      </CardFooter>
    </Card>
  );
}
