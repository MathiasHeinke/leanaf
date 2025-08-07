import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMindsetJournal } from "@/hooks/useMindsetJournal";
import { MindsetJournalEntryCard } from "./MindsetJournalEntryCard";

interface MindsetJournalDetailWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string; // Format: YYYY-MM-DD
}

export const MindsetJournalDetailWidget = ({ 
  open, 
  onOpenChange, 
  selectedDate 
}: MindsetJournalDetailWidgetProps) => {
  const { recentEntries = [] } = useMindsetJournal();

  // Filter entries for the selected date
  const dateEntries = recentEntries.filter(entry => 
    new Date(entry.date).toISOString().split('T')[0] === selectedDate
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Heute";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Gestern";
    } else {
      return date.toLocaleDateString('de-DE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Mindset Journal - {formatDate(selectedDate)}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {dateEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Keine Einträge für diesen Tag gefunden.</p>
              </div>
            ) : (
              dateEntries.map((entry, index) => (
                <MindsetJournalEntryCard 
                  key={entry.id || index} 
                  entry={entry}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};