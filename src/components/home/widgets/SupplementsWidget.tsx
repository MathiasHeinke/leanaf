import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Pill, Check, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetSize } from '@/types/widgets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/constants/queryKeys';

interface SupplementsWidgetProps {
  size: WidgetSize;
  onOpenSheet?: () => void;
}

interface SupplementItem {
  name: string;
  taken: boolean;
}

export const SupplementsWidget: React.FC<SupplementsWidgetProps> = ({ size, onOpenSheet }) => {
  const navigate = useNavigate();

  // Click handler: prefer sheet, fallback to navigation
  const handleClick = () => {
    if (onOpenSheet) {
      onOpenSheet();
    } else {
      navigate('/supplements');
    }
  };

  // Fetch ACTIVE supplements and check which were taken today
  const { data: supplementsData } = useQuery({
    queryKey: QUERY_KEYS.SUPPLEMENTS_TODAY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { taken: 0, total: 0, items: [] as SupplementItem[] };
      
      const today = new Date().toISOString().slice(0, 10);
      
      // 1. Get ALL active user supplements
      const { data: activeSupps } = await supabase
        .from('user_supplements')
        .select('id, name, custom_name')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (!activeSupps || activeSupps.length === 0) {
        return { taken: 0, total: 0, items: [] as SupplementItem[] };
      }
      
      // 2. Get today's intake logs
      const { data: logs } = await supabase
        .from('supplement_intake_log')
        .select('user_supplement_id, taken')
        .eq('user_id', user.id)
        .eq('date', today);
      
      // Create a map of taken supplements
      const takenMap = new Map<string, boolean>();
      logs?.forEach(log => {
        if (log.taken) takenMap.set(log.user_supplement_id, true);
      });
      
      // Build items list with taken status
      const items: SupplementItem[] = activeSupps.slice(0, 4).map(supp => ({
        name: supp.custom_name || supp.name || 'Supplement',
        taken: takenMap.has(supp.id)
      }));
      
      const takenCount = items.filter(i => i.taken).length;
      
      return {
        taken: takenCount,
        total: activeSupps.length,
        items
      };
    },
    staleTime: 10000
  });

  const taken = supplementsData?.taken || 0;
  const total = supplementsData?.total || 0;
  const items = supplementsData?.items || [];
  const allTaken = total > 0 && taken === total;
  const hasSupplements = total > 0;
  const progressPercent = total > 0 ? Math.min((taken / total) * 100, 100) : 0;

  // FLAT: Horizontal compact strip with dots
  if (size === 'flat') {
    // Show up to 5 dots representing taken/total ratio
    const dotsToShow = Math.min(total, 5);
    const takenDots = Math.min(taken, dotsToShow);
    
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="col-span-2 min-h-[60px] bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3 relative overflow-hidden"
      >
        {/* Background Fill */}
        {hasSupplements && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className={cn(
              "absolute inset-0",
              allTaken 
                ? "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10"
                : "bg-gradient-to-r from-cyan-500/20 to-cyan-400/10"
            )}
          />
        )}
        
        {/* Icon */}
        <div className={cn(
          "relative z-10 p-2 rounded-xl",
          allTaken 
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            : "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
        )}>
          <Pill className="w-5 h-5" />
        </div>
        
        {/* Label */}
        <span className="relative z-10 text-sm font-medium text-foreground shrink-0">Supplements</span>
        
        {/* Supplement Dots */}
        <div className="relative z-10 flex-1 flex items-center justify-center gap-1.5">
          {hasSupplements ? (
            Array.from({ length: dotsToShow }).map((_, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={cn(
                  "w-3 h-3 rounded-full",
                  i < takenDots
                    ? "bg-emerald-500"
                    : "bg-muted/50"
                )}
              />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Keine konfiguriert</span>
          )}
        </div>
        
        {/* Value */}
        <span className={cn(
          "relative z-10 text-sm font-bold shrink-0",
          allTaken ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        )}>
          {hasSupplements ? `${taken}/${total} heute` : '--'}
        </span>
      </motion.div>
    );
  }

  // LARGE / WIDE: With supplement list
  if (size === 'large' || size === 'wide') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl",
              allTaken 
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                : "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
            )}>
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Supplements</p>
              <p className="text-xs text-muted-foreground">Heute</p>
            </div>
          </div>
          <span className={cn(
            "text-lg font-bold",
            allTaken ? "text-emerald-500" : "text-muted-foreground"
          )}>
            {taken}/{total}
          </span>
        </div>
        
        {/* Supplement Items */}
        {hasSupplements ? (
          <div className="space-y-1.5 mt-3">
            {items.map((item, i) => (
              <div 
                key={i}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm text-foreground truncate flex-1">
                  {item.name}
                </span>
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  item.taken 
                    ? "bg-emerald-500 text-white" 
                    : "bg-muted"
                )}>
                  {item.taken && <Check className="w-3 h-3" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-sm text-muted-foreground">Keine Supplements konfiguriert</p>
          </div>
        )}

        <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground">
          <span>Verwalten</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </motion.div>
    );
  }

  // MEDIUM: Status view
  if (size === 'medium') {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={handleClick}
        className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className={cn(
            "p-2 rounded-xl",
            allTaken 
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : hasSupplements
                ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                : "bg-muted text-muted-foreground"
          )}>
            <Pill className="w-5 h-5" />
          </div>
          {hasSupplements && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              allTaken 
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" 
                : "bg-muted text-muted-foreground"
            )}>
              {taken}/{total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSupplements ? (
            allTaken ? (
              <>
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">Alle eingenommen</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {total - taken} offen
                </span>
              </>
            )
          ) : (
            <span className="text-sm text-muted-foreground">Keine konfiguriert</span>
          )}
        </div>
      </motion.div>
    );
  }

  // SMALL: Compact
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={handleClick}
      className="h-full bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className={cn(
          "p-2 rounded-xl",
          allTaken 
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
        )}>
          <Pill className="w-4 h-4" />
        </div>
        {hasSupplements && (
          <span className={cn(
            "w-2 h-2 rounded-full",
            allTaken 
              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" 
              : "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
          )} />
        )}
      </div>

      <div>
        {hasSupplements ? (
          <>
            <p className="text-xl font-bold text-foreground">{taken}/{total}</p>
            <p className="text-[10px] text-muted-foreground">Supplements</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-muted-foreground/50">--</p>
            <p className="text-[10px] text-muted-foreground">Supplements</p>
          </>
        )}
      </div>
    </motion.div>
  );
};
