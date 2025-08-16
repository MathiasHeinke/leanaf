import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingBannerProps {
  userName?: string;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ userName }) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">
                Willkommen{userName ? `, ${userName}` : ''}! 🎉
              </h3>
            </div>
            <p className="text-muted-foreground">
              Lass uns dein Profil einrichten, um personalisierte Ziele und Empfehlungen zu erhalten.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                <span>Ziele definieren</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span>Tracking starten</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile')}
            >
              Profil einrichten
            </Button>
            <Button 
              onClick={() => navigate('/profile')}
            >
              Los geht's!
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};