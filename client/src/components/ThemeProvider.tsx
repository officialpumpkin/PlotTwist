import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { apiRequest } from "@/lib/queryClient";

export type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  saveUserThemePreference: (theme: Theme) => Promise<void>;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user's theme preference from settings
  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const response = await fetch("/api/users/settings");
        
        if (response.ok) {
          const settings = await response.json();
          if (settings?.theme) {
            setTheme(settings.theme as Theme);
          }
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    // Set a fallback theme immediately
    setIsInitialized(true);
    
    // Then try to fetch user preferences if they're logged in
    fetchUserTheme();
  }, []);

  // Save user's theme preference to settings
  const saveUserThemePreference = async (newTheme: Theme) => {
    try {
      await apiRequest("PATCH", "/api/users/settings/appearance", {
        theme: newTheme
      });
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
      saveUserThemePreference(newTheme);
    },
    saveUserThemePreference
  };

  if (!isInitialized) {
    // Return a minimal provider with the default theme until user preferences are loaded
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme={defaultTheme}
        enableSystem
        {...props}
      >
        {children}
      </NextThemesProvider>
    );
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      <NextThemesProvider
        attribute="class"
        value={{ light: "light", dark: "dark", system: "system" }}
        defaultTheme={theme}
        enableSystem
        {...props}
      >
        {children}
      </NextThemesProvider>
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
};