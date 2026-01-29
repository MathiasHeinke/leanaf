/**
 * BioAgeSheet - Layer 2 Bio-Age Analysis Overlay
 * Shows ARES Bio-Age Proxy score with domain breakdown and recommendations
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  ArrowRight,
  Activity,
  Moon,
  Apple,
  Zap,
  Scale,
  Lightbulb,
  ChevronRight,
  FlaskConical,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAresBioAge, DomainScores } from '@/hooks/useAresBioAge';
import { useNavigate } from 'react-router-dom';

interface BioAgeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Domain config for display
const DOMAIN_CONFIG = {
  body: { 
    label: 'Körperkomposition', 
    icon: Scale, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  fitness: { 
    label: 'Fitness & Training', 
    icon: Activity, 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  sleep: { 
    label: 'Schlaf & Recovery', 
    icon: Moon, 
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  },
  nutrition: { 
    label: 'Ernährung', 
    icon: Apple, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  hormone: { 
    label: 'Hormone & Energie', 
    icon: Zap, 
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  }
} as const;

// Get score color class
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

const getProgressColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

// Confidence badge styles
const CONFIDENCE_STYLES = {
  low: { 
    label: 'Niedrig', 
    subLabel: 'Mehr Daten tracken',
    className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' 
  },
  medium: { 
    label: 'Mittel', 
    subLabel: '28 Tage Basis',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  high: { 
    label: 'Hoch', 
    subLabel: 'Inkl. Blutwerte',
    className: 'bg-green-500/10 text-green-500 border-green-500/20' 
  }
};

export const BioAgeSheet: React.FC<BioAgeSheetProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { 
    proxyBioAge, 
    agingPace, 
    chronoAge, 
    totalScore,
    confidenceLevel, 
    domainScores, 
    hasBloodwork,
    recommendations,
    loading 
  } = useAresBioAge();

  const ageDiff = proxyBioAge - chronoAge;
  const isYounger = ageDiff < 0;
  const isOlder = ageDiff > 0;

  const TrendIcon = isYounger ? TrendingDown : isOlder ? TrendingUp : Minus;
  const trendColor = isYounger ? 'text-green-500' : isOlder ? 'text-red-500' : 'text-muted-foreground';

  // Find weakest domain
  const weakestDomain = Object.entries(domainScores).sort(([, a], [, b]) => a - b)[0]?.[0] as keyof DomainScores;

  const handleNavigateToBloodwork = () => {
    onClose();
    navigate('/bloodwork');
  };

  const handleNavigateToBioAge = () => {
    onClose();
    navigate('/bio-age');
  };

  const confidenceStyle = CONFIDENCE_STYLES[confidenceLevel];

  // Aging pace position on slider (0.75 = left, 1.25 = right)
  const pacePosition = Math.max(0, Math.min(100, ((agingPace - 0.75) / 0.5) * 100));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl p-0 flex flex-col bg-background border-t border-border/50"
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Biologisches Alter</h2>
              <p className="text-sm text-muted-foreground">ARES Bio-Age Proxy</p>
            </div>
          </div>
          {/* SheetContent hat bereits einen X-Button */}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
          
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-40 bg-muted/50 rounded-2xl" />
              <div className="h-24 bg-muted/50 rounded-2xl" />
              <div className="h-60 bg-muted/50 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Hero Section - Age Comparison */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl p-6",
                  isYounger 
                    ? "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20"
                    : isOlder
                      ? "bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20"
                      : "bg-card border border-border/30"
                )}
              >
                {/* Age Display */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  {/* Chrono Age */}
                  <div className="text-center">
                    <p className="text-4xl font-bold text-muted-foreground">{chronoAge}</p>
                    <p className="text-xs text-muted-foreground mt-1">Chrono</p>
                  </div>

                  {/* Arrow */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <ArrowRight className="w-8 h-8 text-muted-foreground/50" />
                  </motion.div>

                  {/* Bio Age */}
                  <div className="text-center">
                    <motion.p 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className={cn(
                        "text-5xl font-bold",
                        isYounger ? "text-green-500" : isOlder ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {proxyBioAge.toFixed(1)}
                    </motion.p>
                    <p className="text-xs text-muted-foreground mt-1">Bio-Age</p>
                  </div>
                </div>

                {/* Difference Badge */}
                <div className="flex justify-center mb-4">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium",
                      isYounger 
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : isOlder
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    <TrendIcon className="w-4 h-4 mr-1.5" />
                    {Math.abs(ageDiff).toFixed(1)} Jahre {isYounger ? 'jünger' : isOlder ? 'älter' : ''}
                  </Badge>
                </div>

                {/* Aging Pace Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Aging Pace</span>
                    <span className={cn(
                      "text-lg font-mono font-bold",
                      agingPace < 0.95 ? "text-green-500" : agingPace > 1.05 ? "text-red-500" : "text-yellow-500"
                    )}>
                      {agingPace.toFixed(2)} y/y
                    </span>
                  </div>
                  
                  {/* Visual Slider */}
                  <div className="relative h-3 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full">
                    <motion.div
                      initial={{ left: '50%' }}
                      animate={{ left: `${pacePosition}%` }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-foreground rounded-full shadow-lg"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>🐢 0.75 (Slow)</span>
                    <span>1.00 (Ø)</span>
                    <span>1.25 (Fast) 🔥</span>
                  </div>
                </div>
              </motion.div>

              {/* Confidence Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3"
              >
                <Badge variant="outline" className={cn("px-3 py-1.5", confidenceStyle.className)}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Confidence: {confidenceStyle.label}
                </Badge>
                <span className="text-sm text-muted-foreground">{confidenceStyle.subLabel}</span>
              </motion.div>

              {/* Domain Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  Domain Breakdown
                  <span className="text-xs text-muted-foreground/60">
                    (Score: {totalScore}/100)
                  </span>
                </h3>
                <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/30">
                  {(Object.entries(domainScores) as [keyof DomainScores, number][]).map(([domain, score], index) => {
                    const config = DOMAIN_CONFIG[domain];
                    const Icon = config.icon;
                    const isWeakest = domain === weakestDomain && score < 70;
                    
                    return (
                      <motion.div
                        key={domain}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="flex items-center gap-3 p-4"
                      >
                        <div className={cn("p-2 rounded-lg", config.bgColor)}>
                          <Icon className={cn("w-4 h-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground truncate">
                              {config.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={cn("text-sm font-bold", getScoreColor(score))}>
                                {Math.round(score)}
                              </span>
                              {isWeakest && (
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
                              className={cn("h-full rounded-full", getProgressColor(score))}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Empfehlungen
                  </h3>
                  <div className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10"
                      >
                        <span className="text-primary text-lg">💡</span>
                        <span className="text-sm text-foreground">{rec}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA for bloodwork */}
              {!hasBloodwork && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={handleNavigateToBloodwork}
                  className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <FlaskConical className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">
                      Blutwerte hinzufügen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Für höhere Confidence (PhenoAge Proxy)
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-none border-t border-border/30 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex gap-3">
            <Button
              onClick={handleNavigateToBloodwork}
              variant="outline"
              className="flex-1"
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Blutwerte
            </Button>
            <Button
              onClick={handleNavigateToBioAge}
              className="flex-1"
            >
              Details anzeigen
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
