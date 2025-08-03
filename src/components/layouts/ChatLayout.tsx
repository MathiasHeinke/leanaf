import { GlobalHeader } from "@/components/GlobalHeader";
import { ReactNode } from "react";

interface ChatLayoutProps {
  children: ReactNode;
  chatInput?: ReactNode;
  bannerCollapsed?: boolean;
}

export const ChatLayout = ({ children, chatInput, bannerCollapsed = false }: ChatLayoutProps) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      
      {/* Header - fixed 56px height */}
      <GlobalHeader />

      {/* Chat Area - flexible height with proper overflow */}
      <main className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {children}
      </main>

      {/* Input Area - fixed at bottom */}
      {chatInput && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {chatInput}
        </div>
      )}

    </div>
  );
};