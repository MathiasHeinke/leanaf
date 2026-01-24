import { useMemo } from "react";
import { Protocol, PeptideEntry, TitrationScheduleData } from "./useProtocols";

export interface TodaysIntakeItem {
  protocol: Protocol;
  peptide: PeptideEntry;
  scheduledTiming: string;
  isActiveToday: boolean;
  cycleStatus: string;
  currentWeek: number;
  currentDose: number;
  currentDoseUnit: string;
}

function isCycleActiveToday(protocol: Protocol): { isActive: boolean; status: string } {
  const cycleDay = protocol.current_cycle_day || 1;
  const patternType = protocol.cycle_pattern?.type || 'continuous';

  switch (patternType) {
    case 'continuous':
      return { isActive: true, status: 'Durchgängig aktiv' };

    case '5on_2off':
      // Day 1-5 = active, 6-7 = off
      const dayInCycle = ((cycleDay - 1) % 7) + 1;
      if (dayInCycle <= 5) {
        return { isActive: true, status: `Tag ${dayInCycle}/5 aktiv` };
      } else {
        return { isActive: false, status: `Pause Tag ${dayInCycle - 5}/2` };
      }

    case '6weeks_on_pause':
      // Day 1-42 = active
      if (cycleDay <= 42) {
        const weekNum = Math.ceil(cycleDay / 7);
        return { isActive: true, status: `Woche ${weekNum}/6 (Tag ${cycleDay})` };
      } else {
        return { isActive: false, status: 'Zyklus beendet - Pause' };
      }

    default:
      return { isActive: true, status: 'Aktiv' };
  }
}

function getCurrentDoseForRetatrutid(
  peptide: PeptideEntry,
  protocol: Protocol
): number {
  const isRetatrutid = peptide.name.toLowerCase().includes('retatrutid');
  
  if (!isRetatrutid || !protocol.titration_schedule) {
    return peptide.dose;
  }

  const startDate = new Date(protocol.cycle_started_at);
  const now = new Date();
  const weeksSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const schedule = protocol.titration_schedule as TitrationScheduleData;

  if (weeksSinceStart <= 4) {
    return parseFloat((schedule.week_1_4 || '0.5mg').replace('mg', ''));
  } else if (weeksSinceStart <= 8) {
    return parseFloat((schedule.week_5_8 || '2mg').replace('mg', ''));
  } else {
    return parseFloat((schedule.week_9_12 || '4mg').replace('mg', ''));
  }
}

export function useTodaysIntake(protocols: Protocol[]): TodaysIntakeItem[] {
  return useMemo(() => {
    const items: TodaysIntakeItem[] = [];

    protocols
      .filter(p => p.is_active)
      .forEach(protocol => {
        const { isActive, status } = isCycleActiveToday(protocol);
        const startDate = new Date(protocol.cycle_started_at);
        const now = new Date();
        const weeksSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

        // Create an item for each peptide in the protocol
        protocol.peptides.forEach(peptide => {
          const currentDose = getCurrentDoseForRetatrutid(peptide, protocol);

          items.push({
            protocol,
            peptide,
            scheduledTiming: protocol.timing,
            isActiveToday: isActive,
            cycleStatus: status,
            currentWeek: weeksSinceStart,
            currentDose,
            currentDoseUnit: peptide.unit,
          });
        });
      });

    // Sort by timing
    return items.sort((a, b) => {
      const timingOrder: Record<string, number> = {
        'morning_fasted': 1,
        'pre_workout': 2,
        'twice_daily': 3,
        'evening_fasted': 4,
        'before_bed': 5,
        'weekly': 6,
      };
      return (timingOrder[a.scheduledTiming] || 99) - (timingOrder[b.scheduledTiming] || 99);
    });
  }, [protocols]);
}
