
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


  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={goToPreviousDay}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <button
        onClick={goToToday}
        className="text-center hover:bg-secondary/50 rounded-md px-3 py-1 transition-colors"
      >
        <div className="text-lg font-semibold">{formatDate(currentDate)}</div>
      </button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={goToNextDay}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
