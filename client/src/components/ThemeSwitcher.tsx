
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme, isLoading } = useTheme();

  const toggleTheme = () => {
    // Don't allow toggling while theme is still loading
    if (isLoading) return;
    
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative h-9 w-9 rounded-full"
      onClick={toggleTheme}
      disabled={isLoading}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
