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

      {/* Coach-Banner */}
      {coachBanner && (
        <div className="flex-shrink-0 px-4 pt-1 pb-2 border-b border-border">
          {coachBanner}
        </div>
      )}

      {/* Scrollbarer Chat - Desktop/Mobile unified */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto px-4 space-y-2" style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </div>

      {/* Eingabemaske + Footer (gemeinsamer Block!) */}
      <div className="flex-shrink-0">
        
        {/* Eingabefeld direkt auf Footer */}
        {chatInput && (
          <div className="px-4 py-3 bg-background border-t border-border">
            {chatInput}
          </div>
        )}

        {/* Footer: kein zusätzlicher Abstand */}
        <div className="h-[32px] flex items-center justify-center text-xs text-muted-foreground bg-muted/30 border-t border-border">
          © 2025 GetleanAI. Made with ❤️ in Germany
        </div>

      </div>
    </div>
  );
};