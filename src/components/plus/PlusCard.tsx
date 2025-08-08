import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PlusCardProps = React.ComponentProps<typeof Card>;

const PlusCard = React.forwardRef<HTMLDivElement, PlusCardProps>(({ className, ...props }, ref) => {
  return (
    <Card
      ref={ref}
      className={cn(
        // Subtle glassmorphism surface using design tokens
        "glass-card modern-shadow hover-lift border border-border/40 backdrop-blur-md",
        className
      )}
      {...props}
    />
  );
});

PlusCard.displayName = "PlusCard";

export default PlusCard;
