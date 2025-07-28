import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export const Footer = () => {
  return (
    <footer className="mt-16 border-t border-border/50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Logo und Beschreibung */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              KaloAI
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Dein intelligenter KI-Coach für Ernährung, Training und einen gesunden Lifestyle. 
              Wissenschaftlich fundiert, individuell angepasst.
            </p>
          </div>

          <Separator className="bg-border/30" />

          {/* Rechtliche Links */}
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            <Link 
              to="/terms" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              AGB
            </Link>
            <Link 
              to="/privacy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Datenschutz
            </Link>
            <Link 
              to="/imprint" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Impressum
            </Link>
          </div>

          <Separator className="bg-border/30" />

          {/* Copyright und Technologie-Hinweise */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              © 2025 KaloAI. Alle Rechte vorbehalten.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by OpenAI • Supabase • Made with ❤️ in Germany
            </p>
          </div>

          {/* Gesundheitshinweis */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
              ⚠️ Diese App ersetzt keine professionelle medizinische Beratung. 
              Konsultieren Sie bei gesundheitlichen Fragen immer einen Arzt.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};