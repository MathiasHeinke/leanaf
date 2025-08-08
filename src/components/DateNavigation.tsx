
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DateNavigationProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const DateNavigation = ({ currentDate, onDateChange }: DateNavigationProps) => {
  const formatDate = (date: Date): string => {
    return format(date, 'EEEE, d. MMMM', { locale: de });
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };


  return (
    <div className="bg-background p-3 rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPreviousDay} aria-label="Vorheriger Tag">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium tabular-nums">{formatDate(currentDate)}</div>
        <Button variant="ghost" size="sm" onClick={goToNextDay} aria-label="Nächster Tag">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
