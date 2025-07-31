import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Zap, Target, Flame, Dumbbell, Brain } from 'lucide-react';

export const DualCoachAccess: React.FC = () => {
  const navigate = useNavigate();

  const coaches = [
    {
      id: 'sascha',
      name: 'Sascha Weber',
      title: 'Performance- & Trainingsexperte',
      avatar: '/coach-images/9e4f4475-6b1f-4563-806d-89f78ba853e6.png',
      gradientColors: 'from-red-500 to-red-600',
      badges: ['Intelligente Planung', 'Progressive Overload', 'Kraftaufbau'],
      buttonText: 'Training mit Sascha starten',
      route: '/coach/sascha',
      icon: Target
    },
    {
      id: 'markus',
      name: 'Markus Rühl',
      title: 'The German Beast',
      avatar: '/coach-images/markus-ruehl.jpg',
      gradientColors: 'from-orange-500 to-orange-600',
      badges: ['Heavy+Volume', 'Extreme Hypertrophie', 'Mentale Härte'],
      buttonText: 'Beast Mode mit Markus',
      route: '/coach/markus',
      icon: Flame
    }
  ];

  const handleCoachSelect = (route: string) => {
    navigate(route);
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
        <div className="grid grid-cols-1 gap-4">
          {coaches.map((coach) => {
            const IconComponent = coach.icon;
            return (
              <div
                key={coach.id}
                className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${coach.gradientColors} p-1 group hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className="bg-card rounded-md p-4 h-full">
                  {/* Avatar and Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <img
                        src={coach.avatar}
                        alt={coach.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20"
                        onError={(e) => {
                          // Fallback to gradient circle with initials
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = `w-12 h-12 rounded-full bg-gradient-to-br ${coach.gradientColors} flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/20`;
                          fallback.textContent = coach.name.split(' ').map(n => n[0]).join('');
                          target.parentNode?.appendChild(fallback);
                        }}
                      />
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br ${coach.gradientColors} flex items-center justify-center`}>
                        <IconComponent className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm truncate">{coach.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{coach.title}</p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {coach.badges.map((badge, index) => (
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
                    onClick={() => handleCoachSelect(coach.route)}
                    className={`w-full bg-gradient-to-r ${coach.gradientColors} hover:opacity-90 text-white border-0 text-xs font-medium py-2 h-8`}
                  >
                    <Dumbbell className="h-3 w-3 mr-1" />
                    {coach.buttonText}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};