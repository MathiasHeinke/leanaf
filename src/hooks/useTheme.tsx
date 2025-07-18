import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type Theme = "standard" | "anthracite" | "royal" | "male" | "female";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("standard");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load theme from database or local storage
  useEffect(() => {
    const loadTheme = async () => {
      if (user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_theme, gender")
            .eq("user_id", user.id)
            .single();

          if (profile?.preferred_theme) {
            setThemeState(profile.preferred_theme as Theme);
            document.documentElement.setAttribute("data-theme", profile.preferred_theme);
          } else if (profile?.gender) {
            // Auto-set theme based on gender if no theme preference exists
            const autoTheme = profile.gender === "male" ? "male" : "female";
            setThemeState(autoTheme);
            document.documentElement.setAttribute("data-theme", autoTheme);
          }
        } catch (error) {
          console.error("Error loading theme:", error);
        }
      } else {
        // Load from localStorage for non-authenticated users
        const savedTheme = localStorage.getItem("theme") as Theme;
        if (savedTheme) {
          setThemeState(savedTheme);
          document.documentElement.setAttribute("data-theme", savedTheme);
        }
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [user]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);

    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ preferred_theme: newTheme })
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Error saving theme:", error);
      }
    } else {
      localStorage.setItem("theme", newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}