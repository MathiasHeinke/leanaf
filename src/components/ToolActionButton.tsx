import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell,
  Scale,
  Pill,
  Camera,
  Play,
  BookOpen,
  Target
} from 'lucide-react';

interface ToolActionButtonProps {
  tool: string;
  label: string;
  description?: string;
  onClick: () => void;
  isVisible: boolean;
  className?: string;
}

const TOOL_ICONS: Record<string, React.ComponentType<any>> = {
  trainingsplan: Dumbbell,
  gewicht: Scale,
  supplement: Pill,
  foto: Camera,
  quickworkout: Play,
  uebung: BookOpen,
  diary: BookOpen,
  goalCheckin: Target,
};

export const ToolActionButton = memo(({
  tool,
  label,
  description,
  onClick,
  isVisible,
  className = ""
}: ToolActionButtonProps) => {
  const Icon = TOOL_ICONS[tool] || BookOpen;

  if (!isVisible) return null;

  return (
    <div className={`tool-action-button-container ${className}`}>
      <Button
        onClick={onClick}
        variant="outline"
        size="default"
        className="
          flex items-center gap-2 
          bg-white/10 backdrop-blur-sm
          border-white/20 hover:border-white/40
          text-foreground hover:text-foreground
          hover:bg-white/20 transition-all duration-200
          shadow-lg hover:shadow-xl
          rounded-xl
          font-medium
          min-h-11
        "
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </Button>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 italic">
          {description}
        </p>
      )}
    </div>
  );
});

ToolActionButton.displayName = 'ToolActionButton';