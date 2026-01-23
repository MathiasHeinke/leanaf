import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Sparkles } from 'lucide-react';

export interface PersonaPreview {
  id: string;
  name: string;
  icon: string;
  description: string;
  example_quote: string;
  is_active: boolean;
  energy: number;
  directness: number;
  humor: number;
  warmth: number;
}

interface PersonaCardProps {
  persona: PersonaPreview;
  isSelected: boolean;
  onSelect: () => void;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isSelected, onSelect }) => {
  // Persona-specific styling for the new 4-persona system
  const personaStyles: Record<string, { border: string; bg: string; accent: string }> = {
    lester: { 
      border: 'border-yellow-500', 
      bg: 'bg-yellow-500/10', 
      accent: 'text-yellow-500' 
    },
    ares: { 
      border: 'border-red-500', 
      bg: 'bg-red-500/10', 
      accent: 'text-red-500' 
    },
    markus: { 
      border: 'border-amber-500', 
      bg: 'bg-amber-500/10', 
      accent: 'text-amber-500' 
    },
    freya: { 
      border: 'border-emerald-500', 
      bg: 'bg-emerald-500/10', 
      accent: 'text-emerald-500' 
    },
    // Legacy IDs (fallbacks)
    standard: { 
      border: 'border-blue-500', 
      bg: 'bg-blue-500/10', 
      accent: 'text-blue-500' 
    },
    krieger: { 
      border: 'border-red-500', 
      bg: 'bg-red-500/10', 
      accent: 'text-red-500' 
    },
    ruehl: { 
      border: 'border-amber-500', 
      bg: 'bg-amber-500/10', 
      accent: 'text-amber-500' 
    },
    sanft: { 
      border: 'border-emerald-500', 
      bg: 'bg-emerald-500/10', 
      accent: 'text-emerald-500' 
    },
  };

  const style = personaStyles[persona.id] || personaStyles.lester;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:scale-[1.02] relative overflow-hidden',
        isSelected 
          ? `${style.border} ${style.bg} border-2 shadow-lg` 
          : 'border border-border hover:border-primary/50'
      )}
      onClick={onSelect}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className={cn('h-5 w-5', style.accent)} />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {/* Icon and Name */}
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label={persona.name}>
            {persona.icon}
          </span>
          <div>
            <h3 className="font-bold text-base">{persona.name}</h3>
            {!persona.is_active && (
              <Badge variant="outline" className="text-xs mt-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Bald verfügbar
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {persona.description}
        </p>

        {/* Dial preview bars */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 text-muted-foreground">Energie</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn('h-full rounded-full', style.border.replace('border-', 'bg-'))} 
                style={{ width: `${persona.energy * 10}%` }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 text-muted-foreground">Direkt</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn('h-full rounded-full', style.border.replace('border-', 'bg-'))} 
                style={{ width: `${persona.directness * 10}%` }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 text-muted-foreground">Humor</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn('h-full rounded-full', style.border.replace('border-', 'bg-'))} 
                style={{ width: `${persona.humor * 10}%` }} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-16 text-muted-foreground">Wärme</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn('h-full rounded-full', style.border.replace('border-', 'bg-'))} 
                style={{ width: `${persona.warmth * 10}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Example quote */}
        <div className={cn(
          'p-3 rounded-lg border text-sm italic',
          isSelected ? style.bg : 'bg-muted/50'
        )}>
          <span className="text-muted-foreground">"</span>
          {persona.example_quote}
          <span className="text-muted-foreground">"</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonaCard;
