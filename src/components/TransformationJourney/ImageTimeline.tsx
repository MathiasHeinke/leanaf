import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckIcon, CalendarIcon } from 'lucide-react';
import { parseDateParts } from '@/utils/formatDate';

interface ImageTimelineProps {
  photos: Array<{
    date: string;
    weight: number;
    body_fat_percentage?: number;
  }>;
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  getImageUrl: (photo: any) => string;
  category: string;
}

export const ImageTimeline: React.FC<ImageTimelineProps> = ({
  photos,
  selectedDate,
  onDateSelect,
  getImageUrl,
  category
}) => {
  if (photos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Keine Fotos für {category}</p>
        <p className="text-xs mt-1">Beginne deine Transformation</p>
      </div>
    );
  }

  // Sort photos by date (newest first for display)
  const sortedPhotos = [...photos].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // BUG-004 FIX: Use centralized date parser to avoid "0.06.2026" issue
  const formatDate = (dateString: string) => {
    const parts = parseDateParts(dateString);
    if (!parts) {
      return { day: 0, month: '—', year: 0 };
    }
    return {
      day: parts.day,
      month: parts.monthShort,
      year: parts.year
    };
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    return `vor ${days} Tagen`;
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateSelect(null)}
          className={`text-xs ${!selectedDate ? 'bg-primary/10 text-primary' : ''}`}
        >
          <CheckIcon className="h-3 w-3 mr-1" />
          Neuestes
        </Button>
        
        <Badge variant="outline" className="text-xs">
          {sortedPhotos.length} Fotos
        </Badge>
      </div>

      {/* Timeline Scroll */}
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {sortedPhotos.map((photo, index) => {
            const dateInfo = formatDate(photo.date);
            const isSelected = selectedDate === photo.date;
            const isLatest = index === 0;
            
            return (
              <div
                key={photo.date}
                className={`
                  relative flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer
                  ${isSelected 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
                onClick={() => onDateSelect(photo.date)}
              >
                {/* Timeline Connector */}
                {index < sortedPhotos.length - 1 && (
                  <div className="absolute left-[46px] top-full w-0.5 h-2 bg-border" />
                )}
                
                {/* Photo Thumbnail */}
                <div className="relative">
                  <img
                    src={getImageUrl(photo)}
                    alt={`Fortschritt ${photo.date}`}
                    className="w-12 h-12 object-cover rounded-md border"
                  />
                  {isLatest && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center">
                      1
                    </Badge>
                  )}
                </div>

                {/* Photo Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {dateInfo.day}. {dateInfo.month}
                    </span>
                    {dateInfo.year !== new Date().getFullYear() && (
                      <span className="text-xs text-muted-foreground">
                        {dateInfo.year}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {getDaysAgo(photo.date)}
                    </span>
                    {photo.weight && (
                      <Badge variant="outline" className="text-xs h-4">
                        {photo.weight}kg
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <CheckIcon className="h-4 w-4 text-primary" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Timeline Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-2">
        <p>
          Zeitraum: {sortedPhotos.length > 0 && (
            <>
              {formatDate(sortedPhotos[sortedPhotos.length - 1].date).day}.
              {formatDate(sortedPhotos[sortedPhotos.length - 1].date).month} - 
              {formatDate(sortedPhotos[0].date).day}.
              {formatDate(sortedPhotos[0].date).month}
            </>
          )}
        </p>
      </div>
    </div>
  );
};