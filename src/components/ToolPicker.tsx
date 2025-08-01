import { useState } from 'react';
import { Wrench, Dumbbell, Camera, Pill, Scale, BookOpen, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Tool {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface ToolPickerProps {
  onToolSelect: (tool: string | null) => void;
  selectedTool: string | null;
  /** schiebt sofort eine system.tool-Message in den Chat-Store */
  pushSystemTool?: (tool: string | null) => void;
}

const tools: Tool[] = [
  { id: 'trainingsplan', label: 'Trainingsplan', icon: <Dumbbell className="w-4 h-4" />, color: 'text-primary' },
  { id: 'uebung', label: 'Übung hinzufügen', icon: <BookOpen className="w-4 h-4" />, color: 'text-green-600' },
  { id: 'supplement', label: 'Supplement', icon: <Pill className="w-4 h-4" />, color: 'text-purple-600' },
  { id: 'gewicht', label: 'Gewicht', icon: <Scale className="w-4 h-4" />, color: 'text-orange-600' },
  { id: 'foto', label: 'Fortschritt-Foto', icon: <Camera className="w-4 h-4" />, color: 'text-pink-600' },
];

export const ToolPicker = ({ onToolSelect, selectedTool, pushSystemTool }: ToolPickerProps) => {
  const [open, setOpen] = useState(false);
  
  const selectedToolData = tools.find(tool => tool.id === selectedTool);

  const handleToolSelect = (toolId: string) => {
    const next = toolId === selectedTool ? null : toolId;
    onToolSelect(next);
    pushSystemTool?.(next);          // <-- neue system.tool-Msg
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`icon-btn group transition-all duration-300 ${selectedTool ? 'scale-105' : ''}`}
          aria-label="Tools & Anhänge"
          id="toolBtn"
        >
          <Wrench className={`w-6 h-6 transition-all duration-300 ${
            selectedTool 
              ? `rotate-12 ${selectedToolData?.color || 'text-primary'}` 
              : 'group-hover:rotate-12'
          } group-hover:scale-110`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start" side="top">
        <div className="space-y-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-left transition-all duration-200 hover:scale-[1.02] group ${
                selectedTool === tool.id
                  ? 'bg-primary text-primary-foreground scale-[1.02]'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-sm">{tool.label}</span>
              <span className="transition-transform duration-300 group-hover:scale-110">
                {tool.icon}
              </span>
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