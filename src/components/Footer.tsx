import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export const Footer = () => {
  return (
    <footer className="border-t border-border/50">
      <div className="container mx-auto px-3 py-2">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            © 2025 GetleanAI. Made with ❤️ in Germany
          </p>
        </div>
      </div>
    </footer>
  );
};