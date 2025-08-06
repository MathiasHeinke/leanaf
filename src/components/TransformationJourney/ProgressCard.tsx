import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ExpandIcon, 
  TrashIcon, 
  CalendarIcon, 
  ScaleIcon, 
  ActivityIcon,
  SparklesIcon
} from 'lucide-react';

interface ProgressCardProps {
  imageUrl: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  category?: string;
  isLatest?: boolean;
  isTarget?: boolean;
  onDelete?: () => void;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  imageUrl,
  date,
  weight,
  bodyFat,
  category,
  isLatest,
  isTarget,
  onDelete
}) => {
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    return `vor ${Math.floor(days / 30)} Monaten`;
  };

  return (
    <>
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg group">
        <div className="relative">
          {/* Image */}
          <div className="aspect-[3/4] overflow-hidden">
            <img
              src={imageUrl}
              alt={`Fortschritt ${date}`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                onClick={() => setIsEnlarged(true)}
              >
                <ExpandIcon className="h-4 w-4" />
              </Button>
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Status Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isLatest && !isTarget && (
              <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                <SparklesIcon className="h-3 w-3 mr-1" />
                Aktuell
              </Badge>
            )}
            {isTarget && (
              <Badge className="bg-primary hover:bg-primary/90 text-xs">
                <ActivityIcon className="h-3 w-3 mr-1" />
                Ziel
              </Badge>
            )}
          </div>
        </div>

        {/* Card Content */}
        <CardContent className="p-3 space-y-2">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDate(date)}</span>
            <span className="text-muted-foreground text-xs">
              {!isTarget && `(${getDaysAgo(date)})`}
            </span>
          </div>

          {/* Metrics */}
          <div className="flex gap-2 flex-wrap">
            {weight && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <ScaleIcon className="h-3 w-3" />
                {weight}kg
              </Badge>
            )}
            {bodyFat && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <ActivityIcon className="h-3 w-3" />
                {bodyFat}%
              </Badge>
            )}
          </div>

          {/* Category indicator */}
          {category && category !== 'unspecified' && (
            <div className="text-xs text-muted-foreground">
              {category === 'front' && 'Frontansicht'}
              {category === 'back' && 'Rückansicht'}
              {category === 'side_left' && 'Seitlich links'}
              {category === 'side_right' && 'Seitlich rechts'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enlarged Image Modal */}
      {isEnlarged && (
        <Dialog open={isEnlarged} onOpenChange={setIsEnlarged}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isTarget ? 'Zielbild' : 'Fortschrittsfoto'} - {formatDate(date)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-auto overflow-hidden rounded-lg">
                <img
                  src={imageUrl}
                  alt={`Vergrößerte Ansicht ${date}`}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              </div>
              
              {/* Metrics in modal */}
              <div className="flex gap-4 justify-center">
                {weight && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{weight}kg</p>
                    <p className="text-sm text-muted-foreground">Gewicht</p>
                  </div>
                )}
                {bodyFat && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{bodyFat}%</p>
                    <p className="text-sm text-muted-foreground">Körperfett</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Zielbild löschen?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Möchtest du dieses Zielbild wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete?.();
                    setShowDeleteConfirm(false);
                  }}
                >
                  Löschen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};