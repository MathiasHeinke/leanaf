import { ReactNode } from "react";

interface ChatLayoutProps {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  chatInput?: ReactNode;
}

export const ChatLayout = ({ header, children, footer, chatInput }: ChatLayoutProps) => {
  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Header */}
      {header && (
        <div className="z-10 sticky top-0 flex-shrink-0">
          {header}
        </div>
      )}

      {/* Scrollbarer Chat */}
      <div className="flex-1 min-h-0 px-4">
        <div className="h-full overflow-y-auto space-y-2" style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </div>

      {/* Chat Input */}
      {chatInput && (
        <div className="flex-shrink-0 px-3 py-1 bg-card/80 backdrop-blur-sm border-t border-border">
          {chatInput}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="flex-shrink-0 z-10 sticky bottom-0">
          {footer}
        </div>
      )}

      {/* Default Footer wenn kein Footer übergeben wird */}
      {!footer && !chatInput && (
        <div className="h-8 flex items-center justify-center text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border-t border-border">
          © 2025 GetleanAI. Made with ❤️ in Germany
        </div>
      )}
    </div>
  );
};