import { GlobalHeader } from "@/components/GlobalHeader";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import React from "react";

interface ChatLayoutProps {
  children: ReactNode;
  coachBanner?: ReactNode;
  chatInput?: ReactNode;
}

export const ChatLayout = ({ children, coachBanner, chatInput }: ChatLayoutProps) => {
  const [bannerOpen, setBannerOpen] = useState(true);

  return (
    <div className={cn(
      "fixed inset-0 flex flex-col bg-background text-foreground z-50",
      bannerOpen && "pt-[calc(var(--global-header-h)+56px)]",
      !bannerOpen && "pt-[var(--global-header-h)]"
    )}>
      
      {/* Header */}
      <GlobalHeader />

      {/* Coach-Banner - rendered outside layout since it's position:fixed */}
      {coachBanner && React.cloneElement(coachBanner as React.ReactElement, { onToggle: setBannerOpen })}

      {/* Scrollbarer Chat - no padding needed since banner is fixed */}
      <div className="flex-1 min-h-0 px-4">
        <div className="h-full overflow-y-auto space-y-2" style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </div>

      {/* Eingabemaske + Footer (gemeinsamer Block!) */}
      <div className="flex-shrink-0">
        
        {/* Eingabefeld direkt auf Footer */}
        {chatInput && (
          <div className="px-3 py-1 bg-card border-t border-border">
            {chatInput}
          </div>
        )}

        {/* Footer: kein zusätzlicher Abstand */}
        <div className="h-[32px] flex items-center justify-center text-xs text-muted-foreground bg-card m-0 p-0">
          © 2025 GetleanAI. Made with ❤️ in Germany
        </div>

      </div>
    </div>
  );
};