import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Leaf, Pill, FlaskConical, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProtocolMode = 'natural' | 'enhanced' | 'clinical';

interface ProtocolModeSelectorProps {
  mode: ProtocolMode;
  onModeChange: (mode: ProtocolMode) => void;
  currentPhase?: number;
  phaseProgress?: { completed: number; total: number };
}

const modeConfig: Record<ProtocolMode, {
  icon: React.ReactNode;
  emoji: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  natural: {
    icon: <Leaf className="h-5 w-5" />,
    emoji: '🌱',
    label: 'Natural',
    description: 'Nur Diät & Training',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500',
  },
  enhanced: {
    icon: <Pill className="h-5 w-5" />,
    emoji: '💊',
    label: 'Enhanced',
    description: 'Reta / Peptide',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500',
  },
  clinical: {
    icon: <FlaskConical className="h-5 w-5" />,
    emoji: '🔬',
    label: 'Klinisch',
    description: 'TRT / HRT+',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
  },
};

const phaseNames: Record<number, string> = {
  0: 'Fundament',
  1: 'Rekomposition',
  2: 'Fine-Tuning',
  3: 'Longevity',
};

export const ProtocolModeSelector: React.FC<ProtocolModeSelectorProps> = ({
  mode,
  onModeChange,
  currentPhase = 0,
  phaseProgress,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-lg md:text-xl font-bold">ARES Protokoll-Modus</h2>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(modeConfig) as ProtocolMode[]).map((modeKey) => {
              const config = modeConfig[modeKey];
              const isSelected = mode === modeKey;
              
              return (
                <div
                  key={modeKey}
                  onClick={() => onModeChange(modeKey)}
                  className={cn(
                    'relative flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all',
                    isSelected 
                      ? `${config.borderColor} ${config.bgColor}` 
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <span className="text-2xl mb-1">{config.emoji}</span>
                  <div className={cn('font-bold text-sm', isSelected && config.color)}>
                    {config.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">
                    {config.description}
                  </div>
                  {isSelected && (
                    <CheckCircle className={cn('absolute top-1.5 right-1.5 h-4 w-4', config.color)} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Phase Badge */}
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-8 w-8 rounded-lg flex items-center justify-center font-bold text-lg',
                  currentPhase === 0 && 'bg-slate-500/20 text-slate-400',
                  currentPhase === 1 && 'bg-emerald-500/20 text-emerald-500',
                  currentPhase === 2 && 'bg-amber-500/20 text-amber-500',
                  currentPhase === 3 && 'bg-purple-500/20 text-purple-500',
                )}>
                  {currentPhase}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    Phase {currentPhase}: {phaseNames[currentPhase] || 'Unbekannt'}
                  </div>
                  {phaseProgress && (
                    <div className="text-xs text-muted-foreground">
                      {phaseProgress.completed}/{phaseProgress.total} Kriterien erfüllt
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Read-only
              </Badge>
            </div>
          </div>

          {/* Mode-specific hints */}
          <div className="text-xs text-muted-foreground">
            {mode === 'natural' && (
              <p>💡 Konservatives Defizit (max 500 kcal/Tag) empfohlen für optimalen Muskelerhalt.</p>
            )}
            {mode === 'enhanced' && (
              <p>💡 GLP-1 schützt Muskeln – aggressivere Defizite (bis 750 kcal/Tag) möglich.</p>
            )}
            {mode === 'clinical' && (
              <p>💡 TRT ermöglicht maximale Rekomposition – individuelle Anpassung durch Coach.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProtocolModeSelector;
