import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { 
  DashboardIcon, 
  BookOpenIcon, 
  CompassIcon, 
  AddCircleIcon 
} from "./assets/icons";
import { useState } from "react";
import NewStoryModal from "./NewStoryModal";

export default function MobileNav() {
  const [location] = useLocation();
  const [newStoryModal, setNewStoryModal] = useState(false);

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
        </div>
      </div>

      <NewStoryModal open={newStoryModal} onOpenChange={setNewStoryModal} />
    </>
  );
}
