import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger, 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationIcon, ArrowDownIcon, UserIcon } from "./assets/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import LoginOptions from "./LoginOptions";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();

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
    
  if (isLoading) {
    return (
      <div className="flex items-center space-x-4">
        <div className="h-8 w-8 rounded-full bg-neutral-200 animate-pulse"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setShowLoginOptions(true)}
        >
          <UserIcon className="h-4 w-4" />
          <span>Log in</span>
        </Button>
        
        <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
          <DialogContent className="sm:max-w-md">
            <LoginOptions />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
        
        <DropdownMenuContent 
          align="end" 
          className="w-48" 
          sideOffset={8}
          avoidCollisions={false}
          side="bottom"
          alignOffset={0}
        >
          <DropdownMenuItem className="cursor-pointer" asChild onClick={() => setOpen(false)}>
            <Link href="/profile">Your Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" asChild onClick={() => setOpen(false)}>
            <Link href="/settings">Settings</Link>
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
