import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
  const [emailSettings, setEmailSettings] = useState({
    turnNotifications: true,
    invitationNotifications: true,
    completionNotifications: true
  });
  const [appearanceSettings, setAppearanceSettings] = useState({
    fontSize: 16,
    editorHeight: 200,
    theme: theme || "light"
  });

  // Get user settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/users/settings"],
    enabled: !!user,
    onSuccess: (data) => {
      if (data) {
        setEmailSettings({
          turnNotifications: data.turnNotifications ?? true,
          invitationNotifications: data.invitationNotifications ?? true,
          completionNotifications: data.completionNotifications ?? true
        });
        setAppearanceSettings({
          fontSize: data.fontSize ?? 16,
          editorHeight: data.editorHeight ?? 200,
          theme: data.theme ?? "light"
        });
      }
    }
  });

  // Update notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof emailSettings) => {
      return await apiRequest("PATCH", "/api/users/settings/notifications", data);
    },
    onSuccess: () => {
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update appearance settings mutation
  const updateAppearanceMutation = useMutation({
    mutationFn: async (data: typeof appearanceSettings) => {
      return await apiRequest("PATCH", "/api/users/settings/appearance", data);
    },
    onSuccess: () => {
      toast({
        title: "Appearance settings updated",
        description: "Your appearance preferences have been saved."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      return await apiRequest("POST", "/api/users/change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been successfully changed."
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsPasswordDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle notification toggle
  function handleNotificationToggle(key: keyof typeof emailSettings) {
    setEmailSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: !prev[key]
      };
      updateNotificationsMutation.mutate(newSettings);
      return newSettings;
    });
  }

  // Handle appearance settings changes
  function handleAppearanceChange(key: keyof typeof appearanceSettings, value: any) {
    setAppearanceSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Update theme immediately when changed in settings
    if (key === 'theme' && typeof value === 'string') {
      setTheme(value as Theme);
    }
  }

  // Submit appearance settings
  function saveAppearanceSettings() {
    updateAppearanceMutation.mutate(appearanceSettings);
  }

  // Handle password input change
  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  // Submit password change
  function handleSubmitPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation do not match",
        variant: "destructive"
      });
      return;
    }
    changePasswordMutation.mutate(passwordData);
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-t-2 border-primary rounded-full animate-spin"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
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
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Your Account</h3>
                  <div className="bg-card text-card-foreground border border-border p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Username</Label>
                        <p className="font-medium">{user?.username}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <p className="font-medium">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Security</h3>
                  
                  <div className="bg-card text-card-foreground border border-border p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">
                          Last changed: {settings?.passwordLastChanged 
                            ? new Date(settings.passwordLastChanged).toLocaleDateString() 
                            : 'Never'}
                        </p>
                      </div>
                      <Button 
                        onClick={() => setIsPasswordDialogOpen(true)}
                        disabled={user?.authProvider === "google"}
                      >
                        Change Password
                      </Button>
                    </div>
                    
                    {user?.authProvider === "google" && (
                      <div className="mt-2 text-sm text-muted-foreground bg-yellow-950/10 dark:bg-yellow-900/20 p-2 rounded border border-yellow-600/20 dark:border-yellow-500/30">
                        You're using Google to sign in. Password management is handled by Google.
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-card text-card-foreground border border-border p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Sign Out</p>
                        <p className="text-sm text-muted-foreground">
                          Sign out of your PlotTwist account
                        </p>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          window.location.href = '/api/logout';
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-card text-card-foreground border border-border p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all your data
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete Account</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your account
                              and remove all your data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-white hover:bg-destructive/90"
                              onClick={() => {
                                apiRequest("DELETE", "/api/users/account")
                                  .then(() => {
                                    toast({
                                      title: "Account deleted",
                                      description: "Your account has been permanently deleted."
                                    });
                                    // Redirect to home page after successful deletion
                                    window.location.href = "/";
                                  })
                                  .catch(error => {
                                    toast({
                                      title: "Error deleting account",
                                      description: error.message,
                                      variant: "destructive"
                                    });
                                  });
                              }}
                            >
                              Delete Account
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
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Manage how and when we contact you
                </CardDescription>
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
          </TabsContent>
          
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize your writing experience
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Editor Preferences</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="font-size">Font Size ({appearanceSettings.fontSize}px)</Label>
                        <span className="text-sm text-neutral-500">
                          {appearanceSettings.fontSize < 14 ? "Small" : 
                           appearanceSettings.fontSize > 18 ? "Large" : "Medium"}
                        </span>
                      </div>
                      <Slider
                        id="font-size"
                        min={12}
                        max={24}
                        step={1}
                        value={[appearanceSettings.fontSize]}
                        onValueChange={(value) => handleAppearanceChange('fontSize', value[0])}
                        className="max-w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="editor-height">Editor Height ({appearanceSettings.editorHeight}px)</Label>
                        <span className="text-sm text-neutral-500">
                          {appearanceSettings.editorHeight < 150 ? "Compact" : 
                           appearanceSettings.editorHeight > 250 ? "Expanded" : "Standard"}
                        </span>
                      </div>
                      <Slider
                        id="editor-height"
                        min={100}
                        max={400}
                        step={10}
                        value={[appearanceSettings.editorHeight]}
                        onValueChange={(value) => handleAppearanceChange('editorHeight', value[0])}
                        className="max-w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <button
                          type="button"
                          className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center h-24 ${
                            appearanceSettings.theme === 'light' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border bg-card'
                          }`}
                          onClick={() => handleAppearanceChange('theme', 'light')}
                        >
                          <div className="h-12 w-12 bg-white border border-neutral-200 rounded mb-2"></div>
                          <span className="text-sm font-medium">Light</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center h-24 ${
                            appearanceSettings.theme === 'dark' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border bg-card'
                          }`}
                          onClick={() => handleAppearanceChange('theme', 'dark')}
                        >
                          <div className="h-12 w-12 bg-neutral-800 border border-neutral-700 rounded mb-2"></div>
                          <span className="text-sm font-medium">Dark</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center h-24 ${
                            appearanceSettings.theme === 'system' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border bg-card'
                          }`}
                          onClick={() => handleAppearanceChange('theme', 'system')}
                        >
                          <div className="h-12 w-12 bg-gradient-to-r from-white to-neutral-800 border border-neutral-200 rounded mb-2"></div>
                          <span className="text-sm font-medium">System</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        onClick={saveAppearanceSettings}
                        disabled={updateAppearanceMutation.isPending}
                      >
                        {updateAppearanceMutation.isPending ? "Saving..." : "Save Appearance Settings"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Password Change Dialog */}
      <AlertDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password and a new password below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <form onSubmit={handleSubmitPasswordChange} className="space-y-4 py-2">
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
            
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}