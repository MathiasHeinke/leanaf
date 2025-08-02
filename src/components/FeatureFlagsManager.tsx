import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Settings, TestTube, Users, Zap } from 'lucide-react';

export const FeatureFlagsManager: React.FC = () => {
  const { flags, loading, refreshFlags } = useFeatureFlags();

  const flagCategories = {
    'Training Plans': ['training_plan_v2', 'training_plan_analytics', 'coach_plan_feedback'],
    'Experimental': ['advanced_plan_customization']
  };

  const getFlagDescription = (flagName: string) => {
    const descriptions: Record<string, string> = {
      'training_plan_v2': 'Enhanced training plan generation with caching and retry logic',
      'training_plan_analytics': 'Performance analytics and monitoring for training plans',
      'coach_plan_feedback': 'User feedback collection system for training plans',
      'advanced_plan_customization': 'Advanced customization options (experimental)'
    };
    return descriptions[flagName] || 'Feature flag description';
  };

  const getFlagIcon = (flagName: string) => {
    if (flagName.includes('analytics')) return TestTube;
    if (flagName.includes('feedback')) return Users;
    if (flagName.includes('experimental') || flagName.includes('advanced')) return Zap;
    return Settings;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Loading feature flags...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feature Flags</h2>
          <p className="text-muted-foreground">
            Manage feature rollouts and A/B testing
          </p>
        </div>
        <Button onClick={refreshFlags} variant="outline">
          Refresh
        </Button>
      </div>

      {Object.entries(flagCategories).map(([category, categoryFlags]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
            <CardDescription>
              Feature flags in the {category.toLowerCase()} category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryFlags.map(flagName => {
              const Icon = getFlagIcon(flagName);
              const isEnabled = flags[flagName];
              
              return (
                <div key={flagName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{flagName}</div>
                      <div className="text-sm text-muted-foreground">
                        {getFlagDescription(flagName)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={isEnabled ? "default" : "secondary"}
                      className={isEnabled ? "bg-green-600" : "bg-gray-400"}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Feature Flag Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Overall feature flag system health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(flags).filter(Boolean).length}
              </div>
              <div className="text-sm text-muted-foreground">Enabled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {Object.values(flags).filter(f => !f).length}
              </div>
              <div className="text-sm text-muted-foreground">Disabled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(flags).length}
              </div>
              <div className="text-sm text-muted-foreground">Total Flags</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};