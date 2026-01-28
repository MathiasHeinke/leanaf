import React from 'react';
import { AlertTriangle, Sparkles, Clock, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserStackItem, SupplementLibraryItem } from '@/types/supplementLibrary';

interface InteractionWarningsProps {
  supplement: SupplementLibraryItem;
  userStack?: UserStackItem[];
  showAll?: boolean;
  className?: string;
}

interface Warning {
  type: 'missing_synergy' | 'blocker' | 'cycling' | 'general';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
}

/**
 * InteractionWarnings - Shows synergy/blocker warnings for supplements
 * - Missing Synergy Alert (yellow): "D3 ohne K2 - Empfehlung: K2 ergänzen"
 * - Blocker Warning (red): "Eisen + Kaffee - 2h Abstand halten!"
 * - Cycling Reminder: "Ashwagandha - Zyklus-Pause in 2 Wochen"
 */
export const InteractionWarnings: React.FC<InteractionWarningsProps> = ({
  supplement,
  userStack = [],
  showAll = false,
  className,
}) => {
  const warnings: Warning[] = [];
  
  // Get user's current supplement names (lowercase for comparison)
  const userSupplementNames = new Set(
    userStack.map(s => s.name.toLowerCase().trim())
  );
  
  // Check for missing synergies
  if (supplement.synergies && supplement.synergies.length > 0) {
    const missingSynergies = supplement.synergies.filter(
      synergy => !userSupplementNames.has(synergy.toLowerCase().trim())
    );
    
    if (missingSynergies.length > 0) {
      warnings.push({
        type: 'missing_synergy',
        severity: 'warning',
        title: `Synergien: +${missingSynergies.join(', +')}`,
        description: `Empfohlen für bessere Wirkung`,
      });
    }
  }
  
  // Check for blockers - show timing warnings
  if (supplement.blockers && supplement.blockers.length > 0) {
    warnings.push({
      type: 'blocker',
      severity: 'critical',
      title: `Nicht kombinieren mit: ${supplement.blockers.join(', ')}`,
      description: 'Mindestens 2h Abstand halten',
    });
  }
  
  // Check for cycling requirements
  if (supplement.cycling_required) {
    warnings.push({
      type: 'cycling',
      severity: 'info',
      title: 'Zyklisierung empfohlen',
      description: supplement.cycling_protocol || '8 Wochen on, 2 Wochen off',
    });
  }
  
  // Check for general warnings
  if (supplement.warnung) {
    warnings.push({
      type: 'general',
      severity: 'warning',
      title: 'Hinweis',
      description: supplement.warnung,
    });
  }
  
  // Filter to show only critical warnings if not showAll
  const displayWarnings = showAll 
    ? warnings 
    : warnings.filter(w => w.severity === 'critical' || w.severity === 'warning');
  
  if (displayWarnings.length === 0) return null;
  
  const getIcon = (type: Warning['type']) => {
    switch (type) {
      case 'missing_synergy': return Sparkles;
      case 'blocker': return AlertTriangle;
      case 'cycling': return Clock;
      default: return Info;
    }
  };
  
  const getSeverityStyles = (severity: Warning['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30 text-red-600';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
    }
  };
  
  return (
    <div className={cn('space-y-2', className)}>
      {displayWarnings.map((warning, index) => {
        const Icon = getIcon(warning.type);
        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-2 p-2 rounded-lg border text-sm',
              getSeverityStyles(warning.severity)
            )}
          >
            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{warning.title}</p>
              <p className="text-xs opacity-80">{warning.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Compact inline version for cards
export const InteractionBadges: React.FC<{
  supplement: SupplementLibraryItem;
  className?: string;
}> = ({ supplement, className }) => {
  const badges: { label: string; variant: 'synergy' | 'blocker' | 'cycling' }[] = [];
  
  if (supplement.synergies && supplement.synergies.length > 0) {
    badges.push({ label: `+${supplement.synergies[0]}`, variant: 'synergy' });
  }
  
  if (supplement.blockers && supplement.blockers.length > 0) {
    badges.push({ label: `⚠️ ${supplement.blockers[0]}`, variant: 'blocker' });
  }
  
  if (supplement.cycling_required) {
    badges.push({ label: '🔄 Zyklisch', variant: 'cycling' });
  }
  
  if (badges.length === 0) return null;
  
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {badges.slice(0, 2).map((badge, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0',
            badge.variant === 'synergy' && 'border-green-500/30 text-green-600',
            badge.variant === 'blocker' && 'border-red-500/30 text-red-600',
            badge.variant === 'cycling' && 'border-blue-500/30 text-blue-600'
          )}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
};

export default InteractionWarnings;
