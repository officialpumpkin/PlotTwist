
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
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();
  const [isLoading, setIsLoading] = useState(true);

  // Wait for next-themes to be ready
  useEffect(() => {
    // next-themes sets theme to undefined initially, wait for it to be ready
    if (nextTheme !== undefined) {
      setIsLoading(false);
    }
  }, [nextTheme]);

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

  const setTheme = (newTheme: Theme) => {
    // Add a subtle fade effect during theme change
    document.body.classList.add('theme-fade');
    
    // Schedule removal of the fade effect 
    setTimeout(() => {
      document.body.classList.remove('theme-fade');
    }, 400);
    
    // Update next-themes (this will automatically update our theme state)
    setNextTheme(newTheme);
    
    // Save to backend
    saveUserThemePreference(newTheme);
  };

  const contextValue: ThemeContextValue = {
    theme: (nextTheme as Theme) || "system",
    setTheme,
    saveUserThemePreference,
    isLoading
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
      <ThemeContextProvider>
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
