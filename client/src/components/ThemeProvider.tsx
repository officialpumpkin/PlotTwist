import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { apiRequest } from "@/lib/queryClient";

export type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  saveUserThemePreference: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function ThemeContextProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const { setTheme: setNextTheme } = useNextTheme();
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Save user's theme preference to settings and update next-themes
  const saveUserThemePreference = async (newTheme: Theme) => {
    try {
      await apiRequest("PATCH", "/api/users/settings/appearance", {
        theme: newTheme
      });
      // Also update the next-themes provider
      setNextTheme(newTheme);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    saveUserThemePreference(newTheme);
  };

  const contextValue: ThemeContextValue = {
    theme,
    setTheme,
    saveUserThemePreference
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const [userTheme, setUserTheme] = useState<Theme>(defaultTheme);

  // Load user's theme preference from settings
  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const response = await fetch("/api/users/settings");
        
        if (response.ok) {
          const settings = await response.json();
          if (settings?.theme) {
            setUserTheme(settings.theme as Theme);
          }
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      }
    };
    
    // Try to fetch user preferences if they're logged in
    fetchUserTheme();
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={userTheme}
      enableSystem
      {...props}
    >
      <ThemeContextProvider defaultTheme={userTheme}>
        {children}
      </ThemeContextProvider>
    </NextThemesProvider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}