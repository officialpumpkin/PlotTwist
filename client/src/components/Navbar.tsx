import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import UserMenu from "./UserMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import NotificationBell from "./NotificationBell";
import { cn } from "@/lib/utils";
import { QuillPenIcon } from "./assets/icons";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Navigation items based on authentication status
  const navItems = isAuthenticated 
    ? [
        { label: "Dashboard", path: "/dashboard" },
        { label: "My Stories", path: "/my-stories" },
        { label: "Explore", path: "/explore" },
      ]
    : [
        { label: "Home", path: "/" },
        { label: "Explore", path: "/explore" },
      ];

  return (
    <nav className="bg-background shadow-sm border-b border-border py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center">
        <div className="flex items-center space-x-2">
          <QuillPenIcon className="text-2xl text-primary" />
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold text-primary">
            PlotTwist
          </Link>
        </div>
        
        {/* Navigation for Desktop */}
        <div className="hidden md:flex items-center space-x-6 ml-8">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "transition-colors",
                location.pathname === item.path 
                  ? "text-primary font-medium" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        
        {/* Spacer to push user controls to the right */}
        <div className="flex-1"></div>
        
        {/* User Controls */}
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
