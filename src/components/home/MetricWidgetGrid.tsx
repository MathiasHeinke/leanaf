/**
 * MetricWidgetGrid - Amazfit-style metric widgets
 * iOS Home Screen-like grid with live data
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Moon, Droplets, Activity, Scale, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlusData } from '@/hooks/usePlusData';
import { useProtocolStatus } from '@/hooks/useProtocolStatus';
import { useUserProfile } from '@/hooks/useUserProfile';

export const MetricWidgetGrid: React.FC = () => {
  const navigate = useNavigate();
  const plusData = usePlusData();
  const { status: protocolStatus, phase0Progress } = useProtocolStatus();
  const { profileData } = useUserProfile();

  // Calculate values
  const protocolPhase = protocolStatus?.current_phase || 0;
  const protocolPercent = ((phase0Progress || 0) / 9) * 100;
  
  const weeklyWorkouts = plusData.workoutLoggedToday ? 1 : 0;
  const workoutTarget = 4;
  const workoutStatus = weeklyWorkouts < workoutTarget * 0.5 ? 'low' : 
                        weeklyWorkouts >= workoutTarget ? 'good' : 'ok';

  const sleepHours = plusData.sleepDurationToday || 0;
  const sleepStatus = sleepHours >= 7 ? 'good' : sleepHours >= 5 ? 'ok' : 'low';

  const hydrationMl = plusData.hydrationMlToday || 0;
  const hydrationTarget = 3000;
  const hydrationPercent = Math.min((hydrationMl / hydrationTarget) * 100, 100);

  const currentWeight = profileData?.weight || 0;

  const phaseNames: Record<number, string> = {
    0: 'Fundament',
    1: 'Rekomposition',
    2: 'Fine-tuning',
    3: 'Longevity'
  };

  // Fake sparkline data for sleep chart
  const sleepSparkline = [40, 60, 30, 80, 50, 70, 90];

  return (
    <div className="grid grid-cols-2 gap-3">
      
      {/* ARES PROTOCOL (Wide) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={() => navigate('/protocol')}
        className="col-span-1 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/10 transition-colors min-h-[140px] flex flex-col justify-between"
      >
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
            ARES Protokoll
          </p>
          <p className="text-lg font-bold text-foreground">Phase {protocolPhase}</p>
          <p className="text-xs text-muted-foreground">{phaseNames[protocolPhase]}</p>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-[10px] font-medium mb-1.5 text-primary/80">
            <span>Progress</span>
            <span>{phase0Progress || 0}/9</span>
          </div>
          <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${protocolPercent}%` }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* TRAINING (Square) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        onClick={() => navigate('/training')}
        className={cn(
          "bg-card/80 backdrop-blur-sm border rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[140px] flex flex-col justify-between",
          workoutStatus === 'low' ? "border-destructive/30" : "border-border/50"
        )}
      >
        <div className="flex justify-between items-start">
          <div className={cn(
            "p-2 rounded-xl",
            workoutStatus === 'good' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
            workoutStatus === 'low' ? "bg-destructive/10 text-destructive" :
            "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          )}>
            <Dumbbell className="w-5 h-5" />
          </div>
          
          <span className={cn(
            "w-2 h-2 rounded-full",
            workoutStatus === 'good' ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" :
            workoutStatus === 'low' ? "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.6)]" :
            "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
          )} />
        </div>
        
        <div>
          <p className="text-2xl font-bold text-foreground">
            {weeklyWorkouts}/{workoutTarget}
          </p>
          <p className="text-xs text-muted-foreground">Workouts / Woche</p>
          
          {workoutStatus === 'low' && (
            <div className="flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3 text-destructive" />
              <span className="text-[10px] text-destructive font-medium">Zu wenig</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* SLEEP (Square with Mini-Chart) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate('/sleep')}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[140px] flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className={cn(
            "p-2 rounded-xl",
            sleepStatus === 'good' ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" :
            sleepStatus === 'low' ? "bg-destructive/10 text-destructive" :
            "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          )}>
            <Moon className="w-5 h-5" />
          </div>
          
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full",
            sleepStatus === 'good' ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" :
            sleepStatus === 'low' ? "bg-destructive/10 text-destructive" :
            "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          )}>
            {sleepStatus === 'good' ? 'Good' : sleepStatus === 'ok' ? 'OK' : 'Low'}
          </span>
        </div>
        
        {/* Mini Sparkline */}
        <div className="flex items-end justify-between gap-1 h-6 my-2">
          {sleepSparkline.map((h, i) => (
            <motion.div 
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex-1 bg-indigo-500/40 dark:bg-indigo-400/40 rounded-sm"
            />
          ))}
        </div>

        <div>
          <p className="text-2xl font-bold text-foreground">
            {sleepHours > 0 ? `${sleepHours.toFixed(0)}h` : '--'}
          </p>
          <p className="text-xs text-muted-foreground">Ø Letzte 7 Tage</p>
        </div>
      </motion.div>

      {/* HYDRATION (Square with Liquid Fill) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.25 }}
        onClick={() => navigate('/hydration')}
        className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[140px] flex flex-col justify-between overflow-hidden"
      >
        {/* Liquid Background Effect */}
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${hydrationPercent}%` }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500/30 to-cyan-400/10 animate-liquid"
        />
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
            <Droplets className="w-5 h-5" />
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-2xl font-bold text-foreground">
            {(hydrationMl / 1000).toFixed(1)}L
          </p>
          <p className="text-xs text-muted-foreground">Ziel: {(hydrationTarget / 1000).toFixed(1)}L</p>
        </div>
      </motion.div>

      {/* HRV / STRESS (Small) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 min-h-[100px] flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">HRV</span>
        </div>

        <div>
          <p className="text-xl font-bold text-foreground">-- ms</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </motion.div>

      {/* WEIGHT (Small) */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35 }}
        onClick={() => navigate('/weight')}
        className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 cursor-pointer hover:bg-accent/50 transition-colors min-h-[100px] flex flex-col justify-between"
      >
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
            <Scale className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">Gewicht</span>
        </div>

        <div>
          <p className="text-xl font-bold text-foreground">
            {currentWeight > 0 ? `${currentWeight.toFixed(1)} kg` : '-- kg'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {currentWeight > 0 ? 'Aktuell' : 'Nicht erfasst'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
