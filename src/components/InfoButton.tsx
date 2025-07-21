
import { useState } from "react";
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

  const handleLearnMore = () => {
    setIsOpen(false);
    navigate('/science');
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`h-6 w-6 p-0 text-muted-foreground hover:text-primary ${className}`}
        title={`Info über ${title}`}
      >
        <Info className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-sm glass-card border-primary/30 animate-scale-in">
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
