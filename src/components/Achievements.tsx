import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Star } from 'lucide-react';

export const Achievements = () => {
  const achievements = [
    { id: 1, title: 'Erste Woche', description: '7 Tage am Ball geblieben', icon: Trophy, unlocked: true },
    { id: 2, title: 'Kalorienziel', description: 'Tagesziel erreicht', icon: Star, unlocked: true },
    { id: 3, title: 'Fortgeschrittener', description: '30 Tage aktiv', icon: Medal, unlocked: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Erfolge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-3 rounded-lg border ${
                achievement.unlocked ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-muted-foreground/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <achievement.icon className={`h-4 w-4 ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`font-medium ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {achievement.title}
                </span>
                {achievement.unlocked && <Badge variant="secondary">Erreicht</Badge>}
              </div>
              <p className={`text-sm ${achievement.unlocked ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                {achievement.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};