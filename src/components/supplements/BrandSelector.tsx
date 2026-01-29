/**
 * BrandSelector - Dropdown for selecting supplement manufacturer
 * Shows [Brand Name] · [Quality Stars] · [Price/Day]
 */

import React, { useMemo } from 'react';
import { Star, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SupplementProduct } from '@/types/supplementLibrary';

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
const QualityStars = ({ count }: { count: number }) => (
  <span className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={cn(
          'h-2.5 w-2.5',
          i <= count 
            ? 'fill-amber-400 text-amber-400' 
            : 'fill-muted text-muted'
        )}
      />
    ))}
  </span>
);

// Brand option with metadata
interface BrandOption {
  brandId: string;
  brandName: string;
  qualityStars: number;
  pricePerDay: number | null;
  isRecommended: boolean;
  bestProduct: SupplementProduct;
}

export interface BrandSelectorProps {
  products: SupplementProduct[];
  selectedBrandId: string | null;
  onSelect: (brandId: string, product: SupplementProduct) => void;
  loading?: boolean;
  className?: string;
}

export const BrandSelector: React.FC<BrandSelectorProps> = ({
  products,
  selectedBrandId,
  onSelect,
  loading = false,
  className,
}) => {
  // Group products by brand and find best product per brand
  const brandOptions = useMemo<BrandOption[]>(() => {
    const brandMap = new Map<string, SupplementProduct[]>();
    
    products.forEach((product) => {
      const brandId = product.brand_id || 'unknown';
      if (!brandMap.has(brandId)) {
        brandMap.set(brandId, []);
      }
      brandMap.get(brandId)!.push(product);
    });
    
    const options: BrandOption[] = [];
    
    brandMap.forEach((brandProducts, brandId) => {
      // Sort: recommended first, then by price
      const sorted = [...brandProducts].sort((a, b) => {
        if (a.is_recommended && !b.is_recommended) return -1;
        if (!a.is_recommended && b.is_recommended) return 1;
        return (a.price_per_serving ?? 999) - (b.price_per_serving ?? 999);
      });
      
      const best = sorted[0];
      const hasRecommended = brandProducts.some(p => p.is_recommended);
      
      options.push({
        brandId,
        brandName: best.brand?.name || 'Unbekannt',
        qualityStars: getQualityStars(best.brand?.price_tier),
        pricePerDay: best.price_per_serving,
        isRecommended: hasRecommended,
        bestProduct: best,
      });
    });
    
    // Sort options: recommended first, then by price
    return options.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return (a.pricePerDay ?? 999) - (b.pricePerDay ?? 999);
    });
  }, [products]);

  // Get currently selected option
  const selectedOption = brandOptions.find(o => o.brandId === selectedBrandId);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-3", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">Lade Hersteller...</span>
      </div>
    );
  }

  if (brandOptions.length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground py-2", className)}>
        Keine Produkte verfügbar
      </div>
    );
  }

  return (
    <Select
      value={selectedBrandId || undefined}
      onValueChange={(brandId) => {
        const option = brandOptions.find(o => o.brandId === brandId);
        if (option) {
          onSelect(brandId, option.bestProduct);
        }
      }}
    >
      <SelectTrigger className={cn("h-10", className)}>
        <SelectValue placeholder="Hersteller wählen...">
          {selectedOption && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate">{selectedOption.brandName}</span>
              <QualityStars count={selectedOption.qualityStars} />
              {selectedOption.pricePerDay != null && (
                <span className="text-muted-foreground">
                  €{selectedOption.pricePerDay.toFixed(2)}/Tag
                </span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {brandOptions.map((option) => (
          <SelectItem 
            key={option.brandId} 
            value={option.brandId}
            className="py-2"
          >
            <div className="flex items-center gap-2 w-full">
              <span className="font-medium">{option.brandName}</span>
              <QualityStars count={option.qualityStars} />
              {option.pricePerDay != null && (
                <span className="text-muted-foreground text-xs">
                  €{option.pricePerDay.toFixed(2)}/Tag
                </span>
              )}
              {option.isRecommended && (
                <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded ml-auto">
                  Empfohlen
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BrandSelector;
