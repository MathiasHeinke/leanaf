import React from 'react';
import { TypingDots } from './TypingDots';

interface TypingIndicatorProps {
  name: string;
}

export const TypingIndicator = ({ name }: TypingIndicatorProps) => (
  <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
    <span>{name} schreibt …</span>
    <TypingDots />
  </div>
);