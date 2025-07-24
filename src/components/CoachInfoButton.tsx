import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Info, X, BookOpen, Target, Heart, Brain, ChevronRight } from 'lucide-react';

interface CoachInfo {
  id: string;
  name: string;
  role: string;
  scientificFoundation: string;
  keyMethods: string[];
  specializations: string[];
  evidence: string;
  interventions: string[];
  philosophy: string;
  color: string;
  imageUrl?: string;
  avatar?: string;
}

interface CoachInfoButtonProps {
  coach: CoachInfo;
  className?: string;
}

export const CoachInfoButton: React.FC<CoachInfoButtonProps> = ({ coach, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest('.coach-info-modal')) return;
      handleClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = () => {
    switch (coach.id) {
      case 'sascha':
      case 'hart':
        return Target;
      case 'lucy':
      case 'soft':
        return Heart;
      case 'kai':
      case 'motivierend':
        return Brain;
      default:
        return BookOpen;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          button: 'hover:bg-red-50 dark:hover:bg-red-950/20',
          icon: 'text-red-600 dark:text-red-400',
          gradient: 'from-red-500 to-red-600',
          badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300'
        };
      case 'pink':
        return {
          button: 'hover:bg-pink-50 dark:hover:bg-pink-950/20',
          icon: 'text-pink-600 dark:text-pink-400',
          gradient: 'from-pink-500 to-pink-600',
          badge: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-300'
        };
      case 'green':
        return {
          button: 'hover:bg-green-50 dark:hover:bg-green-950/20',
          icon: 'text-green-600 dark:text-green-400',
          gradient: 'from-green-500 to-green-600',
          badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300'
        };
      default:
        return {
          button: 'hover:bg-muted/50',
          icon: 'text-muted-foreground',
          gradient: 'from-gray-500 to-gray-600',
          badge: 'bg-muted text-muted-foreground'
        };
    }
  };

  const colors = getColorClasses(coach.color);
  const Icon = getIcon();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 w-8 p-0 rounded-full ${colors.button} ${className}`}
        onClick={handleOpen}
      >
        <Info className={`h-4 w-4 ${colors.icon}`} />
      </Button>

      {isOpen && createPortal(
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="coach-info-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="relative">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {coach.imageUrl && !imageError ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
                      <img 
                        src={coach.imageUrl} 
                        alt={coach.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-lg`}>
                      {coach.avatar || <Icon className="h-6 w-6" />}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{coach.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{coach.role}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Philosophy */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Heart className="h-4 w-4 mr-2 text-primary" />
                  Philosophie
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {coach.philosophy}
                </p>
              </div>

              <Separator />

              {/* Scientific Foundation */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2 text-primary" />
                  Wissenschaftliche Grundlage
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {coach.scientificFoundation}
                </p>
              </div>

              <Separator />

              {/* Specializations */}
              <div>
                <h4 className="font-semibold mb-3">Spezialisierungen</h4>
                <div className="grid grid-cols-2 gap-2">
                  {coach.specializations.map((spec, index) => (
                    <Badge key={index} className={colors.badge}>
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Key Methods */}
              <div>
                <h4 className="font-semibold mb-3">Kernmethoden</h4>
                <div className="space-y-2">
                  {coach.keyMethods.map((method, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <ChevronRight className="h-3 w-3 mr-2 text-primary" />
                      {method}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Evidence Base */}
              <div>
                <h4 className="font-semibold mb-3">Evidenzbasis</h4>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded leading-relaxed">
                  {coach.evidence}
                </div>
              </div>

              <Separator />

              {/* Interventions */}
              <div>
                <h4 className="font-semibold mb-3">Typische Interventionen</h4>
                <div className="grid grid-cols-1 gap-2">
                  {coach.interventions.map((intervention, index) => (
                    <div key={index} className="flex items-start text-sm">
                      <Target className="h-3 w-3 mr-2 mt-0.5 text-primary flex-shrink-0" />
                      {intervention}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>,
        document.body
      )}
    </>
  );
};