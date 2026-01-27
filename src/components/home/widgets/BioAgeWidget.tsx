import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, TrendingDown, TrendingUp, Minus, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useAresBioAge } from '@/hooks/useAresBioAge';
import { useBioAge } from '@/hooks/useBioAge';
import { useUserProfile } from '@/hooks/useUserProfile';

interface BioAgeWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;
}

export const BioAgeWidget: React.FC<BioAgeWidgetProps> = ({ size, onOpenSheet }) => {
  const navigate = useNavigate();
  const { proxyBioAge, agingPace, chronoAge, confidenceLevel, loading: proxyLoading } = useAresBioAge();
  const { latestMeasurement, loading: dunedinLoading } = useBioAge();
  const { profileData } = useUserProfile();
  
  // Check if user has DunedinPACE measurement
  const hasDunedin = latestMeasurement?.measurement_type === 'dunedin_pace';
  
  // Use DunedinPACE if available, otherwise use proxy
  const bioAge = hasDunedin 
    ? latestMeasurement?.calculated_bio_age 
    : proxyBioAge;
  const chrono = hasDunedin 
    ? latestMeasurement?.chronological_age || profileData?.age || 0
    : chronoAge || profileData?.age || 0;
  
  const loading = proxyLoading || dunedinLoading;
  
  const ageDiff = bioAge && chrono ? bioAge - chrono : null;
  
  const isYounger = ageDiff !== null && ageDiff < 0;
  const isOlder = ageDiff !== null && ageDiff > 0;
  
  const TrendIcon = isYounger ? TrendingDown : isOlder ? TrendingUp : Minus;
  const trendColor = isYounger 
    ? 'text-emerald-500' 
    : isOlder 
      ? 'text-red-500' 
      : 'text-muted-foreground';
  
  const bgGradientFlat = isYounger 
    ? 'from-emerald-500/20 to-emerald-400/10' 
    : isOlder 
      ? 'from-destructive/20 to-destructive/10' 
      : 'from-muted/20 to-muted/10';

  const handleClick = () => {
    if (onOpenSheet) {
      onOpenSheet();
    } else {
      navigate('/bio-age');
    }
  };

  // FLAT: Horizontal compact strip
  if (size === 'flat') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
      >
        {/* Background Fill */}
        {bioAge && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className={cn("absolute inset-0 bg-gradient-to-r", bgGradientFlat)}
          />
        )}
        
        {/* Icon */}
        <div className={cn(
          "relative z-10 p-2 rounded-xl",
          isYounger 
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            : isOlder
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        )}>
          <Sparkles className="w-5 h-5" />
        </div>
        
        {/* Label */}
        <span className="relative z-10 text-sm font-medium text-foreground shrink-0">Bio-Alter</span>
        
        {/* Middle: Age Comparison */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          {bioAge ? (
            <span className="text-sm text-muted-foreground">
              Bio <span className="font-bold text-foreground">{typeof bioAge === 'number' ? bioAge.toFixed(1) : bioAge}</span> vs <span className="font-bold text-muted-foreground">{chrono}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Berechnung läuft...</span>
          )}
        </div>
        
        {/* Value: Trend */}
        {bioAge && ageDiff !== null ? (
          <div className={cn("relative z-10 flex items-center gap-1 shrink-0", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-bold">
              {Math.abs(ageDiff).toFixed(1)} J. {isYounger ? 'jünger' : isOlder ? 'älter' : ''}
            </span>
          </div>
        ) : (
          <span className="relative z-10 text-sm font-bold text-muted-foreground/50 shrink-0">--</span>
        )}
      </motion.div>
    );
  }

  // LARGE / WIDE: Full details
  if (size === 'large' || size === 'wide') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
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
              <p className="text-3xl font-bold text-foreground">{typeof bioAge === 'number' ? bioAge.toFixed(1) : bioAge}</p>
              <p className="text-xs text-muted-foreground">Bio-Age</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <TrendIcon className={cn("w-6 h-6", trendColor)} />
              <p className={cn("text-lg font-semibold", trendColor)}>
                {ageDiff !== null ? (ageDiff > 0 ? '+' : '') + ageDiff.toFixed(1) : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isYounger ? 'Jahre jünger' : isOlder ? 'Jahre älter' : 'Jahre'}
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-muted-foreground">{chrono}</p>
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
        onClick={handleClick}
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
              <p className="text-2xl font-bold text-foreground">{typeof bioAge === 'number' ? bioAge.toFixed(1) : bioAge}</p>
              <p className="text-xs text-muted-foreground">Bio-Age</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-muted-foreground/50">--</p>
              <p className="text-xs text-muted-foreground">Berechnung...</p>
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
      onClick={handleClick}
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
