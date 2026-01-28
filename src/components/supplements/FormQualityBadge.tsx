import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormQuality } from '@/types/supplementLibrary';

interface FormQualityBadgeProps {
  quality: FormQuality | null | undefined;
  form?: string | null;
  showDescription?: boolean;
  className?: string;
}

const QUALITY_CONFIG: Record<FormQuality, {
  label: string;
  description: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  optimal: {
    label: 'Optimal',
    description: 'Beste Bioverfügbarkeit',
    icon: CheckCircle2,
    variant: 'default',
    className: 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20',
  },
  gut: {
    label: 'Gut',
    description: 'Solide Aufnahme',
    icon: AlertCircle,
    variant: 'secondary',
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20',
  },
  schlecht: {
    label: 'Schlecht',
    description: 'Geringe Absorption',
    icon: XCircle,
    variant: 'destructive',
    className: 'bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20',
  },
};

/**
 * FormQualityBadge - Shows bioavailability quality of supplement form
 * Optimal (green): Best bioavailability (e.g., Bisglycinate)
 * Gut (yellow): Good absorption (e.g., Citrate)
 * Schlecht (red): Poor absorption (e.g., Oxide)
 */
export const FormQualityBadge: React.FC<FormQualityBadgeProps> = ({
  quality,
  form,
  showDescription = false,
  className,
}) => {
  if (!quality) return null;
  
  const config = QUALITY_CONFIG[quality];
  const Icon = config.icon;
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 text-xs font-medium border',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      {form && <span className="text-muted-foreground">• {form}</span>}
      {showDescription && (
        <span className="text-muted-foreground ml-1">- {config.description}</span>
      )}
    </Badge>
  );
};

export default FormQualityBadge;
