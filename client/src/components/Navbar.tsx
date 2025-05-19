import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import UserMenu from "./UserMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { cn } from "@/lib/utils";
import { QuillPenIcon } from "./assets/icons";

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "My Stories", path: "/my-stories" },
    { label: "Explore", path: "/explore" },
  ];

  return (
    <nav className="bg-background shadow-sm border-b border-border py-4 px-4 sm:px-6 lg:px-8 hidden md:block">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <QuillPenIcon className="text-2xl text-primary" />
          <Link href="/dashboard">
            <a className="text-xl font-bold text-primary">PlotTwist</a>
          </Link>
        </div>
        
        {/* Navigation for Desktop */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a 
                className={cn(
                  "transition-colors",
                  location === item.path 
                    ? "text-primary font-medium" 
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {item.label}
              </a>
            </Link>
          ))}
        </div>
        
        {/* Theme Switcher and User Menu */}
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
