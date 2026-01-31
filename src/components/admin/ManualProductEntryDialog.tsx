import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Package, DollarSign, Hash, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProductSubmission, ExtendedEnrichedData } from '@/hooks/useProductSubmissionsAdmin';

interface ManualProductEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: ProductSubmission | null;
  onSuccess: () => void;
}

export function ManualProductEntryDialog({
  open,
  onOpenChange,
  submission,
  onSuccess,
}: ManualProductEntryDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    brand_name: '',
    price_eur: '',
    pack_size: '',
    pack_unit: '',
    servings_per_pack: '',
    dose_per_serving: '',
    dose_unit: '',
    description: '',
  });

  // Initialize form with existing data when dialog opens
  useEffect(() => {
    if (submission?.extracted_data) {
      const data = submission.extracted_data;
      setFormData({
        product_name: data.product_name || '',
        brand_name: data.brand_name || '',
        price_eur: data.price_eur?.toString() || '',
        pack_size: data.pack_size?.toString() || '',
        pack_unit: data.pack_unit || '',
        servings_per_pack: data.servings_per_pack?.toString() || '',
        dose_per_serving: data.dose_per_serving?.toString() || '',
        dose_unit: data.dose_unit || '',
        description: data.description || data.short_description || '',
      });
    }
  }, [submission]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!submission) return;

    setSaving(true);
    try {
      // Build updated extracted_data
      const updatedData: Partial<ExtendedEnrichedData> = {
        ...(submission.extracted_data || {}),
        product_name: formData.product_name || undefined,
        brand_name: formData.brand_name || null,
        price_eur: formData.price_eur ? parseFloat(formData.price_eur) : null,
        pack_size: formData.pack_size ? parseInt(formData.pack_size) : null,
        pack_unit: formData.pack_unit || null,
        servings_per_pack: formData.servings_per_pack ? parseInt(formData.servings_per_pack) : null,
        dose_per_serving: formData.dose_per_serving ? parseFloat(formData.dose_per_serving) : null,
        dose_unit: formData.dose_unit || null,
        description: formData.description || null,
      };

      // Calculate price_per_serving if we have the data
      if (updatedData.price_eur && updatedData.servings_per_pack) {
        updatedData.price_per_serving = updatedData.price_eur / updatedData.servings_per_pack;
      }

      // Update submission in database
      const { error } = await supabase
        .from('product_submissions')
        .update({
          extracted_data: updatedData as any,
          product_name: updatedData.product_name,
          brand_name: updatedData.brand_name,
          price_eur: updatedData.price_eur,
          servings: updatedData.servings_per_pack,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast.success('Produktdaten erfolgreich aktualisiert!');
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('[MANUAL_ENTRY] Save failed:', err);
      toast.error('Fehler beim Speichern der Daten');
    } finally {
      setSaving(false);
    }
  };

  // Check which fields are missing
  const missingFields = {
    price: !formData.price_eur,
    pack_size: !formData.pack_size,
    servings: !formData.servings_per_pack,
    dose: !formData.dose_per_serving,
  };
  const hasMissingData = Object.values(missingFields).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produktdaten manuell ergänzen
          </DialogTitle>
          <DialogDescription>
            Fehlende Daten können hier manuell eingetragen werden.
            {hasMissingData && (
              <span className="text-amber-600 dark:text-amber-500 block mt-1">
                ⚠️ Einige wichtige Felder fehlen noch
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product_name">Produktname *</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
              placeholder="z.B. Sunday Natural Vitamin D3 5000 IU"
            />
          </div>

          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor="brand_name">Marke</Label>
            <Input
              id="brand_name"
              value={formData.brand_name}
              onChange={(e) => handleChange('brand_name', e.target.value)}
              placeholder="z.B. Sunday Natural"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price_eur" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Preis (EUR)
              {missingFields.price && <span className="text-amber-600 dark:text-amber-500 text-xs">fehlt</span>}
            </Label>
            <Input
              id="price_eur"
              type="number"
              step="0.01"
              value={formData.price_eur}
              onChange={(e) => handleChange('price_eur', e.target.value)}
              placeholder="z.B. 19.99"
              className={missingFields.price ? 'border-amber-500' : ''}
            />
          </div>

          {/* Pack Size Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pack_size" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Packungsgröße
                {missingFields.pack_size && <span className="text-amber-600 dark:text-amber-500 text-xs">fehlt</span>}
              </Label>
              <Input
                id="pack_size"
                type="number"
                value={formData.pack_size}
                onChange={(e) => handleChange('pack_size', e.target.value)}
                placeholder="z.B. 120"
                className={missingFields.pack_size ? 'border-amber-500' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pack_unit">Einheit</Label>
              <Input
                id="pack_unit"
                value={formData.pack_unit}
                onChange={(e) => handleChange('pack_unit', e.target.value)}
                placeholder="Kapseln, Tabletten, g"
              />
            </div>
          </div>

          {/* Servings */}
          <div className="space-y-2">
            <Label htmlFor="servings_per_pack" className="flex items-center gap-2">
              Portionen pro Packung
              {missingFields.servings && <span className="text-amber-600 dark:text-amber-500 text-xs">fehlt</span>}
            </Label>
            <Input
              id="servings_per_pack"
              type="number"
              value={formData.servings_per_pack}
              onChange={(e) => handleChange('servings_per_pack', e.target.value)}
              placeholder="z.B. 120 (oft = Packungsgröße bei Kapseln)"
              className={missingFields.servings ? 'border-amber-500' : ''}
            />
          </div>

          {/* Dose Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dose_per_serving" className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Dosis pro Portion
              </Label>
              <Input
                id="dose_per_serving"
                type="number"
                step="0.1"
                value={formData.dose_per_serving}
                onChange={(e) => handleChange('dose_per_serving', e.target.value)}
                placeholder="z.B. 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dose_unit">Einheit</Label>
              <Input
                id="dose_unit"
                value={formData.dose_unit}
                onChange={(e) => handleChange('dose_unit', e.target.value)}
                placeholder="mg, mcg, IU"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Kurze Produktbeschreibung..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.product_name}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
