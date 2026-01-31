import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Cigarette, Wine, Pill, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SmokingStatus = 'never' | 'occasional' | 'regular' | 'quit';
export type VapingStatus = 'never' | 'occasional' | 'regular';
export type AlcoholFrequency = 'never' | 'rare' | 'monthly' | 'weekly' | 'daily';
export type SubstanceUse = 'none' | 'occasional' | 'regular';

export interface LifestyleData {
  smokingStatus: SmokingStatus | null;
  smokingAmount: number | null;
  smokingQuitDate: string | null;
  vapingStatus: VapingStatus | null;
  alcoholFrequency: AlcoholFrequency | null;
  alcoholDrinksPerWeek: number | null;
  substanceUse: SubstanceUse | null;
  substanceDetails: string | null;
}

interface LifestyleScreeningProps {
  data: LifestyleData;
  onChange: (data: LifestyleData) => void;
  isComplete?: boolean;
}

export function LifestyleScreening({ data, onChange, isComplete }: LifestyleScreeningProps) {
  const updateField = <K extends keyof LifestyleData>(field: K, value: LifestyleData[K]) => {
    onChange({ ...data, [field]: value });
  };

  // Calculate if section is complete
  const isSectionComplete = 
    data.smokingStatus !== null && 
    data.alcoholFrequency !== null && 
    data.substanceUse !== null;

  // Show warning based on lifestyle choices
  const hasRiskFactors = 
    (data.smokingStatus === 'regular' || data.smokingStatus === 'occasional') ||
    (data.vapingStatus === 'regular' || data.vapingStatus === 'occasional') ||
    data.alcoholFrequency === 'weekly' || 
    data.alcoholFrequency === 'daily' ||
    data.substanceUse === 'regular';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-orange-500 rounded-xl flex items-center justify-center">
          <Cigarette className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold">Lifestyle & Toxine</h2>
          <p className="text-sm text-muted-foreground">Für präzise Analysen und Empfehlungen</p>
        </div>
        {isSectionComplete && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
      </div>

      {/* Smoking Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Cigarette className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Rauchen / Vapen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rauchst du Zigaretten?</Label>
            <RadioGroup
              value={data.smokingStatus || ''}
              onValueChange={(v) => updateField('smokingStatus', v as SmokingStatus)}
              className="grid grid-cols-2 gap-2"
            >
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.smokingStatus === 'never' && "border-green-500 bg-green-500/10"
              )}>
                <RadioGroupItem value="never" id="smoke-never" />
                <Label htmlFor="smoke-never" className="cursor-pointer flex-1">Nein, nie</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.smokingStatus === 'quit' && "border-blue-500 bg-blue-500/10"
              )}>
                <RadioGroupItem value="quit" id="smoke-quit" />
                <Label htmlFor="smoke-quit" className="cursor-pointer flex-1">Aufgehört</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.smokingStatus === 'occasional' && "border-orange-500 bg-orange-500/10"
              )}>
                <RadioGroupItem value="occasional" id="smoke-occasional" />
                <Label htmlFor="smoke-occasional" className="cursor-pointer flex-1">Gelegentlich</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.smokingStatus === 'regular' && "border-red-500 bg-red-500/10"
              )}>
                <RadioGroupItem value="regular" id="smoke-regular" />
                <Label htmlFor="smoke-regular" className="cursor-pointer flex-1">Regelmäßig</Label>
              </div>
            </RadioGroup>
          </div>

          {(data.smokingStatus === 'occasional' || data.smokingStatus === 'regular') && (
            <div className="space-y-2">
              <Label className="text-sm">Wie viele Zigaretten pro Tag?</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={data.smokingAmount || ''}
                onChange={(e) => updateField('smokingAmount', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="z.B. 10"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Vapest / dampfst du?</Label>
            <RadioGroup
              value={data.vapingStatus || ''}
              onValueChange={(v) => updateField('vapingStatus', v as VapingStatus)}
              className="grid grid-cols-3 gap-2"
            >
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.vapingStatus === 'never' && "border-green-500 bg-green-500/10"
              )}>
                <RadioGroupItem value="never" id="vape-never" />
                <Label htmlFor="vape-never" className="cursor-pointer flex-1">Nein</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.vapingStatus === 'occasional' && "border-orange-500 bg-orange-500/10"
              )}>
                <RadioGroupItem value="occasional" id="vape-occasional" />
                <Label htmlFor="vape-occasional" className="cursor-pointer flex-1">Selten</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.vapingStatus === 'regular' && "border-red-500 bg-red-500/10"
              )}>
                <RadioGroupItem value="regular" id="vape-regular" />
                <Label htmlFor="vape-regular" className="cursor-pointer flex-1">Regelmäßig</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Alcohol Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wine className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Alkohol</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Wie oft trinkst du Alkohol?</Label>
            <RadioGroup
              value={data.alcoholFrequency || ''}
              onValueChange={(v) => updateField('alcoholFrequency', v as AlcoholFrequency)}
              className="space-y-2"
            >
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.alcoholFrequency === 'never' && "border-green-500 bg-green-500/10"
              )}>
                <RadioGroupItem value="never" id="alcohol-never" />
                <Label htmlFor="alcohol-never" className="cursor-pointer flex-1">Nie (0 Alkohol)</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.alcoholFrequency === 'rare' && "border-green-500 bg-green-500/10"
              )}>
                <RadioGroupItem value="rare" id="alcohol-rare" />
                <Label htmlFor="alcohol-rare" className="cursor-pointer flex-1">Selten ({"<"}2× pro Jahr, z.B. Hochzeit)</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.alcoholFrequency === 'monthly' && "border-yellow-500 bg-yellow-500/10"
              )}>
                <RadioGroupItem value="monthly" id="alcohol-monthly" />
                <Label htmlFor="alcohol-monthly" className="cursor-pointer flex-1">Monatlich (1-3× pro Monat)</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.alcoholFrequency === 'weekly' && "border-orange-500 bg-orange-500/10"
              )}>
                <RadioGroupItem value="weekly" id="alcohol-weekly" />
                <Label htmlFor="alcohol-weekly" className="cursor-pointer flex-1">Wöchentlich</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.alcoholFrequency === 'daily' && "border-red-500 bg-red-500/10"
              )}>
                <RadioGroupItem value="daily" id="alcohol-daily" />
                <Label htmlFor="alcohol-daily" className="cursor-pointer flex-1">Täglich</Label>
              </div>
            </RadioGroup>
          </div>

          {(data.alcoholFrequency === 'weekly' || data.alcoholFrequency === 'daily') && (
            <div className="space-y-2">
              <Label className="text-sm">Durchschnittliche Drinks pro Woche?</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={data.alcoholDrinksPerWeek || ''}
                onChange={(e) => updateField('alcoholDrinksPerWeek', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="z.B. 5"
              />
              <p className="text-xs text-muted-foreground">1 Drink = 1 Bier / 1 Glas Wein / 1 Shot</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Substances Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Andere Substanzen</CardTitle>
          </div>
          <CardDescription>Cannabis, Stimulanzien, etc. – keine Verurteilung, nur für deine Analyse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Konsumierst du andere Substanzen?</Label>
            <RadioGroup
              value={data.substanceUse || ''}
              onValueChange={(v) => updateField('substanceUse', v as SubstanceUse)}
              className="grid grid-cols-3 gap-2"
            >
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.substanceUse === 'none' && "border-green-500 bg-green-500/10"
              )}>
                <RadioGroupItem value="none" id="substance-none" />
                <Label htmlFor="substance-none" className="cursor-pointer flex-1">Nein</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.substanceUse === 'occasional' && "border-orange-500 bg-orange-500/10"
              )}>
                <RadioGroupItem value="occasional" id="substance-occasional" />
                <Label htmlFor="substance-occasional" className="cursor-pointer flex-1">Selten</Label>
              </div>
              <div className={cn(
                "flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors",
                data.substanceUse === 'regular' && "border-red-500 bg-red-500/10"
              )}>
                <RadioGroupItem value="regular" id="substance-regular" />
                <Label htmlFor="substance-regular" className="cursor-pointer flex-1">Regelmäßig</Label>
              </div>
            </RadioGroup>
          </div>

          {(data.substanceUse === 'occasional' || data.substanceUse === 'regular') && (
            <div className="space-y-2">
              <Label className="text-sm">Welche Substanzen? (optional)</Label>
              <Textarea
                value={data.substanceDetails || ''}
                onChange={(e) => updateField('substanceDetails', e.target.value || null)}
                placeholder="z.B. Cannabis, Koffein-Tabletten..."
                className="min-h-[60px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Warning */}
      {hasRiskFactors && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-600">Risikofaktoren erkannt</p>
                <p className="text-xs text-muted-foreground">
                  Das ARES Protokoll setzt auf "Via Negativa" – erst entfernen, was schadet. 
                  Diese Faktoren können die Wirkung von Interventionen (TRT, Peptide, Longevity) 
                  um bis zu 80% reduzieren.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
