import { useState } from 'react';
import { Wrench, Dumbbell, Camera, Pill, Scale, BookOpen, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Tool {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ToolPickerProps {
  onToolSelect: (tool: string | null) => void;
  selectedTool: string | null;
  /** schiebt sofort eine system.tool-Message in den Chat-Store */
  pushSystemTool?: (tool: string | null) => void;
}

const tools: Tool[] = [
  { id: 'trainingsplan', label: 'Trainingsplan', icon: <Dumbbell className="w-4 h-4" /> },
  { id: 'uebung', label: 'Übung hinzufügen', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'supplement', label: 'Supplement', icon: <Pill className="w-4 h-4" /> },
  { id: 'gewicht', label: 'Gewicht', icon: <Scale className="w-4 h-4" /> },
  { id: 'foto', label: 'Fortschritt-Foto', icon: <Camera className="w-4 h-4" /> },
];

export const ToolPicker = ({ onToolSelect, selectedTool, pushSystemTool }: ToolPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleToolSelect = (toolId: string) => {
    const next = toolId === selectedTool ? null : toolId;
    onToolSelect(next);
    pushSystemTool?.(next);          // <-- neue system.tool-Msg
    setOpen(false);                  // <-- Popover darf weiter geschlossen werden
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "icon-btn group transition-all duration-300",
            selectedTool ? 'bg-primary text-primary-foreground scale-105 ring-2 ring-primary/70' : ''
          )}
          aria-label="Tools & Anhänge"
          aria-pressed={!!selectedTool}
          id="toolBtn"
        >
          <Wrench className={`w-6 h-6 transition-all duration-300 ${selectedTool ? 'rotate-12' : 'group-hover:rotate-12'} group-hover:scale-110`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start" side="top">
        <div className="space-y-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={cn(
                "tool-item w-full rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                selectedTool === tool.id && "tool-item-active"
              )}
            >
              <div className="flex items-center gap-3">
                {tool.icon}
                <span>{tool.label}</span>
              </div>
            </button>
          ))}
          {selectedTool && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => handleToolSelect('')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-[1.02] group"
              >
                <span className="transition-transform duration-300 group-hover:rotate-90">
                  <Plus className="w-4 h-4 rotate-45" />
                </span>
                Tool entfernen
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};