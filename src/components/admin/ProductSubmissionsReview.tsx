import React, { useState } from 'react';
import { 
  useProductSubmissionsAdmin, 
  ProductSubmission, 
  StatusFilter 
} from '@/hooks/useProductSubmissionsAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, 
  X, 
  Eye, 
  RefreshCw, 
  Loader2, 
  Package,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  Zap,
  Beaker,
  Building2,
  Pill,
  Info,
  FlaskConical,
  Shield,
  Timer,
  TrendingUp,
  Edit2
} from 'lucide-react';
import { ManualProductEntryDialog } from './ManualProductEntryDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'Ausstehend', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  approved: { label: 'Genehmigt', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  rejected: { label: 'Abgelehnt', icon: XCircle, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  failed: { label: 'Fehlgeschlagen', icon: AlertCircle, color: 'bg-muted text-muted-foreground border-border' },
};

// Score color helper
function getScoreColor(score: number | null | undefined): string {
  if (!score) return 'text-muted-foreground';
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
}

// Data row component
function DataRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <span className="text-sm text-muted-foreground min-w-[100px]">{label}:</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );
}

// Score badge component
function ScoreBadge({ label, score, explanation }: { label: string; score: number | null | undefined; explanation?: string }) {
  return (
    <div className="flex flex-col items-center p-2 bg-background/50 rounded-lg border border-border/50">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate w-full text-center">{label}</span>
      <span className={cn("text-lg font-bold", getScoreColor(score))}>
        {score?.toFixed(1) || '-'}
      </span>
      {explanation && (
        <span className="text-[9px] text-muted-foreground text-center truncate w-full">{explanation}</span>
      )}
    </div>
  );
}

export function ProductSubmissionsReview() {
  const {
    submissions,
    loading,
    statusFilter,
    setStatusFilter,
    counts,
    enrichSubmission,
    approveSubmission,
    rejectSubmission,
    deleteSubmission,
    refresh,
  } = useProductSubmissionsAdmin();

  const [selectedSubmission, setSelectedSubmission] = useState<ProductSubmission | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntrySubmission, setManualEntrySubmission] = useState<ProductSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const handleManualEntry = (submission: ProductSubmission) => {
    setManualEntrySubmission(submission);
    setShowManualEntryDialog(true);
  };

  const handleManualEntrySuccess = () => {
    refresh();
    // Update selected submission if it was modified
    if (selectedSubmission?.id === manualEntrySubmission?.id) {
      setSelectedSubmission(null);
    }
  };

  const handleEnrich = async (submission: ProductSubmission) => {
    setEnrichingId(submission.id);
    const enrichedData = await enrichSubmission(submission.id);
    setEnrichingId(null);
    if (enrichedData && selectedSubmission?.id === submission.id) {
      setSelectedSubmission({
        ...selectedSubmission,
        extracted_data: enrichedData,
        is_enriched: true,
      });
    }
  };

  const handleApprove = async (submission: ProductSubmission) => {
    setProcessingId(submission.id);
    await approveSubmission(submission);
    setProcessingId(null);
    setSelectedSubmission(null);
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    setProcessingId(selectedSubmission.id);
    await rejectSubmission(selectedSubmission.id, rejectReason);
    setProcessingId(null);
    setShowRejectDialog(false);
    setRejectReason('');
    setSelectedSubmission(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Einreichung wirklich löschen?')) return;
    setProcessingId(id);
    await deleteSubmission(id);
    setProcessingId(null);
  };

  const filterButtons: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Alle', count: counts.total },
    { value: 'pending', label: 'Ausstehend', count: counts.pending },
    { value: 'approved', label: 'Genehmigt', count: counts.approved },
    { value: 'rejected', label: 'Abgelehnt', count: counts.rejected },
  ];

  const data = selectedSubmission?.extracted_data || {};
  const filledFieldsCount = Object.entries(data)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '' && 
      (Array.isArray(v) ? v.length > 0 : true))
    .length;

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{counts.total}</div>
            <div className="text-sm text-muted-foreground">Gesamt</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{counts.pending}</div>
            <div className="text-sm text-yellow-600/80">Ausstehend</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
            <div className="text-sm text-green-600/80">Genehmigt</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{counts.rejected}</div>
            <div className="text-sm text-red-600/80">Abgelehnt</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={statusFilter === btn.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(btn.value)}
          >
            {btn.label}
            <Badge variant="secondary" className="ml-2">
              {btn.count}
            </Badge>
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produkt-Einreichungen
          </CardTitle>
          <CardDescription>
            Community-eingereichte Produkte prüfen und genehmigen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Keine Einreichungen in dieser Kategorie
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Marke</TableHead>
                    <TableHead>Matched Supplement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => {
                    const StatusIcon = statusConfig[sub.status]?.icon || Clock;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {sub.extracted_data?.product_name || 'Unbekannt'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.extracted_data?.brand_name || '-'}
                        </TableCell>
                        <TableCell>
                          {sub.matched_supplement_name ? (
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[150px]">
                                {sub.matched_supplement_name}
                              </span>
                              {sub.match_confidence && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(sub.match_confidence * 100)}%
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'flex items-center gap-1 w-fit',
                              statusConfig[sub.status]?.color
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[sub.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(sub.created_at), 'dd.MM.yy HH:mm', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedSubmission(sub)}
                              title="Details anzeigen"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {sub.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "hover:bg-primary/10",
                                    sub.is_enriched 
                                      ? "text-green-500 hover:text-green-600" 
                                      : "text-primary hover:text-primary"
                                  )}
                                  onClick={() => handleEnrich(sub)}
                                  disabled={enrichingId === sub.id}
                                  title={sub.is_enriched ? 'Erneut anreichern' : 'Anreichern'}
                                >
                                  {enrichingId === sub.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                  onClick={() => handleManualEntry(sub)}
                                  title="Manuell ergänzen"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                  onClick={() => handleApprove(sub)}
                                  disabled={processingId === sub.id}
                                  title="Genehmigen"
                                >
                                  {processingId === sub.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                  onClick={() => {
                                    setSelectedSubmission(sub);
                                    setShowRejectDialog(true);
                                  }}
                                  disabled={processingId === sub.id}
                                  title="Ablehnen"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(sub.id)}
                              disabled={processingId === sub.id}
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog with Tabs */}
      <Dialog open={!!selectedSubmission && !showRejectDialog} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {data.product_name || 'Produkt-Details'}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              <span>Eingereicht am {selectedSubmission && format(new Date(selectedSubmission.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
              {data.enrichment_version && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  v{data.enrichment_version} • {filledFieldsCount} Felder
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <Tabs defaultValue="basis" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="basis" className="gap-1.5 text-xs">
                  <Info className="w-3.5 h-3.5" />
                  Basis
                </TabsTrigger>
                <TabsTrigger value="qualitaet" className="gap-1.5 text-xs">
                  <Shield className="w-3.5 h-3.5" />
                  Qualität
                </TabsTrigger>
                <TabsTrigger value="wirkstoff" className="gap-1.5 text-xs">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Wirkstoff
                </TabsTrigger>
                <TabsTrigger value="marke" className="gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5" />
                  Marke
                </TabsTrigger>
              </TabsList>

              {/* === TAB: BASIS === */}
              <TabsContent value="basis" className="space-y-4">
                {/* Source URL */}
                <div className="flex items-center gap-2 text-sm p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">Quelle:</span>
                  <a 
                    href={selectedSubmission.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    {selectedSubmission.source_domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Basic Product Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                  <DataRow label="Produkt" value={data.product_name} icon={Package} />
                  <DataRow label="Marke" value={data.brand_name} icon={Building2} />
                  <DataRow label="Preis" value={data.price_eur ? `€${data.price_eur.toFixed(2)}` : null} />
                  <DataRow label="Preis/Portion" value={data.price_per_serving ? `€${data.price_per_serving.toFixed(2)}` : null} />
                  <DataRow label="Packung" value={`${data.pack_size || '?'} ${data.pack_unit || ''}`} />
                  <DataRow label="Portionen" value={data.servings_per_pack} />
                  <DataRow label="Dosis/Portion" value={`${data.dose_per_serving || '?'} ${data.dose_unit || ''}`} icon={Pill} />
                  <DataRow label="Portionsgröße" value={data.serving_size} />
                  <DataRow label="Form" value={data.form} icon={Beaker} />
                  <DataRow label="Kategorie" value={data.category} />
                  <DataRow label="Timing" value={data.timing} icon={Timer} />
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-2">
                  {data.is_vegan && <Badge variant="secondary">🌱 Vegan</Badge>}
                  {data.is_organic && <Badge variant="secondary">🌿 Bio</Badge>}
                  {data.is_gluten_free && <Badge variant="secondary">🌾 Glutenfrei</Badge>}
                </div>

                {/* Allergens */}
                {data.allergens?.length > 0 && (
                  <div className="p-3 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
                    <span className="text-xs text-yellow-600 font-medium">⚠️ Allergene:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.allergens.map((a: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-yellow-600 border-yellow-500/30">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quality Tags */}
                {data.quality_tags?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Qualitäts-Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.quality_tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Short Description */}
                {data.short_description && (
                  <div className="p-3 bg-muted/20 rounded-lg text-sm">
                    <span className="text-muted-foreground">Beschreibung: </span>
                    {data.short_description}
                  </div>
                )}

                {/* Amazon Image */}
                {data.amazon_image && (
                  <div className="text-center">
                    <img 
                      src={data.amazon_image} 
                      alt="Produktbild" 
                      className="max-h-40 mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
              </TabsContent>

              {/* === TAB: QUALITÄT === */}
              <TabsContent value="qualitaet" className="space-y-4">
                {/* Big8 Impact Score */}
                {data.impact_score_big8 != null && (
                  <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Big8 Quality Score</span>
                      </div>
                      <div className={cn(
                        "text-3xl font-bold",
                        getScoreColor(data.impact_score_big8)
                      )}>
                        {data.impact_score_big8.toFixed(1)}<span className="text-lg text-muted-foreground">/10</span>
                      </div>
                    </div>
                    
                    {/* Score Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <ScoreBadge label="Bioverfügbarkeit" score={data.quality_bioavailability} explanation={data.form || undefined} />
                      <ScoreBadge label="Dosierung" score={data.quality_dosage} />
                      <ScoreBadge label="Form" score={data.quality_form} />
                      <ScoreBadge label="Reinheit" score={data.quality_purity} />
                      <ScoreBadge label="Forschung" score={data.quality_research} explanation={data.evidence_level || undefined} />
                      <ScoreBadge label="Synergie" score={data.quality_synergy} />
                      <ScoreBadge label="Transparenz" score={data.quality_transparency} />
                      <ScoreBadge label="Preis-Leistung" score={data.quality_value} />
                    </div>
                  </div>
                )}

                {/* Legacy Quality Metrics */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <DataRow label="Bioverfügbarkeit (Legacy)" value={data.bioavailability?.toFixed(1)} />
                  <DataRow label="Potenz" value={data.potency?.toFixed(1)} />
                  <DataRow label="Reinheit" value={data.purity?.toFixed(1)} />
                  <DataRow label="Preis-Leistung" value={data.value?.toFixed(1)} />
                  <DataRow label="Herkunft" value={data.origin} />
                  <DataRow label="Labortests" value={data.lab_tests} />
                </div>

                {/* Enrichment CTA */}
                {selectedSubmission.status === 'pending' && !data.impact_score_big8 && (
                  <div className="p-6 border border-dashed border-muted-foreground/30 rounded-lg text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Produkt noch nicht angereichert. Starte das 4-Stufen Deep Enrichment!
                    </p>
                    <Button
                      variant="default"
                      onClick={() => handleEnrich(selectedSubmission)}
                      disabled={enrichingId === selectedSubmission.id}
                      className="gap-2"
                    >
                      {enrichingId === selectedSubmission.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Anreichern...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Deep Enrichment starten
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* === TAB: WIRKSTOFF === */}
              <TabsContent value="wirkstoff" className="space-y-4">
                {/* Matched Supplement */}
                {selectedSubmission.matched_supplement_name && (
                  <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-primary" />
                        <span className="font-medium">Zugeordneter Wirkstoff</span>
                      </div>
                      {selectedSubmission.match_confidence && (
                        <Badge variant="outline">
                          {Math.round(selectedSubmission.match_confidence * 100)}% Match
                        </Badge>
                      )}
                    </div>
                    <div className="text-lg font-semibold">{selectedSubmission.matched_supplement_name}</div>
                  </div>
                )}

                {/* Clinical Dosage */}
                {(data.clinical_dosage_min || data.clinical_dosage_max) && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <span className="text-xs text-muted-foreground">Klinische Dosis:</span>
                    <div className="font-medium">
                      {data.clinical_dosage_min}-{data.clinical_dosage_max} {data.clinical_dosage_unit}
                    </div>
                  </div>
                )}

                {/* Synergies */}
                {data.synergies?.length > 0 && (
                  <div className="p-4 border border-green-500/30 bg-green-500/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">Synergien ({data.synergies.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.synergies.map((s: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-green-600 border-green-500/30">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blockers */}
                {data.blockers?.length > 0 && (
                  <div className="p-4 border border-red-500/30 bg-red-500/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-700">Blocker ({data.blockers.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.blockers.map((b: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-red-600 border-red-500/30">{b}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <DataRow label="Evidence Level" value={data.evidence_level} />
                  <DataRow label="Necessity Tier" value={data.necessity_tier} />
                  <DataRow label="Timing Constraint" value={data.timing_constraint} />
                  <DataRow label="Cycling Protocol" value={data.cycling_protocol} />
                </div>

                {/* Hallmarks */}
                {data.hallmarks_addressed?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Hallmarks adressiert:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.hallmarks_addressed.map((h: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ingredients */}
                {data.ingredients?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Aktive Inhaltsstoffe:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.ingredients.slice(0, 10).map((ing: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{ing}</Badge>
                      ))}
                      {data.ingredients.length > 10 && (
                        <Badge variant="outline" className="text-xs">+{data.ingredients.length - 10} mehr</Badge>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* === TAB: MARKE === */}
              <TabsContent value="marke" className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold text-lg">{data.brand_name || 'Unbekannte Marke'}</span>
                    {data.brand_is_new && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                        NEU
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DataRow label="Brand ID" value={data.brand_id || 'Nicht zugeordnet'} />
                    <DataRow label="Land" value={data.brand_country} />
                    <DataRow label="Price Tier" value={
                      data.brand_price_tier && (
                        <Badge variant="outline" className={cn(
                          data.brand_price_tier === 'premium' && 'border-primary text-primary',
                          data.brand_price_tier === 'mid' && 'border-yellow-500 text-yellow-600',
                          data.brand_price_tier === 'budget' && 'border-muted-foreground'
                        )}>
                          {data.brand_price_tier}
                        </Badge>
                      )
                    } />
                    <DataRow label="Status" value={data.brand_is_new ? 'Wird erstellt' : 'Existiert'} />
                  </div>

                  {/* Certifications */}
                  {data.brand_certifications?.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs text-muted-foreground">Zertifizierungen:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.brand_certifications.map((cert: string, i: number) => (
                          <Badge key={i} variant="secondary">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {data.brand_is_new && (
                  <div className="p-4 border border-dashed border-yellow-500/50 bg-yellow-500/5 rounded-lg text-center">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm text-yellow-700">
                      Diese Marke existiert noch nicht in der Datenbank und wird bei Genehmigung automatisch erstellt.
                    </p>
                  </div>
                )}

                {/* Meta Info */}
                <div className="p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Enrichment Version:</span>
                    <span>{data.enrichment_version || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Angereichert am:</span>
                    <span>{data.enriched_at ? format(new Date(data.enriched_at), 'dd.MM.yy HH:mm') : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Source:</span>
                    <span>{data.enrichment_source || '-'}</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            {selectedSubmission?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Ablehnen
                </Button>
                {!data.impact_score_big8 && (
                  <Button
                    variant="outline"
                    onClick={() => handleEnrich(selectedSubmission)}
                    disabled={enrichingId === selectedSubmission.id}
                    className="gap-2"
                  >
                    {enrichingId === selectedSubmission.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Anreichern...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Anreichern
                      </>
                    )}
                  </Button>
                )}
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedSubmission)}
                  disabled={processingId === selectedSubmission.id}
                >
                  {processingId === selectedSubmission.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Genehmigen & Speichern
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einreichung ablehnen</DialogTitle>
            <DialogDescription>
              Bitte gib einen Grund für die Ablehnung an.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Grund für Ablehnung (optional)"
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={processingId === selectedSubmission?.id}
            >
              {processingId === selectedSubmission?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <ManualProductEntryDialog
        open={showManualEntryDialog}
        onOpenChange={setShowManualEntryDialog}
        submission={manualEntrySubmission}
        onSuccess={handleManualEntrySuccess}
      />
    </div>
  );
}
