import { GlobalHeader } from "@/components/GlobalHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";

interface ChatLayoutProps {
  children: ReactNode;
  chatInput?: ReactNode;
  bannerCollapsed?: boolean;
}

export const ChatLayout = ({ children, chatInput, bannerCollapsed = false }: ChatLayoutProps) => {
  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground z-50">
      
      {/* Header */}
      <GlobalHeader />

      {/* Scrollbarer Chat - dynamisches Padding basierend auf Banner-Status */}
      <div 
        className="flex-1 min-h-0 px-4 transition-all duration-300 ease-out"
        style={{ 
          paddingTop: bannerCollapsed ? '8px' : 'var(--coach-banner-height)',
          pointerEvents: 'auto' 
        }}
      >
        <div className="h-full overflow-y-auto space-y-2">
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