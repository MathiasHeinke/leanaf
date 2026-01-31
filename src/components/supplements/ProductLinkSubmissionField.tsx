import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Loader2, Check, AlertCircle, X, ExternalLink, Sparkles, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useProductSubmissions, type ExtractedProduct, type MatchedSupplement } from '@/hooks/useProductSubmissions';

interface ProductLinkSubmissionFieldProps {
  supplementId?: string;
  supplementName?: string;
  onSuccess?: (submissionId: string) => void;
  onCancel?: () => void;
  className?: string;
  compact?: boolean;
}

export const ProductLinkSubmissionField: React.FC<ProductLinkSubmissionFieldProps> = ({
  supplementId,
  supplementName,
  onSuccess,
  onCancel,
  className,
  compact = false,
}) => {
  const [url, setUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    state,
    result,
    errorMessage,
    scrapeUrl,
    confirmSubmission,
    reset,
    isLoading,
  } = useProductSubmissions();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;
    
    await scrapeUrl(url);
  }, [url, isLoading, scrapeUrl]);

  const handleConfirm = useCallback(() => {
    confirmSubmission();
    if (result?.submission_id && onSuccess) {
      onSuccess(result.submission_id);
    }
    // Reset after short delay
    setTimeout(() => {
      reset();
      setUrl('');
      setIsExpanded(false);
    }, 2000);
  }, [confirmSubmission, result, onSuccess, reset]);

  const handleCancel = useCallback(() => {
    reset();
    setUrl('');
    setIsExpanded(false);
    onCancel?.();
  }, [reset, onCancel]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('http') || pastedText.includes('amazon') || pastedText.includes('iherb')) {
      setUrl(pastedText);
    }
  }, []);

  // Compact trigger button
  if (!isExpanded && compact) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border',
          'hover:bg-muted/50 transition-colors text-muted-foreground text-sm',
          className
        )}
      >
        <Link2 className="h-4 w-4" />
        <span>Produkt per Link hinzufügen</span>
      </button>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4 text-primary" />
            <span className="font-medium">Produkt per Link hinzufügen</span>
          </div>
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Idle / Input State */}
        {(state === 'idle' || state === 'error') && (
          <motion.form
            key="input"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onSubmit={handleSubmit}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                placeholder="https://amazon.de/dp/..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!url.trim() || isLoading}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Prüfen'
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Unterstützt: Amazon, iHerb, Sunday Natural, ESN, More Nutrition, DocMorris, Shop-Apotheke + 50 weitere
            </p>

            {/* Error Message */}
            {state === 'error' && errorMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMessage}</p>
              </motion.div>
            )}
          </motion.form>
        )}

        {/* Scraping State */}
        {state === 'scraping' && (
          <motion.div
            key="scraping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 gap-3"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extrahiere Produktdaten...</p>
          </motion.div>
        )}

        {/* Preview State */}
        {state === 'preview' && result?.extracted && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <ProductPreviewCard
              product={result.extracted}
              matchedSupplement={result.matched_supplement}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Zur Prüfung einreichen
              </Button>
            </div>
          </motion.div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 gap-3"
          >
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">Produkt eingereicht!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Du wirst benachrichtigt, sobald es freigegeben ist.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-component for product preview
interface ProductPreviewCardProps {
  product: ExtractedProduct;
  matchedSupplement?: MatchedSupplement | null;
}

const ProductPreviewCard: React.FC<ProductPreviewCardProps> = ({ product, matchedSupplement }) => {
  return (
    <Card className="p-4 space-y-3">
      {/* Product Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2">{product.product_name}</h4>
          {product.brand_name && (
            <p className="text-xs text-muted-foreground">{product.brand_name}</p>
          )}
        </div>
      </div>

      {/* Matched Supplement */}
      {matchedSupplement && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs">
            Erkannter Wirkstoff: <strong>{matchedSupplement.name}</strong>
          </span>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {Math.round(matchedSupplement.confidence * 100)}%
          </Badge>
        </div>
      )}

      {/* Product Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {product.dose_per_serving && (
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground">Dosis</span>
            <p className="font-medium">
              {product.dose_per_serving} {product.dose_unit || 'mg'}
            </p>
          </div>
        )}
        
        {product.pack_size && (
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground">Packung</span>
            <p className="font-medium">
              {product.pack_size} {product.pack_unit || 'Stück'}
            </p>
          </div>
        )}
        
        {product.price_eur && (
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground">Preis</span>
            <p className="font-medium">€{product.price_eur.toFixed(2)}</p>
          </div>
        )}
        
        {product.price_per_serving && (
          <div className="p-2 rounded bg-muted/50">
            <span className="text-muted-foreground">Pro Tag</span>
            <p className="font-medium">€{product.price_per_serving.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Quality Tags */}
      {product.quality_tags && product.quality_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.quality_tags.slice(0, 5).map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
};
