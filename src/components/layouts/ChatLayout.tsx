import { GlobalHeader } from "@/components/GlobalHeader";
import { ReactNode, useState } from "react";

interface ChatLayoutProps {
  children: ReactNode;
  coachBanner?: ReactNode;
  chatInput?: ReactNode;
}

export const ChatLayout = ({ children, coachBanner, chatInput }: ChatLayoutProps) => {
  const [showCoachBanner, setShowCoachBanner] = useState(false);
  
  // Calculate dynamic padding based on header height and banner state
  const headerHeight = 64; // 64px für GlobalHeader
  const bannerHeight = showCoachBanner ? 48 : 0; // 48px wenn Banner aufgeklappt
  const totalPadding = headerHeight + bannerHeight + 16; // +16px für zusätzlichen Abstand
  
  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white z-50">
      
      {/* Header */}
      <GlobalHeader 
        showCoachBanner={showCoachBanner}
        onToggleCoachBanner={() => setShowCoachBanner(prev => !prev)}
      />

      {/* Coach-Banner */}
      {coachBanner && (
        <div className="flex-shrink-0 px-4 pt-1 pb-2">
          {coachBanner}
        </div>
      )}

      {/* Scrollbarer Chat mit dynamischem oberen Padding */}
      <div className="flex-1 min-h-0 px-4">
        <div 
          className="h-full overflow-y-auto space-y-2" 
          style={{ 
            pointerEvents: 'auto',
            paddingTop: `${totalPadding}px`
          }}
        >
          {children}
        </div>
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