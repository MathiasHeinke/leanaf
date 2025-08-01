import { GlobalHeader } from "@/components/GlobalHeader";
import { ReactNode } from "react";

interface ChatLayoutProps {
  children: ReactNode;
  coachBanner?: ReactNode;
  chatInput?: ReactNode;
}

export const ChatLayout = ({ children, coachBanner, chatInput }: ChatLayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground z-50">
      
      {/* Header */}
      <GlobalHeader />

      {/* Coach-Banner - rendered outside layout, no space here */}
      {coachBanner}

      {/* Scrollbarer Chat */}
      <div className="flex-1 min-h-0 px-4" style={{ paddingTop: coachBanner ? '64px' : '0px' }}>
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