// Bloodwork History Component
// Table view of all bloodwork entries

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BloodworkEntry as BloodworkEntryType, getAllMarkerKeys, MARKER_DISPLAY_NAMES } from './types';
import { MarkerStatusBadge, getStatusPriority } from './MarkerStatusBadge';
import { useBloodwork } from '@/hooks/useBloodwork';
import { formatGermanDate } from '@/utils/formatDate';
import { Edit, Trash2, Eye, FileText, TestTube } from 'lucide-react';

interface BloodworkHistoryProps {
  entries: BloodworkEntryType[];
  onEdit?: (entry: BloodworkEntryType) => void;
}

export function BloodworkHistory({ entries, onEdit }: BloodworkHistoryProps) {
  const { deleteEntry, evaluateMarker, countFilledMarkers, userGender } = useBloodwork();
  const [viewingEntry, setViewingEntry] = useState<BloodworkEntryType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get status counts for an entry
  const getStatusCounts = (entry: BloodworkEntryType) => {
    let optimal = 0;
    let normal = 0;
    let borderline = 0;
    let critical = 0;

    getAllMarkerKeys().forEach(key => {
      const value = entry[key];
      if (typeof value === 'number' && !isNaN(value)) {
        const evaluation = evaluateMarker(key, value, userGender);
        if (evaluation) {
          switch (evaluation.status) {
            case 'optimal': optimal++; break;
            case 'normal': normal++; break;
            case 'borderline_low':
            case 'borderline_high': borderline++; break;
            case 'low':
            case 'high': critical++; break;
          }
        }
      }
    });

    return { optimal, normal, borderline, critical };
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteEntry(id);
    setDeletingId(null);
  };

  // Get all marker values for detail view
  const getMarkerValuesForEntry = (entry: BloodworkEntryType) => {
    const values: { key: string; label: string; value: number; unit: string; status: string }[] = [];
    
    getAllMarkerKeys().forEach(key => {
      const value = entry[key];
      if (typeof value === 'number' && !isNaN(value)) {
        const evaluation = evaluateMarker(key, value, userGender);
        values.push({
          key,
          label: MARKER_DISPLAY_NAMES[key] || key,
          value,
          unit: evaluation?.unit || '',
          status: evaluation?.status || 'normal'
        });
      }
    });

    // Sort by status priority (critical first)
    return values.sort((a, b) => getStatusPriority(b.status as any) - getStatusPriority(a.status as any));
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TestTube className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Keine Blutwerte vorhanden</h3>
          <p className="text-sm text-muted-foreground">
            Trage deinen ersten Bluttest ein, um deine Werte zu tracken.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bluttest-Verlauf
          </CardTitle>
          <CardDescription>
            {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} gespeichert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Labor</TableHead>
                <TableHead>Marker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(entry => {
                const markerCount = countFilledMarkers(entry);
                const { optimal, normal, borderline, critical } = getStatusCounts(entry);

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {formatGermanDate(entry.test_date)}
                      {entry.is_fasted && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Nüchtern
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.lab_name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{markerCount} Werte</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {critical > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {critical} kritisch
                          </Badge>
                        )}
                        {borderline > 0 && (
                          <Badge className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            {borderline} grenzwertig
                          </Badge>
                        )}
                        {optimal > 0 && (
                          <Badge className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                            {optimal} optimal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingEntry(entry)}
                          title="Details anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(entry)}
                            title="Bearbeiten"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Der Bluttest vom {formatGermanDate(entry.test_date)} wird unwiderruflich gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(entry.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Löschen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail View Dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Bluttest vom {viewingEntry && formatGermanDate(viewingEntry.test_date)}
            </DialogTitle>
            <DialogDescription>
              {viewingEntry?.lab_name && `Labor: ${viewingEntry.lab_name}`}
              {viewingEntry?.is_fasted && ' • Nüchtern'}
            </DialogDescription>
          </DialogHeader>
          
          {viewingEntry && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marker</TableHead>
                    <TableHead className="text-right">Wert</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMarkerValuesForEntry(viewingEntry).map(item => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell className="text-right">
                        {item.value} <span className="text-muted-foreground text-xs">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        <MarkerStatusBadge status={item.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {viewingEntry.notes && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-1">Notizen</h4>
                  <p className="text-sm text-muted-foreground">{viewingEntry.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingEntry(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
