import { useState } from 'react';
import { Plus, Dumbbell, Camera, Pill, Scale, BookOpen } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Tool {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ToolPickerProps {
  onToolSelect: (tool: string | null) => void;
  selectedTool: string | null;
}

const tools: Tool[] = [
  { id: 'trainingsplan', label: 'Trainingsplan', icon: <Dumbbell className="w-4 h-4" /> },
  { id: 'uebung', label: 'Übung hinzufügen', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'supplement', label: 'Supplement', icon: <Pill className="w-4 h-4" /> },
  { id: 'gewicht', label: 'Gewicht', icon: <Scale className="w-4 h-4" /> },
  { id: 'foto', label: 'Fortschritt-Foto', icon: <Camera className="w-4 h-4" /> },
];

export const ToolPicker = ({ onToolSelect, selectedTool }: ToolPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleToolSelect = (toolId: string) => {
    onToolSelect(toolId === selectedTool ? null : toolId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="icon-btn"
          aria-label="Tools & Anhänge"
          id="toolBtn"
        >
          <Plus className="w-6 h-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start" side="top">
        <div className="space-y-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors ${
                selectedTool === tool.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tool.icon}
              {tool.label}
            </button>
          ))}
          {selectedTool && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => handleToolSelect('')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left hover:bg-accent hover:text-accent-foreground"
              >
                ✕ Tool entfernen
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};