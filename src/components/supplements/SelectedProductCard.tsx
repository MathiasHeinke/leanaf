/**
 * SelectedProductCard - Compact product card shown after brand selection
 * Displays product details with info button for SupplementDetailSheet
 */

import React from 'react';
import { Info, Star, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SupplementProduct, SupplementLibraryItem } from '@/types/supplementLibrary';

// Quality stars based on price tier
const getQualityStars = (priceTier: string | null | undefined): number => {
  switch (priceTier) {
    case 'luxury': return 5;
    case 'premium': return 4;
    case 'mid': return 3;
    case 'budget': return 2;
    default: return 3;
  }
};

// Star rating display
const QualityStarsDisplay = ({ tier }: { tier: string | null | undefined }) => {
  const count = getQualityStars(tier);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i <= count 
              ? 'fill-amber-400 text-amber-400' 
              : 'fill-muted text-muted'
          )}
        />
      ))}
    </span>
  );
};

// Common certification badges
const CERT_ICONS: Record<string, string> = {
  'GMP': '🏅',
  'vegan': '🌱',
  'Vegan': '🌱',
  'organic': '🌿',
  'Organic': '🌿',
  'NSF': '✅',
  'Creapure': '💎',
  'HACCP': '🛡️',
  'ISO': '📋',
  'kosher': '✡️',
};

export interface SelectedProductCardProps {
  product: SupplementProduct;
  supplementItem: SupplementLibraryItem | null;
  onInfoClick: () => void;
  className?: string;
}

export const SelectedProductCard: React.FC<SelectedProductCardProps> = ({
  product,
  supplementItem,
  onInfoClick,
  className,
}) => {
  const brandName = product.brand?.name || 'Unbekannt';
  const certifications = product.brand?.quality_certifications || [];
  const form = product.form || supplementItem?.default_unit || 'Kapseln';
  
  return (
    <div
      className={cn(
        'relative p-3 rounded-lg border bg-card',
        product.is_recommended 
          ? 'border-primary/30 bg-primary/5' 
          : 'border-border',
        className
      )}
    >
      {/* Header with product name and info button */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {brandName} {product.product_name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <QualityStarsDisplay tier={product.brand?.price_tier} />
          </div>
        </div>
        
        {/* Info button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
          onClick={onInfoClick}
          aria-label="Mehr Infos"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Product details */}
      <div className="text-xs text-muted-foreground mb-2">
        {product.dose_per_serving}{product.dose_unit} · {product.pack_size} {form}
        {product.price_per_serving != null && (
          <span className="ml-2 text-primary font-medium">
            €{product.price_per_serving.toFixed(2)}/Tag
          </span>
        )}
      </div>
      
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Certification badges */}
        {certifications.slice(0, 3).map((cert) => (
          <Badge 
            key={cert} 
            variant="secondary" 
            className="text-[9px] px-1.5 py-0 h-5 gap-0.5"
          >
            {CERT_ICONS[cert] && <span>{CERT_ICONS[cert]}</span>}
            {cert}
          </Badge>
        ))}
        
        {/* Vegan badge if applicable */}
        {product.is_vegan && !certifications.some(c => c.toLowerCase() === 'vegan') && (
          <Badge 
            variant="secondary" 
            className="text-[9px] px-1.5 py-0 h-5 gap-0.5"
          >
            🌱 Vegan
          </Badge>
        )}
        
        {/* Recommended badge */}
        {product.is_recommended && (
          <Badge 
            className="text-[9px] px-1.5 py-0 h-5 gap-0.5 bg-primary"
          >
            <Check className="h-2.5 w-2.5" />
            Empfohlen
          </Badge>
        )}
      </div>
    </div>
  );
};

export default SelectedProductCard;
