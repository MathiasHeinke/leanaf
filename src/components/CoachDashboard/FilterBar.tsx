import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { DashboardFilters } from '@/types/coach-dashboard';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { COACH_REGISTRY } from '@/lib/coachRegistry';

interface FilterBarProps {
  value: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const COACH_OPTIONS = Object.values(COACH_REGISTRY).map(coach => ({
  value: coach.id,
  label: coach.displayName
}));

const STATUS_OPTIONS = [
  { value: 'open', label: 'Offen' },
  { value: 'reviewed', label: 'Überprüft' },
  { value: 'archived', label: 'Archiviert' },
];

const PRESET_RANGES = [
  { label: 'Heute', days: 0 },
  { label: 'Letzte 7 Tage', days: 7 },
  { label: 'Letzte 30 Tage', days: 30 },
  { label: 'Letzte 90 Tage', days: 90 },
];

export const FilterBar: React.FC<FilterBarProps> = ({ value, onChange }) => {
  const activeFiltersCount = Object.values(value).filter(v => v !== undefined && v !== '').length;

  const handleDateRangePreset = (days: number) => {
    if (days === 0) {
      onChange({
        ...value,
        from: new Date(),
        to: new Date(),
      });
    } else {
      onChange({
        ...value,
        from: subDays(new Date(), days),
        to: new Date(),
      });
    }
  };

  const handleClearFilters = () => {
    onChange({
      from: subDays(new Date(), 7), // Keep default 7 days
    });
  };

  const handleSingleFilterChange = (key: keyof DashboardFilters, filterValue: any) => {
    onChange({
      ...value,
      [key]: filterValue,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Date Range */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Zeitraum</label>
          <div className="flex gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal text-xs h-8",
                    !value.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {value.from ? format(value.from, "dd.MM.yy", { locale: de }) : "Von"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value.from}
                  onSelect={(date) => handleSingleFilterChange('from', date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal text-xs h-8",
                    !value.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {value.to ? format(value.to, "dd.MM.yy", { locale: de }) : "Bis"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value.to}
                  onSelect={(date) => handleSingleFilterChange('to', date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Preset Buttons */}
          <div className="flex gap-1 flex-wrap">
            {PRESET_RANGES.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                onClick={() => handleDateRangePreset(preset.days)}
                className="h-6 px-2 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Coach Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Coach</label>
          <Select
            value={value.coach || ''}
            onValueChange={(val) => handleSingleFilterChange('coach', val || undefined)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Alle Coaches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Coaches</SelectItem>
              {COACH_OPTIONS.map((coach) => (
                <SelectItem key={coach.value} value={coach.value}>
                  {coach.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Admin-Status</label>
          <Select
            value={value.status || ''}
            onValueChange={(val) => handleSingleFilterChange('status', val || undefined)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Alle Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle Status</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* RAG Filter */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">RAG-Nutzung</label>
          <Select
            value={value.hasRag?.toString() || ''}
            onValueChange={(val) => handleSingleFilterChange('hasRag', val === '' ? undefined : val === 'true')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle</SelectItem>
              <SelectItem value="true">Mit RAG</SelectItem>
              <SelectItem value="false">Ohne RAG</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};