
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Apple, Target, TrendingUp } from 'lucide-react';
import { usePointsSystem } from '@/hooks/usePointsSystem';

interface DepartmentCardProps {
  department: string;
  level: number;
  points: number;
  icon: React.ReactNode;
  title: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

const DepartmentCard = ({ 
  department, 
  level, 
  points, 
  icon, 
  title, 
  color,
  gradientFrom,
  gradientTo
}: DepartmentCardProps) => {
  const nextLevelPoints = level * 50; // Each level requires 50 more points
  const progress = Math.min((points / nextLevelPoints) * 100, 100);

  return (
    <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10" 
        style={{ 
          background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          borderRadius: 'inherit'
        }}
      />
      <CardContent className="p-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="p-1.5 rounded-lg"
              style={{ 
                background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                boxShadow: `0 2px 8px ${color}30`
              }}
            >
              <div className="text-white">
                {icon}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground">Level {level}</p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-0"
            style={{ 
              backgroundColor: `${color}15`,
              color: color,
              border: `1px solid ${color}30`
            }}
          >
            {points}P
          </Badge>
        </div>
        
        <div className="space-y-1">
          <Progress 
            value={progress} 
            className="h-1.5"
            style={{ 
              background: `${color}20`,
              boxShadow: progress > 80 ? `0 0 8px ${color}60` : 'none'
            }}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[10px]">Fortschritt</span>
            <span className="font-medium text-[10px]">{points}/{nextLevelPoints}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const DepartmentProgress = () => {
  const { departmentProgress, loading } = usePointsSystem();

  const departments = [
    {
      id: 'training',
      title: 'Workouts',
      icon: <Dumbbell className="w-3.5 h-3.5" />,
      color: 'hsl(var(--destructive))',
      gradientFrom: 'hsl(0, 84%, 60%)',
      gradientTo: 'hsl(340, 84%, 60%)'
    },
    {
      id: 'nutrition',
      title: 'Ernährung',
      icon: <Apple className="w-3.5 h-3.5" />,
      color: 'hsl(var(--carbs))',
      gradientFrom: 'hsl(43, 96%, 56%)',
      gradientTo: 'hsl(30, 96%, 56%)'
    },
    {
      id: 'tracking',
      title: 'Tracker',
      icon: <Target className="w-3.5 h-3.5" />,
      color: 'hsl(var(--primary))',
      gradientFrom: 'hsl(221, 83%, 53%)',
      gradientTo: 'hsl(250, 83%, 53%)'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-2 w-12 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-2 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {departments.map((dept) => {
        const progress = departmentProgress.find(p => p.department === dept.id);
        return (
          <DepartmentCard
            key={dept.id}
            department={dept.id}
            level={progress?.level || 1}
            points={progress?.points || 0}
            icon={dept.icon}
            title={dept.title}
            color={dept.color}
            gradientFrom={dept.gradientFrom}
            gradientTo={dept.gradientTo}
          />
        );
      })}
    </div>
  );
};
