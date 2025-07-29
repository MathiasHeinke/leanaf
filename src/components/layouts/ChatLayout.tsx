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
      {/* Global Header oben */}
      <div className="flex-shrink-0">
        <GlobalHeader />
      </div>

      {/* Coach Banner */}
      {coachBanner && (
        <div className="flex-shrink-0 px-4 pt-1 pb-2">
          {coachBanner}
        </div>
      )}

      {/* Scrollbarer Chatbereich */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2">
        {children}
      </div>

      {/* Input und Footer */}
      <div className="flex-shrink-0">
        {chatInput && (
          <div className="px-3 py-1 border-t border-border bg-card">
            {chatInput}
          </div>
        )}
        <div className="h-[32px] flex items-center justify-center text-xs text-muted-foreground bg-card">
          © 2025 GetleanAI. Made with ❤️ in Germany
        </div>
      </div>
    </div>
  );
};