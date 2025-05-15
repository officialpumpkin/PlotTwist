import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  DashboardIcon, 
  BookOpenIcon, 
  CompassIcon, 
  AddCircleIcon,
  UserIcon
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

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon className="text-xl" /> },
    { label: "My Stories", path: "/my-stories", icon: <BookOpenIcon className="text-xl" /> },
    { label: "Explore", path: "/explore", icon: <CompassIcon className="text-xl" /> },
  ];

  return (
    <>
      <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-2">
        <div className="flex justify-between">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a 
                className={cn(
                  "flex flex-col items-center py-1",
                  location === item.path 
                    ? "text-primary" 
                    : "text-neutral-500"
                )}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </a>
            </Link>
          ))}
          {isAuthenticated ? (
            <button 
              onClick={() => setNewStoryModal(true)} 
              className={cn(
                "flex flex-col items-center py-1",
                newStoryModal ? "text-secondary" : "text-neutral-500"
              )}
            >
              <AddCircleIcon className="text-xl" />
              <span className="text-xs mt-1">New Story</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowLoginOptions(true)} 
              className="flex flex-col items-center py-1 text-neutral-500"
            >
              <UserIcon className="text-xl" />
              <span className="text-xs mt-1">Log in</span>
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
