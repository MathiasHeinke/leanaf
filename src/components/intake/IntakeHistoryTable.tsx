import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { History, Calendar } from "lucide-react";

interface HistoryEntry {
  date: string;
  entries: {
    peptide_name: string;
    dose_mcg: number | null;
    dose_unit: string | null;
    taken_at: string;
    skipped: boolean;
  }[];
}

export function IntakeHistoryTable() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sevenDaysAgo = subDays(new Date(), 7).toISOString();

        const { data, error } = await supabase
          .from('peptide_intake_log')
          .select('*')
          .eq('user_id', user.id)
          .gte('taken_at', sevenDaysAgo)
          .order('taken_at', { ascending: false });

        if (error) throw error;

        // Group by date
        const grouped: Record<string, HistoryEntry['entries']> = {};
        (data || []).forEach(entry => {
          if (!entry.taken_at) return;
          const dateKey = entry.taken_at.split('T')[0];
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push({
            peptide_name: entry.peptide_name,
            dose_mcg: entry.dose_mcg,
            dose_unit: entry.dose_unit,
            taken_at: entry.taken_at,
            skipped: entry.skipped || false,
          });
        });

        const historyArray: HistoryEntry[] = Object.entries(grouped)
          .map(([date, entries]) => ({ date, entries }))
          .sort((a, b) => b.date.localeCompare(a.date));

        setHistory(historyArray);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Einnahme-Historie
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Noch keine Einnahmen protokolliert
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Letzte 7 Tage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Substanzen</TableHead>
              <TableHead className="text-right">Anzahl</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((day) => {
              const takenEntries = day.entries.filter(e => !e.skipped);
              const skippedEntries = day.entries.filter(e => e.skipped);
              
              return (
                <TableRow key={day.date}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {format(new Date(day.date), 'EEE, dd. MMM', { locale: de })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {takenEntries.map((entry, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary"
                          className="text-xs"
                        >
                          {entry.peptide_name}
                          {entry.dose_mcg && entry.dose_unit && (
                            <span className="ml-1 opacity-70">
                              {entry.dose_mcg}{entry.dose_unit}
                            </span>
                          )}
                        </Badge>
                      ))}
                      {skippedEntries.map((entry, idx) => (
                        <Badge 
                          key={`skip-${idx}`} 
                          variant="outline"
                          className="text-xs opacity-60"
                        >
                          {entry.peptide_name} (übersprungen)
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">
                      {takenEntries.length}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
