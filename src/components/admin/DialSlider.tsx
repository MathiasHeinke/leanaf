/**
 * DialSlider Component
 * 
 * Zeigt einen Slider für einen Personality Dial (1-10)
 * mit farbiger Visualisierung und Beschreibung.
 */

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface DialSliderProps {
  /** Name des Dials */
  name: string;
  /** Label für Anzeige */
  label: string;
  /** Aktueller Wert (1-10) */
  value: number;
  /** Callback bei Änderung */
  onChange: (value: number) => void;
  /** Beschreibungen für niedrig/mittel/hoch */
  descriptions?: {
    low: string;   // 1-3
    mid: string;   // 4-6
    high: string;  // 7-10
  };
  /** Deaktiviert */
  disabled?: boolean;
}

/**
 * Default-Beschreibungen für jeden Dial-Typ
 */
const DIAL_DESCRIPTIONS: Record<string, { low: string; mid: string; high: string }> = {
  energy: {
    low: 'Ruhig & bedacht',
    mid: 'Ausgeglichen',
    high: 'Energetisch & motivierend'
  },
  directness: {
    low: 'Sanft & diplomatisch',
    mid: 'Klar aber respektvoll',
    high: 'Sehr direkt & unverblümt'
  },
  humor: {
    low: 'Ernst & fokussiert',
    mid: 'Gelegentlich humorvoll',
    high: 'Sehr humorvoll & locker'
  },
  warmth: {
    low: 'Sachlich & professionell',
    mid: 'Freundlich & zugänglich',
    high: 'Sehr warm & empathisch'
  },
  depth: {
    low: 'Praktisch & action-orientiert',
    mid: 'Erklärt bei Bedarf',
    high: 'Tiefgründig & philosophisch'
  },
  challenge: {
    low: 'Unterstützend & sanft',
    mid: 'Ausgewogen fordernd',
    high: 'Sehr fordernd & pushend'
  },
  opinion: {
    low: 'Neutral & ausgewogen',
    mid: 'Teilt Meinung wenn gefragt',
    high: 'Starke eigene Meinung'
  },
  phraseFrequency: {
    low: 'Neutral (keine Floskeln)',
    mid: 'Gelegentlich (natürlich)',
    high: 'Häufig (kann übertrieben wirken)'
  }
};

/**
 * Gibt Farbklasse basierend auf Wert zurück
 */
const getColorClass = (value: number, name: string): string => {
  // Spezielle Farblogik für bestimmte Dials
  if (name === 'challenge') {
    if (value <= 3) return 'bg-blue-500';
    if (value <= 6) return 'bg-green-500';
    return 'bg-orange-500';
  }
  if (name === 'phraseFrequency') {
    if (value <= 3) return 'bg-gray-400';
    if (value <= 6) return 'bg-green-500';
    return 'bg-yellow-500'; // Warnung bei hohen Werten
  }
  
  // Standard: niedrig=blau, mittel=grün, hoch=orange
  if (value <= 3) return 'bg-blue-500';
  if (value <= 6) return 'bg-green-500';
  return 'bg-orange-500';
};

/**
 * Gibt Beschreibung basierend auf Wert zurück
 */
const getDescription = (
  value: number, 
  name: string, 
  customDescriptions?: { low: string; mid: string; high: string }
): string => {
  const descriptions = customDescriptions || DIAL_DESCRIPTIONS[name] || {
    low: 'Niedrig',
    mid: 'Mittel',
    high: 'Hoch'
  };
  
  if (value <= 3) return descriptions.low;
  if (value <= 6) return descriptions.mid;
  return descriptions.high;
};

export const DialSlider: React.FC<DialSliderProps> = ({
  name,
  label,
  value,
  onChange,
  descriptions,
  disabled = false
}) => {
  const colorClass = getColorClass(value, name);
  const description = getDescription(value, name, descriptions);
  
  return (
    <div className="space-y-2">
      {/* Header mit Label und Wert */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white",
            colorClass
          )}>
            {value}
          </span>
        </div>
      </div>
      
      {/* Slider */}
      <div className="relative">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={name === 'phraseFrequency' ? 0 : 1}
          max={10}
          step={1}
          disabled={disabled}
          className={cn(
            "cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        {/* Skala unter dem Slider */}
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{name === 'phraseFrequency' ? '0' : '1'}</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>
      
      {/* Beschreibung */}
      <p className={cn(
        "text-xs transition-colors",
        value <= 3 ? "text-blue-600 dark:text-blue-400" :
        value <= 6 ? "text-green-600 dark:text-green-400" :
        "text-orange-600 dark:text-orange-400"
      )}>
        {description}
      </p>
    </div>
  );
};

export default DialSlider;
