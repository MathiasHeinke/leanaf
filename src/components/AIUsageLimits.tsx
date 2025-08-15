import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Crown, Lock } from 'lucide-react';
import { useAIUsageLimits } from '@/hooks/useAIUsageLimits';
import { useCredits } from '@/hooks/useCredits';
import { useNavigate } from 'react-router-dom';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';

interface AIUsageLimitsProps {
  featureType: 'meal_analysis' | 'coach_chat' | 'coach_recipes' | 'daily_analysis';
  className?: string;
}

export const AIUsageLimits: React.FC<AIUsageLimitsProps> = ({ featureType, className }) => {
  // ✅ UNLIMITED MODE: Show unlimited access for all users
  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Unlimited Access - All Features Available
          </span>
        </div>
      </CardContent>
    </Card>
  );
};