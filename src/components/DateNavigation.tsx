
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">Kalendar</span>
        </div>
        {!isToday && (
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <div className="font-semibold text-lg">{formatDate(currentDate)}</div>
          {isToday && (
            <div className="text-sm text-blue-600 font-medium">Heute</div>
          )}
        </div>
        
        <Button variant="ghost" size="sm" onClick={goToNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
