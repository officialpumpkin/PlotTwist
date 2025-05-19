import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  DashboardIcon, 
  BookOpenIcon, 
  CompassIcon, 
  AddCircleIcon,
  UserIcon,
  HomeIcon
} from "./assets/icons";
import { useState } from "react";
import NewStoryModal from "./NewStoryModal";
import LoginOptions from "./LoginOptions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

export default function MobileNav() {
  const [location] = useLocation();
  const [newStoryModal, setNewStoryModal] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const { isAuthenticated } = useAuth();

  // Navigation items based on authentication status
  const authenticatedNavItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon className="text-xl" /> },
    { label: "My Stories", path: "/my-stories", icon: <BookOpenIcon className="text-xl" /> },
    { label: "Explore", path: "/explore", icon: <CompassIcon className="text-xl" /> },
  ];

  const unauthenticatedNavItems = [
    { label: "Home", path: "/", icon: <HomeIcon className="text-xl" /> },
    { label: "Explore", path: "/explore", icon: <CompassIcon className="text-xl" /> },
    { label: "Log in", path: "/login", icon: <UserIcon className="text-xl" /> },
  ];

  const navItems = isAuthenticated ? authenticatedNavItems : unauthenticatedNavItems;

  return (
    <>
      <div className="md:hidden bg-background border-b border-border px-4 py-2">
        <div className="flex justify-between">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a 
                className={cn(
                  "flex flex-col items-center py-1",
                  location === item.path 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            </Link>
          ))}
          {isAuthenticated && (
            <button 
              onClick={() => setNewStoryModal(true)} 
              className={cn(
                "flex flex-col items-center py-1",
                newStoryModal ? "text-secondary" : "text-muted-foreground"
              )}
            >
              <AddCircleIcon className="text-xl" />
              <span className="text-xs mt-1">New Story</span>
            </button>
          )}
        </div>
      </div>

      <NewStoryModal open={newStoryModal} onOpenChange={setNewStoryModal} />
      
      <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
        <DialogContent className="sm:max-w-md">
          <LoginOptions />
        </DialogContent>
      </Dialog>
    </>
  );
}
