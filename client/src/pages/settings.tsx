import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/components/ThemeProvider";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import EditRequestsModal from "@/components/EditRequestsModal";
import AvatarUpload from "@/components/AvatarUpload";
import { 
  Trash2, 
  User, 
  Bell, 
  BookOpen, 
  Clock,
  CheckCircle,
  XCircle,
  Edit
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileData, setProfileData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  const [emailSettings, setEmailSettings] = useState({
    turnNotifications: true,
    invitationNotifications: true,
    completionNotifications: true
  });
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showEditRequestsModal, setShowEditRequestsModal] = useState(false);

  // Get user settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/users/settings"],
    enabled: !!user,
  });

  // Get edit requests
  const { data: editRequests } = useQuery({
    queryKey: ['/api/edit-requests'],
    enabled: !!user,
  });

  // Update settings on data load
  useEffect(() => {
    if (settings) {
      setEmailSettings({
        turnNotifications: settings.turnNotifications ?? true,
        invitationNotifications: settings.invitationNotifications ?? true,
        completionNotifications: settings.completionNotifications ?? true
      });
    }
  }, [settings]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/users/profile", data),
    onSuccess: (response, variables) => {
      // Immediately update the profile data state
      setProfileData(prev => ({
        ...prev,
        username: variables.username,
        firstName: variables.firstName,
        lastName: variables.lastName,
        email: variables.email,
      }));

      // Update the cached user data immediately
      queryClient.setQueryData(["/api/auth/user"], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            username: variables.username,
            firstName: variables.firstName,
            lastName: variables.lastName,
            email: variables.email,
          };
        }
        return oldData;
      });

      // Clear stale queries and force refetch to ensure all components get updated data
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Re-fetch user data after successful profile updates
  useEffect(() => {
    const fetchUserData = async () => {
      await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
    };

    // Fetch user data again after updates
    if (updateProfileMutation.isSuccess) {
      fetchUserData();
    }
  }, [updateProfileMutation.isSuccess, queryClient]);

  // Reset mutation state when component mounts to avoid stale success states
  useEffect(() => {
    return () => {
      // Cleanup any lingering mutation states
      if (updateProfileMutation.isSuccess) {
        updateProfileMutation.reset();
      }
    };
  }, []);

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/auth/change-password", data),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
      setIsPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/users/settings", data),
    onSuccess: () => {
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating notifications",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/users/account"),
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted."
      });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting account",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Handlers
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitProfileChange = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const handleNotificationToggle = (key: keyof typeof emailSettings) => {
    const newSettings = { ...emailSettings, [key]: !emailSettings[key] };
    setEmailSettings(newSettings);
    updateNotificationsMutation.mutate(newSettings);
  };

  

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-t-2 border-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Picture</h3>
                <div className="flex items-center gap-4">
                  <AvatarUpload
                    currentImageUrl={user?.profileImageUrl}
                    username={user?.username}
                    onUploadSuccess={(newImageUrl) => {
                      // Update local profile state immediately
                      setProfileData(prev => ({
                        ...prev,
                        profileImageUrl: newImageUrl
                      }));
                      
                      toast({
                        title: "Profile updated",
                        description: "Your avatar has been updated successfully.",
                      });
                    }}
                  />
                  <div className="text-sm text-muted-foreground">
                    Click on your avatar to change your profile picture.<br />
                    Supported formats: JPEG, PNG, GIF (max 5MB)
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Information</h3>
                <form onSubmit={handleSubmitProfileChange} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={profileData.username}
                        onChange={handleProfileChange}
                        disabled={updateProfileMutation.isPending}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        disabled={updateProfileMutation.isPending}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                        disabled={updateProfileMutation.isPending}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </form>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security</h3>

                <div className="bg-card text-card-foreground border border-border p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Last changed: Never
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsPasswordDialogOpen(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Danger Zone</h3>

                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-red-900 dark:text-red-100">Delete Account</p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers, including:
                            <ul className="mt-2 ml-4 list-disc space-y-1">
                              <li>Your profile and account information</li>
                              <li>All stories you've created or participated in</li>
                              <li>Your writing contributions and segments</li>
                              <li>Print orders and order history</li>
                              <li>All settings and preferences</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                          >
                            {deleteAccountMutation.isPending ? "Deleting..." : "Yes, delete my account"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-6">
            {/* Edit Requests Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Requests
                  {editRequests && Array.isArray(editRequests) && editRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {editRequests.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Manage edit requests from collaborators who want to modify your stories.
                  </p>
                  <Button 
                    onClick={() => setShowEditRequestsModal(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    View Edit Requests 
                    {editRequests && Array.isArray(editRequests) && editRequests.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {editRequests.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="turn-notifications">Story Turn Notifications</Label>
                        <p className="text-sm text-neutral-500">
                          Receive an email when it's your turn to contribute to a story
                        </p>
                      </div>
                      <Switch
                        id="turn-notifications"
                        checked={emailSettings.turnNotifications}
                        onCheckedChange={() => handleNotificationToggle('turnNotifications')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="invitation-notifications">Story Invitations</Label>
                        <p className="text-sm text-neutral-500">
                          Receive an email when someone invites you to collaborate on a story
                        </p>
                      </div>
                      <Switch
                        id="invitation-notifications"
                        checked={emailSettings.invitationNotifications}
                        onCheckedChange={() => handleNotificationToggle('invitationNotifications')}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="completion-notifications">Story Completions</Label>
                        <p className="text-sm text-neutral-500">
                          Receive an email when a story you contributed to is completed
                        </p>
                      </div>
                      <Switch
                        id="completion-notifications"
                        checked={emailSettings.completionNotifications}
                        onCheckedChange={() => handleNotificationToggle('completionNotifications')}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Requests Modal */}
      <EditRequestsModal 
        open={showEditRequestsModal}
        onOpenChange={setShowEditRequestsModal}
      />
    </div>
  );
}