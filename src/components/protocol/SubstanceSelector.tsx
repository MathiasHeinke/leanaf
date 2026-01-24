import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SubstanceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const PHASE_1_SUBSTANCES = [
  {
    id: 'retatrutid',
    name: 'Retatrutid',
    category: 'metabolic',
    description: 'Triple-Agonist (GLP-1/GIP/Glukagon) - Hauptfettverbrenner',
    defaultDose: 0.5,
    defaultUnit: 'mg',
    defaultTiming: 'weekly',
    hasTitration: true,
  },
  {
    id: 'cjc_1295_ipamorelin',
    name: 'CJC-1295/Ipamorelin',
    category: 'peptide',
    description: 'GH-Sekretagoga - Muskelschutz & Regeneration',
    defaultDose: 100,
    defaultUnit: 'mcg',
    defaultTiming: 'evening_fasted',
    hasTitration: false,
  },
  {
    id: 'bpc_157',
    name: 'BPC-157',
    category: 'peptide',
    description: 'Reparatur-Peptid - Darmschutz & Heilung',
    defaultDose: 250,
    defaultUnit: 'mcg',
    defaultTiming: 'twice_daily',
    hasTitration: false,
  },
  {
    id: 'tb_500',
    name: 'TB-500',
    category: 'peptide',
    description: 'Thymosin Beta-4 - Geweberegeneration',
    defaultDose: 2,
    defaultUnit: 'mg',
    defaultTiming: 'twice_weekly',
    hasTitration: false,
  },
  {
    id: 'trt',
    name: 'TRT (Testosteron)',
    category: 'hormone',
    description: 'Anaboler Schutzschild - Muskelerhalt',
    defaultDose: 100,
    defaultUnit: 'mg',
    defaultTiming: 'weekly',
    hasTitration: false,
  },
] as const;

export function SubstanceSelector({ value, onChange }: SubstanceSelectorProps) {
  const selectedSubstance = PHASE_1_SUBSTANCES.find(s => s.id === value);

  return (
    <div className="space-y-2">
      <Label>Substanz auswählen</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Substanz wählen..." />
        </SelectTrigger>
        <SelectContent>
          {PHASE_1_SUBSTANCES.map((substance) => (
            <SelectItem key={substance.id} value={substance.id}>
              <div className="flex flex-col">
                <span className="font-medium">{substance.name}</span>
                <span className="text-xs text-muted-foreground">{substance.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedSubstance && (
        <p className="text-sm text-muted-foreground">
          Standard: {selectedSubstance.defaultDose}{selectedSubstance.defaultUnit} - {selectedSubstance.defaultTiming}
        </p>
      )}
    </div>
  );
}
