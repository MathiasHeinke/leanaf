import { GlobalHeader } from "@/components/GlobalHeader";
import { ReactNode } from "react";

interface ChatLayoutProps {
  children: ReactNode;
  coachBanner?: ReactNode;
  chatInput?: ReactNode;
}

export const ChatLayout = ({ children, coachBanner, chatInput }: ChatLayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white z-50">
      
      {/* Coach-Banner */}
      {coachBanner && (
        <div className="flex-shrink-0 px-4 pt-1 pb-2">
          {coachBanner}
        </div>
      )}

      {/* Scrollbarer Chat */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-2">
        {children}
      </div>

      {/* Eingabemaske + Footer (gemeinsamer Block!) */}
      <div className="flex-shrink-0">
        
        {/* Eingabefeld direkt auf Footer */}
        {chatInput && (
          <div className="px-3 py-1 bg-neutral-900 border-t border-neutral-800">
            {chatInput}
          </div>
        )}

        {/* Footer: kein zusätzlicher Abstand */}
        <div className="h-[32px] flex items-center justify-center text-xs text-neutral-500 bg-neutral-900 m-0 p-0">
          © 2025 GetleanAI. Made with ❤️ in Germany
        </div>

      </div>
    </div>
  );
};