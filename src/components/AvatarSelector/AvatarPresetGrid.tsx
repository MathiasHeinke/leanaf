import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarPresetGridProps {
  selectedPresetId?: string;
  onPresetSelect: (presetId: string, avatarUrl: string) => void;
}

const avatarPresets = [
  { id: 'strong-male', name: 'Muskulöser Mann', url: '/avatars/preset/avatar-strong-male.png' },
  { id: 'strong-female', name: 'Starke Frau', url: '/avatars/preset/avatar-strong-female.png' },
  { id: 'slim-male', name: 'Schlanker Mann', url: '/avatars/preset/avatar-slim-male.png' },
  { id: 'slim-female', name: 'Schlanke Frau', url: '/avatars/preset/avatar-slim-female.png' },
  { id: 'powerlifter-male', name: 'Powerlifter', url: '/avatars/preset/avatar-powerlifter-male.png' },
  { id: 'crossfit-female', name: 'CrossFit Athletin', url: '/avatars/preset/avatar-crossfit-female.png' },
  { id: 'superhero', name: 'Superheld', url: '/avatars/preset/avatar-superhero.png' },
  { id: 'robot', name: 'Fitness-Roboter', url: '/avatars/preset/avatar-robot.png' },
  { id: 'alien', name: 'Fitness-Alien', url: '/avatars/preset/avatar-alien.png' },
  { id: 'senior-male', name: 'Senior Mann', url: '/avatars/preset/avatar-senior-male.png' },
  { id: 'senior-female', name: 'Senior Frau', url: '/avatars/preset/avatar-senior-female.png' },
  { id: 'teen', name: 'Teenager', url: '/avatars/preset/avatar-teen.png' },
  { id: 'basketball', name: 'Basketball-Spieler', url: '/avatars/preset/avatar-basketball.png' },
  { id: 'swimmer', name: 'Schwimmer', url: '/avatars/preset/avatar-swimmer.png' },
  { id: 'cyclist', name: 'Radfahrer', url: '/avatars/preset/avatar-cyclist.png' },
];

export const AvatarPresetGrid: React.FC<AvatarPresetGridProps> = ({
  selectedPresetId,
  onPresetSelect
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {avatarPresets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onPresetSelect(preset.id, preset.url)}
          className={cn(
            "relative group p-2 rounded-lg border-2 transition-all duration-200",
            "hover:border-primary hover:shadow-md",
            selectedPresetId === preset.id
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-background"
          )}
          title={preset.name}
        >
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src={preset.url}
              alt={preset.name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          
          {selectedPresetId === preset.id && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
              ✓
            </div>
          )}
          
          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {preset.name}
          </div>
        </button>
      ))}
    </div>
  );
};