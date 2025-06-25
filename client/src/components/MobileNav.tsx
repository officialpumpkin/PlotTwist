import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Bell, Plus, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import UserMenu from "./UserMenu";
import LoginOptions from "./LoginOptions";
import NewStoryModal from "./NewStoryModal";
import MobileNotificationsDialog from "./MobileNotificationsDialog";
import { QuillPenIcon } from "./assets/icons";

export default function MobileNav() {
  const [newStoryModal, setNewStoryModal] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch pending invitations
  const { data: invitations } = useQuery({
    queryKey: ['/api/invitations/pending'],
    enabled: isAuthenticated,
  });

  const pendingCount = invitations?.length || 0;

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <QuillPenIcon className="text-2xl text-primary" />
          <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold text-primary">
            PlotTwist
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewStoryModal(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                New Story
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col space-y-4 pt-4">
                    <Link to="/dashboard" className="text-lg font-medium hover:text-primary transition-colors">
                      Dashboard
                    </Link>
                    <Link to="/my-stories" className="text-lg font-medium hover:text-primary transition-colors">
                      My Stories
                    </Link>
                    <Link to="/explore" className="text-lg font-medium hover:text-primary transition-colors">
                      Explore
                    </Link>
                    <Link to="/settings" className="text-lg font-medium hover:text-primary transition-colors">
                      Settings
                    </Link>
                    <div className="pt-4 border-t">
                      <UserMenu />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLoginOptions(true)}
                className="flex items-center gap-1"
              >
                <LogIn className="h-4 w-4" />
                Log in
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col space-y-4 pt-4">
                    <Link to="/" className="text-lg font-medium hover:text-primary transition-colors">
                      Home
                    </Link>
                    <Link to="/explore" className="text-lg font-medium hover:text-primary transition-colors">
                      Explore
                    </Link>
                    <div className="pt-4 border-t space-y-2">
                      <Button
                        onClick={() => setShowLoginOptions(true)}
                        variant="ghost"
                        className="w-full justify-start"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Log in
                      </Button>
                      <Button asChild className="w-full">
                        <Link to="/register">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Sign up
                        </Link>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>

      <NewStoryModal open={newStoryModal} onOpenChange={setNewStoryModal} />

      <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
        <DialogContent 
          className="sm:max-w-md"
          aria-describedby="mobile-login-description"
        >
          <div className="sr-only" id="mobile-login-description">
            Choose your login method to access PlotTwist
          </div>
          <LoginOptions />
        </DialogContent>
      </Dialog>

      <MobileNotificationsDialog 
        open={showNotifications} 
        onOpenChange={setShowNotifications} 
      />
    </div>
  );
}