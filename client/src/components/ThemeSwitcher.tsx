import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import CustomDropdown, { DropdownItem } from "@/components/CustomDropdown";
import { Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <CustomDropdown
      align="center"
      trigger={
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      }
      className="w-40"
    >
      <DropdownItem onClick={() => setTheme("light")}>
        <div className="flex items-center">
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </div>
      </DropdownItem>
      <DropdownItem onClick={() => setTheme("dark")}>
        <div className="flex items-center">
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </div>
      </DropdownItem>
    </CustomDropdown>
  );
}