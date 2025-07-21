
import { useState, useRef, useEffect } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface InfoButtonProps {
  title: string;
  description: string;
  scientificBasis?: string;
  tips?: string[];
  linkToScience?: boolean;
  className?: string;
}

export const InfoButton = ({ 
  title, 
  description, 
  scientificBasis, 
  tips = [], 
  linkToScience = true,
  className = "" 
}: InfoButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleLearnMore = () => {
    setIsOpen(false);
    navigate('/science');
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`h-6 w-6 p-0 text-muted-foreground hover:text-primary relative z-10 ${className}`}
        title={`Info über ${title}`}
      >
        <Info className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-in fade-in-0">
      <Card ref={cardRef} className="w-full max-w-sm glass-card border-primary/30 animate-scale-in relative z-50">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Scientific Basis */}
          {scientificBasis && (
            <div className="bg-primary/5 rounded-lg p-2">
              <Badge variant="outline" className="text-xs mb-1 border-primary/30">
                Wissenschaft
              </Badge>
              <p className="text-xs text-muted-foreground">
                {scientificBasis}
              </p>
            </div>
          )}

          {/* Tips */}
          {tips.length > 0 && (
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                💡 Tipps
              </Badge>
              <ul className="space-y-1">
                {tips.map((tip, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Learn More Link */}
          {linkToScience && (
            <div className="pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLearnMore}
                className="w-full text-xs text-primary hover:text-primary/80"
              >
                Mehr über die Wissenschaft erfahren →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
