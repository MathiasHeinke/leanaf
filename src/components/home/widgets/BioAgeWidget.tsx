import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useBioAge } from '@/hooks/useBioAge';
import { useUserProfile } from '@/hooks/useUserProfile';

interface BioAgeWidgetProps {
  size: WidgetSize;
}

export const BioAgeWidget: React.FC<BioAgeWidgetProps> = ({ size }) => {
  const navigate = useNavigate();
  const { latestMeasurement, loading } = useBioAge();
  const { profileData } = useUserProfile();
  
  const chronoAge = profileData?.age || 0;
  const bioAge = latestMeasurement?.calculated_bio_age;
  const ageDiff = bioAge && chronoAge ? bioAge - chronoAge : null;
  
  const isYounger = ageDiff !== null && ageDiff < 0;
  const isOlder = ageDiff !== null && ageDiff > 0;
  
  const TrendIcon = isYounger ? TrendingDown : isOlder ? TrendingUp : Minus;
  const trendColor = isYounger 
    ? 'text-emerald-500' 
    : isOlder 
      ? 'text-red-500' 
      : 'text-muted-foreground';

  // LARGE / WIDE: Full details
  if (size === 'large' || size === 'wide') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/bio-age')}
        className={cn(
          "h-full rounded-2xl p-4 cursor-pointer transition-all",
          isYounger 
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/50 dark:border-emerald-800/30"
            : isOlder
              ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200/50 dark:border-red-800/30"
              : "bg-card/80 border border-border/50"
        )}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              isYounger 
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                : isOlder
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
            )}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Biologisches Alter</p>
              <p className="text-xs text-muted-foreground">vs. chronologisches Alter</p>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="animate-pulse h-16 bg-muted/50 rounded" />
        ) : bioAge ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-foreground">{bioAge}</p>
              <p className="text-xs text-muted-foreground">Bio-Age</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <TrendIcon className={cn("w-6 h-6", trendColor)} />
              <p className={cn("text-lg font-semibold", trendColor)}>
                {ageDiff !== null ? (ageDiff > 0 ? '+' : '') + ageDiff : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isYounger ? 'Jahre jünger' : isOlder ? 'Jahre älter' : 'Jahre'}
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-muted-foreground">{chronoAge}</p>
              <p className="text-xs text-muted-foreground">Chrono</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <Heart className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Kein Bio-Age Test<br/>vorhanden
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  // MEDIUM: Compact display
  if (size === 'medium') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => navigate('/bio-age')}
        className={cn(
          "h-full rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between",
          isYounger 
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/50"
            : isOlder
              ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200/50"
              : "bg-card/80 border border-border/50"
        )}
      >
        <div className="flex justify-between items-start">
          <div className={cn(
            "p-2 rounded-xl",
            isYounger 
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              : isOlder
                ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                : "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
          )}>
            <Sparkles className="w-5 h-5" />
          </div>
          {ageDiff !== null && (
            <div className={cn("flex items-center gap-0.5", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{Math.abs(ageDiff)}</span>
            </div>
          )}
        </div>

        <div>
          {bioAge ? (
            <>
              <p className="text-2xl font-bold text-foreground">{bioAge}</p>
              <p className="text-xs text-muted-foreground">Bio-Age</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-muted-foreground/50">--</p>
              <p className="text-xs text-muted-foreground">Kein Test</p>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // SMALL: Minimal
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={() => navigate('/bio-age')}
      className={cn(
        "h-full rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between",
        isYounger 
          ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50"
          : isOlder
            ? "bg-red-50 dark:bg-red-950/20 border border-red-200/50"
            : "bg-card/80 border border-border/50"
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn(
          "p-2 rounded-xl",
          isYounger 
            ? "bg-emerald-100 text-emerald-600"
            : isOlder
              ? "bg-red-100 text-red-600"
              : "bg-purple-100 text-purple-600"
        )}>
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-[10px] text-muted-foreground">Bio</span>
      </div>

      <div>
        <p className={cn(
          "text-xl font-bold",
          bioAge ? "text-foreground" : "text-muted-foreground/50"
        )}>
          {bioAge || '--'}
        </p>
        <p className="text-[10px] text-muted-foreground">Jahre</p>
      </div>
    </motion.div>
  );
};
