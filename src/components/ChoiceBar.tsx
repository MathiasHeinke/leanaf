import React from 'react';

interface ChoiceBarProps {
  prompt: string;
  options: [string, string];
  onPick: (value: string) => void;
}

export default function ChoiceBar({ prompt, options, onPick }: ChoiceBarProps) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="text-sm mb-2 text-foreground/90">{prompt}</div>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
