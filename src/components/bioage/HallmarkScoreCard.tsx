import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Hallmark {
  id: string;
  name: string;
  shortName: string;
  description: string;
  interventions: string[];
  addressed: boolean;
}

const HALLMARKS_OF_AGING: Hallmark[] = [
  {
    id: 'genomic_instability',
    name: 'Genomische Instabilität',
    shortName: 'Genom',
    description: 'DNA-Schäden und Reparaturdefekte',
    interventions: ['NAD+ Booster', 'Rapamycin', 'Fasten'],
    addressed: true,
  },
  {
    id: 'telomere_attrition',
    name: 'Telomer-Verkürzung',
    shortName: 'Telomere',
    description: 'Verkürzung der Chromosomenenden',
    interventions: ['Epitalon', 'TA-65', 'Lifestyle'],
    addressed: true,
  },
  {
    id: 'epigenetic_alterations',
    name: 'Epigenetische Veränderungen',
    shortName: 'Epigenetik',
    description: 'Veränderungen der Genexpression',
    interventions: ['Alpha-Ketoglutarat', 'Glycin', 'Fasten'],
    addressed: true,
  },
  {
    id: 'loss_of_proteostasis',
    name: 'Proteostase-Verlust',
    shortName: 'Proteine',
    description: 'Fehlerhafte Proteinfaltung',
    interventions: ['Autophagie-Fasten', 'Spermidine', 'HSP-Aktivatoren'],
    addressed: true,
  },
  {
    id: 'deregulated_nutrient_sensing',
    name: 'Gestörtes Nährstoff-Sensing',
    shortName: 'Nutrient',
    description: 'mTOR/AMPK/Insulin Dysregulation',
    interventions: ['Metformin', 'Rapamycin', 'Fasten', 'Retatrutid'],
    addressed: true,
  },
  {
    id: 'mitochondrial_dysfunction',
    name: 'Mitochondrien-Dysfunktion',
    shortName: 'Mito',
    description: 'Energieproduktion beeinträchtigt',
    interventions: ['SS-31', 'MOTS-c', 'PQQ', 'CoQ10', 'NAD+'],
    addressed: true,
  },
  {
    id: 'cellular_senescence',
    name: 'Zelluläre Seneszenz',
    shortName: 'Seneszenz',
    description: 'Akkumulation seneszenter Zellen',
    interventions: ['Fisetin', 'Quercetin+Dasatinib', 'Navitoclax'],
    addressed: true,
  },
  {
    id: 'stem_cell_exhaustion',
    name: 'Stammzell-Erschöpfung',
    shortName: 'Stammzellen',
    description: 'Regenerative Kapazität reduziert',
    interventions: ['Extended Fasten', 'GH Secretagogues', 'Rapamycin'],
    addressed: true,
  },
  {
    id: 'altered_intercellular_comm',
    name: 'Veränderte Kommunikation',
    shortName: 'Signale',
    description: 'Gestörte Zellkommunikation',
    interventions: ['Anti-Inflammatorika', 'Senolytika', 'Hormone'],
    addressed: true,
  },
  {
    id: 'disabled_macroautophagy',
    name: 'Gestörte Autophagie',
    shortName: 'Autophagie',
    description: 'Zelluläre Selbstreinigung beeinträchtigt',
    interventions: ['Extended Fasten', 'Spermidine', 'Rapamycin'],
    addressed: true,
  },
  {
    id: 'chronic_inflammation',
    name: 'Chronische Entzündung',
    shortName: 'Inflammaging',
    description: 'Niedriggradige systemische Entzündung',
    interventions: ['Omega-3', 'Curcumin', 'Senolytika', 'Fasten'],
    addressed: true,
  },
  {
    id: 'dysbiosis',
    name: 'Dysbiose',
    shortName: 'Mikrobiom',
    description: 'Ungleichgewicht der Darmflora',
    interventions: ['Präbiotika', 'Probiotika', 'Fasten', 'Ernährung'],
    addressed: true,
  },
];

interface HallmarkScoreCardProps {
  compact?: boolean;
}

export function HallmarkScoreCard({ compact = false }: HallmarkScoreCardProps) {
  const addressedCount = HALLMARKS_OF_AGING.filter((h) => h.addressed).length;
  const totalCount = HALLMARKS_OF_AGING.length;
  const percentage = Math.round((addressedCount / totalCount) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
        <div className="flex-1">
          <span className="text-sm font-medium">Hallmarks</span>
          <span className="ml-2 font-bold text-emerald-600">
            {addressedCount}/{totalCount}
          </span>
        </div>
        <Badge className="bg-emerald-500">{percentage}%</Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Hallmarks of Aging</CardTitle>
          <Badge className="bg-emerald-500">
            {addressedCount}/{totalCount} adressiert
          </Badge>
        </div>
        <CardDescription>
          Das ARES-Protokoll zielt auf alle 12 Hallmarks des Alterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {HALLMARKS_OF_AGING.map((hallmark) => (
              <Tooltip key={hallmark.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`p-2 rounded-lg border text-center cursor-help transition-colors ${
                      hallmark.addressed
                        ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-muted border-muted-foreground/20 hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-1">
                      {hallmark.addressed ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-xs font-medium truncate">{hallmark.shortName}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium">{hallmark.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{hallmark.description}</p>
                  <div className="mt-2">
                    <p className="text-xs font-medium">Interventionen:</p>
                    <p className="text-xs text-muted-foreground">
                      {hallmark.interventions.join(', ')}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
          <Info className="w-4 h-4 inline mr-2 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Phase 3 kombiniert Senolytika, Fasten, Hormone und Supplements für maximale Abdeckung
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
