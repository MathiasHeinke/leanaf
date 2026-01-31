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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'Ausstehend', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  approved: { label: 'Genehmigt', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  rejected: { label: 'Abgelehnt', icon: XCircle, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  failed: { label: 'Fehlgeschlagen', icon: AlertCircle, color: 'bg-muted text-muted-foreground border-border' },
};

export function ProductSubmissionsReview() {
  const {
    submissions,
    loading,
    statusFilter,
    setStatusFilter,
    counts,
    approveSubmission,
    rejectSubmission,
    deleteSubmission,
    refresh,
  } = useProductSubmissionsAdmin();

  const [selectedSubmission, setSelectedSubmission] = useState<ProductSubmission | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

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

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission && !showRejectDialog} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Produkt-Details</DialogTitle>
            <DialogDescription>
              Eingereicht am {selectedSubmission && format(new Date(selectedSubmission.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              {/* Source URL */}
              <div className="flex items-center gap-2 text-sm">
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

              {/* Extracted Data */}
              {selectedSubmission.extracted_data && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Produkt</div>
                    <div className="font-medium">{selectedSubmission.extracted_data.product_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Marke</div>
                    <div>{selectedSubmission.extracted_data.brand_name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Preis</div>
                    <div>{selectedSubmission.extracted_data.price_eur ? `€${selectedSubmission.extracted_data.price_eur.toFixed(2)}` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Packung</div>
                    <div>
                      {selectedSubmission.extracted_data.pack_size} {selectedSubmission.extracted_data.pack_unit}
                      {selectedSubmission.extracted_data.servings_per_pack && ` (${selectedSubmission.extracted_data.servings_per_pack} Portionen)`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Dosis/Portion</div>
                    <div>
                      {selectedSubmission.extracted_data.dose_per_serving} {selectedSubmission.extracted_data.dose_unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Preis/Portion</div>
                    <div>
                      {selectedSubmission.extracted_data.price_per_serving 
                        ? `€${selectedSubmission.extracted_data.price_per_serving.toFixed(2)}` 
                        : '-'}
                    </div>
                  </div>
                  {selectedSubmission.extracted_data.quality_tags && selectedSubmission.extracted_data.quality_tags.length > 0 && (
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Qualitäts-Tags</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSubmission.extracted_data.quality_tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Matched Supplement */}
              {selectedSubmission.matched_supplement_name && (
                <div className="p-4 border border-border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Zugeordnetes Supplement</div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedSubmission.matched_supplement_name}</span>
                    {selectedSubmission.match_confidence && (
                      <Badge variant="outline">
                        {Math.round(selectedSubmission.match_confidence * 100)}% Konfidenz
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Amazon Image Preview */}
              {selectedSubmission.extracted_data?.amazon_image && (
                <div className="text-center">
                  <img 
                    src={selectedSubmission.extracted_data.amazon_image} 
                    alt="Produktbild" 
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedSubmission?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-500/30 hover:bg-red-500/10"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Ablehnen
                </Button>
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
                  Genehmigen
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
    </div>
  );
}
