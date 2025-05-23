import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import CustomDropdown, { DropdownItem, DropdownSeparator } from "@/components/CustomDropdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, User, Settings, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import LoginOptions from "./LoginOptions";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function UserMenu() {
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      window.location.href = '/api/logout';
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/users/account");
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account.",
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

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center space-x-3">
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
    <div className="flex items-center space-x-3 -mx-1">
      <CustomDropdown
        align="right"
        trigger={
          <div className="flex items-center space-x-2 cursor-pointer">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user?.profileImageUrl || ''}
                alt={user?.username || 'User'}
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
        <DropdownItem onClick={() => navigate("/profile")}>
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profile
          </div>
        </DropdownItem>
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
        <DropdownItem 
          onClick={() => deleteAccountMutation.mutate()}
          variant="destructive"
        >
          <div className="flex items-center">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </div>
        </DropdownItem>
      </CustomDropdown>
    </div>
  );
}