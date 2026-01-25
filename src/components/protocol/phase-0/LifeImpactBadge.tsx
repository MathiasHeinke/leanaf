import { Badge } from '@/components/ui/badge';
import { Skull, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifeImpactBadgeProps {
  years: number;
  label: string;
  color: 'destructive' | 'success';
  size?: 'sm' | 'md';
}

export function LifeImpactBadge({ years, label, color, size = 'md' }: LifeImpactBadgeProps) {
  const isNegative = years < 0;
  
  return (
    <Badge 
      variant={isNegative ? 'destructive' : 'default'}
      className={cn(
        "font-bold shrink-0",
        isNegative 
          ? "bg-destructive/20 text-destructive border-destructive/50 hover:bg-destructive/30" 
          : "bg-primary/20 text-primary border-primary/50 hover:bg-primary/30",
        size === 'sm' ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      {isNegative ? (
        <Skull className={cn("mr-1", size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3")} />
      ) : (
        <Heart className={cn("mr-1", size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3")} />
      )}
      {label}
    </Badge>
  );
}
