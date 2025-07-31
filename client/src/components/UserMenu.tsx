import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CustomDropdown, { DropdownItem, DropdownSeparator } from "@/components/CustomDropdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import LoginOptions from "./LoginOptions";


export default function UserMenu() {
  const { user, refetch, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileImageKey, setProfileImageKey] = useState(0);

  // Force re-render when user data changes
  useEffect(() => {
    if (user?.profileImageUrl) {
      setProfileImageKey(prev => prev + 1);
    }
  }, [user?.profileImageUrl]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear query cache
      queryClient.clear();
      // Redirect to home page
      window.location.href = '/';
    },
    onError: (error) => {
      console.error('Logout error:', error);
      toast({
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return user?.username?.[0]?.toUpperCase() || "U";
  };

  // Debug logging to track user data changes
  console.log('UserMenu user data:', { 
    username: user?.username, 
    firstName: user?.firstName, 
    lastName: user?.lastName 
  });

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center">
          <Button
            onClick={() => setShowLoginOptions(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <User className="h-4 w-4 mr-2" />
            Login
          </Button>
        </div>

        <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
          <DialogContent className="w-full max-w-md">
            <LoginOptions />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex items-center">
      <CustomDropdown
        align={window.innerWidth <= 768 ? "left" : "right"}
        trigger={
          <div className="flex items-center gap-2 cursor-pointer">
            <Avatar className="h-8 w-8" key={profileImageKey}>
              <AvatarImage 
                src={user?.profileImageUrl || ''} 
                alt={user?.username || "User"}
                key={`${user?.profileImageUrl}-${profileImageKey}`}
              />
              <AvatarFallback>
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {user?.username || 'User'}
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          </div>
        }
      >
        <DropdownItem onClick={() => navigate("/settings")}>
          <div className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </div>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem onClick={() => logoutMutation.mutate()}>
          <div className="flex items-center">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </div>
        </DropdownItem>
      </CustomDropdown>
    </div>
  );
}