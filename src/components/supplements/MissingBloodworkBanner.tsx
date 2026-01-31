import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, User } from 'lucide-react';
import type { DynamicTier } from '@/types/relevanceMatrix';

interface MissingBloodworkBannerProps {
  profileCompleteness: 'full' | 'basic' | 'minimal';
  activeTier: DynamicTier;
}

/**
 * MissingBloodworkBanner - Shows data completeness warning
 * Displays when user doesn't have full bloodwork data
 */
export const MissingBloodworkBanner: React.FC<MissingBloodworkBannerProps> = ({
  profileCompleteness,
  activeTier,
}) => {
  // Only show for Essential and Optimizer when data is incomplete
  if (profileCompleteness === 'full') return null;
  if (activeTier === 'niche') return null;
  
  const isMinimal = profileCompleteness === 'minimal';
  
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50">
      <div className="mt-0.5 shrink-0">
        {isMinimal ? (
          <User className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        ) : (
          <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
          {isMinimal ? 'Profil unvollständig' : 'Blutwerte fehlen'}
        </h4>
        <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1 leading-relaxed">
          {isMinimal 
            ? 'Ohne Profildaten zeigen wir nur die Core-Supplements (Kreatin, Magnesium, etc.). Ergänze Alter, Ziele und Gewicht für bessere Empfehlungen.'
            : 'Ohne Laborwerte sind einige Supplements gecapped. Für personalisierte Empfehlungen basierend auf deinen Biomarkern, lade dein Blutbild hoch.'}
        </p>
        <Link 
          to={isMinimal ? '/profile' : '/bloodwork'}
          className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 transition-colors"
        >
          {isMinimal ? 'Profil vervollständigen' : 'Blutwerte hinzufügen'} 
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default MissingBloodworkBanner;
