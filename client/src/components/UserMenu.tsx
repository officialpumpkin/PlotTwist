import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationIcon, ArrowDownIcon } from "./assets/icons";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "U";
  };

  const displayName = user?.firstName 
    ? `${user.firstName} ${user.lastName || ''}`
    : user?.username || 'User';

  return (
    <div className="flex items-center space-x-4">
      <button className="text-neutral-500 hover:text-neutral-700">
        <NotificationIcon className="text-xl" />
      </button>
      
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger className="flex items-center space-x-2 outline-none">
          <Avatar className="h-8 w-8">
            {user?.profileImageUrl ? (
              <AvatarImage 
                src={user.profileImageUrl} 
                alt={displayName} 
                className="object-cover"
              />
            ) : (
              <AvatarFallback>{getInitials()}</AvatarFallback>
            )}
          </Avatar>
          <span className="hidden md:inline text-sm font-medium text-neutral-700">{displayName}</span>
          <ArrowDownIcon className="text-neutral-500" />
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="cursor-pointer">
            Your Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" asChild>
            <a href="/api/logout">Sign out</a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
