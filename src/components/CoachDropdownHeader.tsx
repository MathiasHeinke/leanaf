import { ChevronDown, ArrowLeft, Trash2, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface CoachDropdownHeaderProps {
  name: string;
  image: string;
  onClearHistory?: () => void;
  onViewHistory?: () => void;
}

export const CoachDropdownHeader = ({ 
  name, 
  image, 
  onClearHistory, 
  onViewHistory 
}: CoachDropdownHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <img 
            src={image} 
            alt={`${name} Avatar`}
            className="w-8 h-8 rounded-full object-cover border-2 border-primary/20" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
          <div className="font-semibold text-foreground">{name}</div>
          <ChevronDown className="text-primary w-5 h-5 chevron-visible" />
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        {onViewHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewHistory}
            className="text-muted-foreground hover:text-foreground p-2"
            title="Verlauf anzeigen"
          >
            <History className="h-4 w-4" />
          </Button>
        )}
        
        {onClearHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
            className="text-muted-foreground hover:text-destructive p-2"
            title="Chat löschen"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};