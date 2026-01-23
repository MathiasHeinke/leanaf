import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Zap, Dumbbell } from 'lucide-react';
import { COACH_REGISTRY, getDefaultCoach } from '@/lib/coachRegistry';

export const DualCoachAccess: React.FC = () => {
  const navigate = useNavigate();
  const ares = getDefaultCoach();

  const handleCoachSelect = () => {
    navigate('/coach/ares');
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-6 w-6 text-primary" />
          Persönliches Training & Coaching
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Persönliche Betreuung • Individuelle Trainingspläne • Detaillierte Analyse • Motivations-Coaching
        </p>
      </CardHeader>
      <CardContent>
        <div
          className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 p-1 group hover:scale-[1.02] transition-transform duration-200"
        >
          <div className="bg-card rounded-md p-4 h-full">
            {/* Avatar and Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <img
                  src={ares.imageUrl}
                  alt={ares.displayName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/20';
                    fallback.textContent = ares.avatar;
                    target.parentNode?.appendChild(fallback);
                  }}
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm truncate">{ares.displayName}</h3>
                <p className="text-xs text-muted-foreground truncate">{ares.role}</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1 mb-4">
              {ares.expertise.slice(0, 3).map((badge, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-2 py-0 bg-muted/60 text-muted-foreground border-0"
                >
                  {badge}
                </Badge>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleCoachSelect}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 text-white border-0 text-xs font-medium py-2 h-8"
            >
              <Dumbbell className="h-3 w-3 mr-1" />
              Training mit ARES starten
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
