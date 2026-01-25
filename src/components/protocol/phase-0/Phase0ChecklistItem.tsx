import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  Check, 
  X, 
  Loader2,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
  Skull,
  Heart,
  Quote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItemProgress } from '@/hooks/usePhase0ItemProgress';
import { Phase0Checklist } from '@/hooks/useProtocolStatus';
import { useNavigate } from 'react-router-dom';
import { LIFE_IMPACT_DATA } from './lifeImpactData';
import { LifeImpactBadge } from './LifeImpactBadge';

interface Phase0ChecklistItemProps {
  item: {
    key: keyof Phase0Checklist;
    title: string;
    description: string;
    icon: React.ElementType;
    autoValidate?: boolean;
  };
  progress: ItemProgress | null;
  isCompleted: boolean;
  isOpen: boolean;
  isValidating: boolean;
  onToggle: () => void;
  onManualCheck: (completed: boolean) => void;
}

export function Phase0ChecklistItem({
  item,
  progress,
  isCompleted,
  isOpen,
  isValidating,
  onToggle,
  onManualCheck,
}: Phase0ChecklistItemProps) {
  const navigate = useNavigate();
  const Icon = item.icon;
  
  // Get extended life impact data
  const lifeData = LIFE_IMPACT_DATA[item.key];

  const getTrendIcon = () => {
    if (!progress?.stats?.trend) return null;
    switch (progress.stats.trend) {
      case 'down': return <TrendingDown className="w-4 h-4 text-primary" />;
      case 'up': return <TrendingUp className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return 'text-primary';
    if (progress?.status === 'in_progress') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  // Use extended sub-items from life impact data if available
  const displaySubItems = lifeData?.subItems || progress?.subItems || [];

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={cn(
        "transition-all",
        isCompleted && "border-primary/50 bg-primary/5"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                isCompleted ? "bg-primary/20" : "bg-muted"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isCompleted ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  
                  {/* Life Impact Badge */}
                  {lifeData && (
                    <LifeImpactBadge 
                      years={lifeData.impact.years}
                      label={lifeData.impact.label}
                      color={lifeData.impact.color}
                      size="sm"
                    />
                  )}
                  
                  {item.autoValidate && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Auto
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  {item.description}
                </CardDescription>
                
                {/* Progress Bar - Always visible */}
                {progress && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={getStatusColor()}>
                        {progress.current}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        {getTrendIcon()}
                        Ziel: {progress.target}
                      </span>
                    </div>
                    <Progress 
                      value={progress.progress} 
                      className={cn(
                        "h-1.5",
                        isCompleted && "[&>div]:bg-primary"
                      )}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {isCompleted ? (
                  <div className="p-1 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="p-1 rounded-full bg-muted">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-4 space-y-4">
              
              {/* Life Impact Warning Section */}
              {lifeData && lifeData.impact.years !== 0 && (
                <div className={cn(
                  "p-3 rounded-lg border",
                  lifeData.impact.years < 0 
                    ? "bg-destructive/10 border-destructive/30" 
                    : "bg-primary/10 border-primary/30"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {lifeData.impact.years < 0 ? (
                      <Skull className="w-4 h-4 text-destructive" />
                    ) : (
                      <Heart className="w-4 h-4 text-primary" />
                    )}
                    <span className={cn(
                      "text-sm font-semibold",
                      lifeData.impact.years < 0 ? "text-destructive" : "text-primary"
                    )}>
                      LEBENSZEIT-IMPACT: {lifeData.impact.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Scientific "Why" Section */}
              {lifeData && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{lifeData.whyTitle}</span>
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {lifeData.whyContent.map((content, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground list-disc">
                        {content}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ARES Quote */}
              {lifeData?.aresQuote && (
                <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border-l-2 border-amber-500">
                  <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm italic text-muted-foreground">
                    "{lifeData.aresQuote}"
                  </p>
                </div>
              )}

              {/* Stats for auto-validated items */}
              {item.autoValidate && progress?.stats && (
                <div className="grid grid-cols-2 gap-3">
                  {progress.stats.daysTracked !== undefined && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Getrackte Tage</div>
                      <div className="text-lg font-semibold">
                        {progress.stats.daysTracked}
                        <span className="text-sm text-muted-foreground">/{progress.stats.daysRequired}</span>
                      </div>
                    </div>
                  )}
                  {progress.stats.average !== undefined && progress.stats.targetValue !== undefined && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Durchschnitt</div>
                      <div className={cn(
                        "text-lg font-semibold",
                        progress.stats.average >= progress.stats.targetValue ? "text-primary" : "text-amber-500"
                      )}>
                        {progress.stats.average}
                        <span className="text-sm text-muted-foreground">
                          {item.key === 'sleep_score' ? 'h' : 'g'}
                        </span>
                      </div>
                    </div>
                  )}
                  {progress.stats.measurements !== undefined && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Messungen</div>
                      <div className="text-lg font-semibold">
                        {progress.stats.measurements}
                        <span className="text-sm text-muted-foreground">/{progress.stats.measurementsRequired}</span>
                      </div>
                    </div>
                  )}
                  {progress.stats.trend && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground">Trend</div>
                      <div className={cn(
                        "text-lg font-semibold flex items-center gap-1",
                        progress.stats.trend === 'down' ? "text-primary" : 
                        progress.stats.trend === 'up' ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {progress.stats.trend === 'down' ? '↓ Fallend' : 
                         progress.stats.trend === 'up' ? '↑ Steigend' : '→ Stabil'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-items checklist - Using extended data */}
              {displaySubItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.autoValidate ? 'Status der Teilziele:' : 'Bestätige diese Punkte:'}
                  </p>
                  {displaySubItems.map((subItem, idx) => {
                    // For manual items, check if all are completed based on parent completion
                    const isSubCompleted = item.autoValidate 
                      ? (progress?.subItems?.[idx]?.completed ?? false)
                      : isCompleted;
                    
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-lg transition-colors",
                          isSubCompleted ? "bg-primary/10" : "bg-muted/30"
                        )}
                      >
                        {item.autoValidate ? (
                          <div className={cn(
                            "mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                            isSubCompleted ? "bg-primary" : "bg-muted"
                          )}>
                            {isSubCompleted ? (
                              <Check className="w-3 h-3 text-primary-foreground" />
                            ) : (
                              <X className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        ) : (
                          <Checkbox 
                            id={`${item.key}-${idx}`}
                            checked={isCompleted}
                            className="mt-0.5"
                            disabled={isCompleted}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`${item.key}-${idx}`}
                            className={cn(
                              "text-sm cursor-pointer block",
                              isSubCompleted && "text-primary"
                            )}
                          >
                            {subItem.label}
                          </label>
                          {subItem.explanation && (
                            <span className="text-xs text-muted-foreground">
                              {subItem.explanation}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {item.autoValidate ? (
                  <>
                    {isValidating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validiere aus deinen Daten...
                      </div>
                    ) : isCompleted ? (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Check className="w-4 h-4" />
                        Automatisch validiert ✓
                      </div>
                    ) : progress?.actionHref && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(progress.actionHref!)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {progress.actionLabel}
                      </Button>
                    )}
                  </>
                ) : (
                  !isCompleted && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => onManualCheck(true)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Alle Punkte erfüllt - Bestätigen
                    </Button>
                  )
                )}
                
                {isCompleted && !item.autoValidate && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onManualCheck(false)}
                    className="text-muted-foreground"
                  >
                    Zurücksetzen
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
