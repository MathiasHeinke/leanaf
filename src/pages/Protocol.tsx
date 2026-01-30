import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProtocolStatus } from '@/hooks/useProtocolStatus';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { 
  FlaskConical, 
  Shield, 
  Zap, 
  Target, 
  Infinity,
  Loader2,
  AlertCircle,
  Pause,
  Play,
} from 'lucide-react';
import { Phase0Checklist } from '@/components/protocol/phase-0/Phase0Checklist';
import { Phase1Overview } from '@/components/protocol/phase-1/Phase1Overview';
import { Phase2Overview } from '@/components/protocol/phase-2/Phase2Overview';
import { Phase3Overview } from '@/components/protocol/phase-3/Phase3Overview';
import { cn } from '@/lib/utils';

const PHASE_INFO = [
  { 
    id: 0, 
    name: 'Fundament', 
    icon: Shield, 
    color: 'text-amber-500',
    description: 'Via Negativa - Entferne was schadet'
  },
  { 
    id: 1, 
    name: 'Rekomposition', 
    icon: Zap, 
    color: 'text-emerald-500',
    description: '6 Monate aggressive Transformation'
  },
  { 
    id: 2, 
    name: 'Fine-Tuning', 
    icon: Target, 
    color: 'text-blue-500',
    description: 'Mitochondrien & Telomere'
  },
  { 
    id: 3, 
    name: 'Longevity', 
    icon: Infinity, 
    color: 'text-purple-500',
    description: 'Lebenslanges Maintenance'
  }
];

export default function ProtocolPage() {
  const { user, loading: authLoading } = useAuth();
  const { 
    status, 
    loading, 
    phase0Progress, 
    canUnlockPhase1,
    pauseProtocol,
    resumeProtocol,
    
    unlockPhase1
  } = useProtocolStatus();

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const currentPhase = status?.current_phase ?? 0;
  const isPaused = status?.is_paused ?? false;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FlaskConical className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ARES Protokoll</h1>
            <p className="text-sm text-muted-foreground">
              Dein Weg zu Ästhetik, Maskulinität & Langlebigkeit
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          {currentPhase > 0 && (
            <Button
              variant={isPaused ? 'default' : 'outline'}
              size="sm"
              onClick={() => isPaused ? resumeProtocol() : pauseProtocol('other')}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Fortsetzen
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Phase Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            {PHASE_INFO.map((phase, idx) => {
              const Icon = phase.icon;
              const isCompleted = currentPhase > phase.id;
              const isActive = currentPhase === phase.id;
              const isLocked = currentPhase < phase.id;
              
              return (
                <div key={phase.id} className="flex flex-col items-center flex-1">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive && "bg-primary/20 ring-2 ring-primary ring-offset-2",
                    isLocked && "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-xs mt-2 font-medium",
                    isActive && "text-primary",
                    isLocked && "text-muted-foreground"
                  )}>
                    Phase {phase.id}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {phase.name}
                  </span>
                  
                  {/* Connector line */}
                  {idx < PHASE_INFO.length - 1 && (
                    <div className="hidden sm:block absolute transform translate-x-full">
                      <div className={cn(
                        "w-16 h-0.5 mt-6",
                        currentPhase > phase.id ? "bg-primary" : "bg-muted"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Current Phase Info */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={isPaused ? 'secondary' : 'default'}>
                    Phase {currentPhase}: {PHASE_INFO[currentPhase].name}
                  </Badge>
                  {isPaused && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pausiert
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {PHASE_INFO[currentPhase].description}
                </p>
              </div>
              
              {currentPhase === 0 && (
                <div className="text-right flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold">{phase0Progress}/8</div>
                    <div className="text-xs text-muted-foreground">Checks erfüllt</div>
                    <Progress value={(phase0Progress / 8) * 100} className="w-24 mt-1" />
                  </div>
                  {canUnlockPhase1 && (
                    <Button onClick={() => unlockPhase1()} size="sm">
                      Phase 1 starten
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Content - Direct based on currentPhase */}
      <div className="mt-6">
        {currentPhase === 0 && <Phase0Checklist />}
        {currentPhase === 1 && <Phase1Overview />}
        {currentPhase === 2 && <Phase2Overview />}
        {currentPhase === 3 && <Phase3Overview />}
      </div>
    </div>
  );
}
