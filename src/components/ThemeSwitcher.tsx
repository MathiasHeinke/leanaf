import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Palette, Check } from "lucide-react";

type Theme = "standard" | "anthracite" | "royal" | "male" | "female";

interface ThemeOption {
  id: Theme;
  name: string;
  description: string;
  preview: string;
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const themeOptions: ThemeOption[] = [
    {
      id: "standard",
      name: "Standard",
      description: "Gesundes Grün",
      preview: "theme-preview-standard"
    },
    {
      id: "anthracite", 
      name: "Anthrazit Gold",
      description: "Elegant & Professionell",
      preview: "theme-preview-anthracite"
    },
    {
      id: "royal",
      name: "Königsblau",
      description: "Kraftvoll & Vertrauenswürdig",
      preview: "theme-preview-royal"
    },
    {
      id: "male",
      name: "Männlich",
      description: "Technisch & Klar",
      preview: "theme-preview-male"
    },
    {
      id: "female",
      name: "Weiblich", 
      description: "Elegant & Warm",
      preview: "theme-preview-female"
    }
  ];

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Design Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themeOptions.map((option) => (
            <div
              key={option.id}
              className={`relative cursor-pointer rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                theme === option.id 
                  ? "border-primary ring-2 ring-primary/30" 
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleThemeChange(option.id)}
            >
              <div className={`h-16 rounded-t-xl ${option.preview}`} />
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{option.name}</h4>
                  {theme === option.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-2">
          <Badge variant="secondary" className="text-xs">
            Das Theme wird automatisch gespeichert
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}