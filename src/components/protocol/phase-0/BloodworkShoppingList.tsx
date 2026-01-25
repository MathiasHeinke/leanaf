import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Package, 
  Target, 
  XCircle, 
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShoppingListMarker {
  key: string;
  label: string;
  purpose: string;
  why: string;
  isPresent?: boolean;
}

interface BloodworkShoppingListProps {
  presentMarkers?: string[];
}

// Base package markers (included in Gesamtprofil XL)
const BASE_PACKAGE_MARKERS = [
  'Leber (ALT, GGT)',
  'Niere (Kreatinin, eGFR)',
  'Cholesterin (HDL, LDL, Triglyceride)',
  'Entzündung (hsCRP)',
  'Langzeitblutzucker (HbA1c)',
  'Vitamine (D, B12, Folsäure)',
];

// TRT door-opener markers (Pick & Mix)
const TRT_MARKERS: ShoppingListMarker[] = [
  { 
    key: 'total_testosterone', 
    label: 'Testosteron (Gesamt)', 
    purpose: 'Diagnose', 
    why: 'Bestimmung des Ist-Zustands und des Mangels.' 
  },
  { 
    key: 'psa', 
    label: 'PSA', 
    purpose: 'Sicherheit', 
    why: 'Pflichtwert. Kein Arzt verschreibt Testo ohne Prostata-Nachweis.' 
  },
  { 
    key: 'lh', 
    label: 'LH', 
    purpose: 'Ursache', 
    why: 'Primärer vs. sekundärer Hypogonadismus.' 
  },
  { 
    key: 'fsh', 
    label: 'FSH', 
    purpose: 'Ursache', 
    why: 'Zusammen mit LH: Liegt Problem im Hoden oder Gehirn?' 
  },
  { 
    key: 'estradiol', 
    label: 'Östrogen (Estradiol)', 
    purpose: 'Baseline', 
    why: 'Startwert für späteres Testo:E2 Ratio Management.' 
  },
  { 
    key: 'lipase', 
    label: 'Lipase', 
    purpose: 'Reta-Check', 
    why: 'Bauchspeicheldrüsen-Sicherheit für Retatrutid.' 
  },
];

// Items NOT to buy
const DONT_BUY_ITEMS = [
  'Gen-Tests (Nutri-Gene etc.) – Genetik wird von Reta und TRT "überrollt".',
  'Allergietests – Nur bei akuten Symptomen nötig.',
  'Sportler-Profile – Teure Umverpackung für Mineralstoffe die du eh abdeckst.',
];

// Roadmap steps
const ROADMAP_STEPS = [
  { step: 1, label: 'Testkit erhalten', description: 'Röhrchen füllen, montags wegschicken' },
  { step: 2, label: 'Daten-Check', description: 'PDF ins Dashboard laden' },
  { step: 3, label: 'Rezept-Antrag', description: 'Perfekte Munition für den Arzt' },
  { step: 4, label: 'Go/No-Go', description: 'Hämatokrit & Lipase prüfen' },
];

export function BloodworkShoppingList({ presentMarkers = [] }: BloodworkShoppingListProps) {
  const isMarkerPresent = (key: string) => presentMarkers.includes(key);

  return (
    <div className="space-y-4">
      {/* Step 1: Base Package */}
      <Card className="p-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-sm">SCHRITT 1: BASIS-PAKET (Gesamtprofil XL)</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Dein metabolischer Scan – das Fundament für alle Interventionen.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {BASE_PACKAGE_MARKERS.map((marker, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {marker}
            </Badge>
          ))}
        </div>
        <div className="flex items-start gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-warning-foreground">
            <strong>LEBENSWICHTIG:</strong> Setze das Häkchen bei "Großes Blutbild"! 
            Nur so bekommst du den <strong>Hämatokrit</strong> – bei TRT dein wichtigster Sicherheitsmarker.
          </p>
        </div>
      </Card>

      {/* Step 2: Pick & Mix - TRT Door Openers */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-sm">SCHRITT 2: TRT-TÜRÖFFNER (Pick & Mix)</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Ohne diese Werte schickt dich jeder seriöse Telemediziner weg.
        </p>
        
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium py-2 h-auto">Marker</TableHead>
                <TableHead className="text-xs font-medium py-2 h-auto">Zweck</TableHead>
                <TableHead className="text-xs font-medium py-2 h-auto hidden sm:table-cell">Warum?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TRT_MARKERS.map((marker) => {
                const present = isMarkerPresent(marker.key);
                return (
                  <TableRow key={marker.key} className={cn(present && "bg-primary/5")}>
                    <TableCell className="py-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {present ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                        )}
                        <span className={cn(present && "text-primary font-medium")}>
                          {marker.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          marker.purpose === 'Sicherheit' && "border-warning/50 text-warning",
                          marker.purpose === 'Reta-Check' && "border-accent/50 text-accent-foreground"
                        )}
                      >
                        {marker.purpose}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground hidden sm:table-cell">
                      {marker.why}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* What NOT to buy */}
      <Card className="p-4 border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="w-5 h-5 text-destructive" />
          <h4 className="font-semibold text-sm">WAS DU NICHT BESTELLST</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Spar dir das Geld für Phase-3-Substanzen oder hochwertiges Protein.
        </p>
        <ul className="space-y-1">
          {DONT_BUY_ITEMS.map((item, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-destructive">✗</span>
              <span className="line-through opacity-75">{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Roadmap */}
      <Card className="p-4 bg-muted/30">
        <h4 className="font-semibold text-sm mb-3">📋 DEIN FAHRPLAN</h4>
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {ROADMAP_STEPS.map((step, idx) => (
            <div key={step.step} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background border">
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {step.step}
                </span>
                <span className="font-medium">{step.label}</span>
              </div>
              {idx < ROADMAP_STEPS.length - 1 && (
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
