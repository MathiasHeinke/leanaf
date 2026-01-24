import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRetaMicro, RetaMicroLog, getSiteLabel } from "@/hooks/useRetaMicro";
import { parseLocaleFloat } from "@/utils/localeNumberHelpers";
import { Loader2, AlertTriangle } from "lucide-react";

interface RetaMicroLogFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type InjectionSite = RetaMicroLog['injection_site'];

const INJECTION_SITES: { id: InjectionSite; label: string }[] = [
  { id: 'abdomen', label: 'Bauch' },
  { id: 'thigh_left', label: 'Oberschenkel links' },
  { id: 'thigh_right', label: 'Oberschenkel rechts' },
  { id: 'arm_left', label: 'Oberarm links' },
  { id: 'arm_right', label: 'Oberarm rechts' },
];

const GI_SIDE_EFFECTS = [
  { id: 'nausea', label: 'Übelkeit' },
  { id: 'diarrhea', label: 'Durchfall' },
  { id: 'bloating', label: 'Blähungen' },
  { id: 'constipation', label: 'Verstopfung' },
  { id: 'heartburn', label: 'Sodbrennen' },
  { id: 'vomiting', label: 'Erbrechen' },
];

export function RetaMicroLogForm({ onSuccess, onCancel }: RetaMicroLogFormProps) {
  const { logDose, getInjectionSiteRotation } = useRetaMicro();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [doseMg, setDoseMg] = useState('0.5');
  const [injectionSite, setInjectionSite] = useState<InjectionSite | ''>('');
  const [appetiteScore, setAppetiteScore] = useState(5);
  const [satietyHours, setSatietyHours] = useState('');
  const [selectedSideEffects, setSelectedSideEffects] = useState<string[]>([]);
  const [giSeverity, setGiSeverity] = useState(1);
  const [notes, setNotes] = useState('');

  const recentSites = getInjectionSiteRotation();
  const suggestedSite = INJECTION_SITES.find(s => !recentSites.includes(s.id))?.id;

  const parsedDose = parseLocaleFloat(doseMg);
  const isValid = !isNaN(parsedDose) && parsedDose > 0 && injectionSite;

  const handleSideEffectToggle = (effectId: string, checked: boolean) => {
    setSelectedSideEffects(prev =>
      checked ? [...prev, effectId] : prev.filter(e => e !== effectId)
    );
  };

  const handleSubmit = async () => {
    if (!isValid || !injectionSite) return;

    setIsSubmitting(true);
    try {
      await logDose({
        dose_mg: parsedDose,
        injection_site: injectionSite as InjectionSite,
        appetite_score: appetiteScore,
        satiety_duration_hours: satietyHours ? parseLocaleFloat(satietyHours) : undefined,
        gi_side_effects: selectedSideEffects.length > 0 ? selectedSideEffects : undefined,
        gi_severity: selectedSideEffects.length > 0 ? giSeverity : undefined,
        notes: notes || undefined,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Reta Micro Dosis loggen</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Dose */}
        <div className="space-y-2">
          <Label>Dosis (mg) *</Label>
          <NumericInput
            value={doseMg}
            onChange={setDoseMg}
            placeholder="0.5"
            min={0.1}
            max={5}
          />
          <p className="text-xs text-muted-foreground">
            Empfohlen: 0.5-1mg für Microdosing
          </p>
        </div>

        {/* Injection Site */}
        <div className="space-y-2">
          <Label>Injektionsstelle *</Label>
          <Select value={injectionSite} onValueChange={(v) => setInjectionSite(v as InjectionSite)}>
            <SelectTrigger>
              <SelectValue placeholder="Stelle wählen" />
            </SelectTrigger>
            <SelectContent>
              {INJECTION_SITES.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.label}
                  {recentSites.includes(site.id) && (
                    <span className="ml-2 text-xs text-muted-foreground">(kürzlich)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestedSite && (
            <p className="text-xs text-muted-foreground">
              Vorschlag zur Rotation: <strong>{getSiteLabel(suggestedSite)}</strong>
            </p>
          )}
        </div>

        {/* Appetite Score */}
        <div className="space-y-2">
          <Label>Appetit-Level (1-10)</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[appetiteScore]}
              onValueChange={([v]) => setAppetiteScore(v)}
              min={1}
              max={10}
              step={1}
              className="flex-1"
            />
            <span className="w-8 text-center font-medium">{appetiteScore}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            1 = Kein Appetit, 10 = Sehr hungrig
          </p>
        </div>

        {/* Satiety Duration */}
        <div className="space-y-2">
          <Label>Sättigungsdauer (Stunden)</Label>
          <NumericInput
            value={satietyHours}
            onChange={setSatietyHours}
            placeholder="z.B. 8"
            min={0}
            max={72}
          />
        </div>

        {/* GI Side Effects */}
        <div className="space-y-2">
          <Label>GI-Nebenwirkungen</Label>
          <div className="grid grid-cols-2 gap-2">
            {GI_SIDE_EFFECTS.map((effect) => (
              <div key={effect.id} className="flex items-center space-x-2">
                <Checkbox
                  id={effect.id}
                  checked={selectedSideEffects.includes(effect.id)}
                  onCheckedChange={(checked) => handleSideEffectToggle(effect.id, !!checked)}
                />
                <label htmlFor={effect.id} className="text-sm">
                  {effect.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* GI Severity - only show if side effects selected */}
        {selectedSideEffects.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-amber-500/10">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Schweregrad (1-5)
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[giSeverity]}
                onValueChange={([v]) => setGiSeverity(v)}
                min={1}
                max={5}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-center font-medium">{giSeverity}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              1 = Leicht, 5 = Schwer
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notizen</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Weitere Beobachtungen..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}
