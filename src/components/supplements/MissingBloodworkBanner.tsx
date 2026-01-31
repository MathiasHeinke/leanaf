import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, User } from 'lucide-react';
import type { DynamicTier } from '@/types/relevanceMatrix';

interface MissingBloodworkBannerProps {
  profileCompleteness: 'full' | 'basic' | 'minimal';
  activeTier: DynamicTier;
  missingProfileFields?: string[];
}

// Field name to German label mapping
const FIELD_LABELS: Record<string, string> = {
  age: 'Alter',
  gender: 'Geschlecht',
  weight: 'Gewicht',
  goal: 'Ziel',
};

/**
 * MissingBloodworkBanner - Shows data completeness warning
 * Displays specific info about what's missing (bloodwork vs profile fields)
 */
export const MissingBloodworkBanner: React.FC<MissingBloodworkBannerProps> = ({
  profileCompleteness,
  activeTier,
  missingProfileFields = [],
}) => {
  // Only show for Essential and Optimizer when data is incomplete
  if (profileCompleteness === 'full') return null;
  if (activeTier === 'niche') return null;
  
  // Determine what to show based on what's actually missing
  const hasProfileFieldsMissing = missingProfileFields.length > 0;
  
  // If profile is "basic" but no fields are missing → only bloodwork is missing
  const onlyBloodworkMissing = profileCompleteness === 'basic' && !hasProfileFieldsMissing;
  
  // Generate specific field list for profile completion
  const missingFieldsText = missingProfileFields
    .map(f => FIELD_LABELS[f] || f)
    .join(', ');
  
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50">
      <div className="mt-0.5 shrink-0">
        {onlyBloodworkMissing ? (
          <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        ) : (
          <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
          {onlyBloodworkMissing ? 'Blutwerte fehlen' : 'Profil unvollständig'}
        </h4>
        <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1 leading-relaxed">
          {onlyBloodworkMissing 
            ? 'Ohne Laborwerte sind einige Supplements gecapped. Für personalisierte Empfehlungen basierend auf deinen Biomarkern, lade dein Blutbild hoch.'
            : hasProfileFieldsMissing
              ? `Ergänze ${missingFieldsText} für bessere Empfehlungen.`
              : 'Ohne Profildaten zeigen wir nur die Core-Supplements. Ergänze Alter, Ziele und Gewicht für bessere Empfehlungen.'}
        </p>
        <Link 
          to={onlyBloodworkMissing ? '/bloodwork' : '/profile'}
          className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 transition-colors"
        >
          {onlyBloodworkMissing ? 'Blutwerte hinzufügen' : 'Profil vervollständigen'} 
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default MissingBloodworkBanner;
