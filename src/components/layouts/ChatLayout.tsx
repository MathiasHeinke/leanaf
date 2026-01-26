import { ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: ReactNode;
  chatInput?: ReactNode;
}

export const ChatLayout = ({ children, chatInput }: ChatLayoutProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div 
      className={cn(
        "fixed inset-0 flex flex-col bg-background/80 backdrop-blur-sm text-foreground z-20 pt-[61px] transition-[padding] duration-200",
        isCollapsed 
          ? "md:pl-[--sidebar-width-icon]" 
          : "md:pl-[--sidebar-width]"
      )}
    >
      {/* ZONE B: Scrollable Chat Content */}
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-2">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>

      {/* ZONE C: Input Area + Footer (Sticky Bottom) */}
      <div className="flex-none z-10 bg-background/95 backdrop-blur-md border-t border-border/30">
        {chatInput && (
          <div className="px-4 py-3 pb-2">
            {chatInput}
          </div>
        )}

        {/* Footer */}
        <div className="h-[32px] flex items-center justify-center text-xs text-muted-foreground">
          © 2025 GetleanAI. Made with ❤️ in Germany
        </div>
      </div>
    </div>
  );
};
