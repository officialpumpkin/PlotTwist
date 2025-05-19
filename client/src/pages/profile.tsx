import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import Layout from "@/components/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || ""
  });

  // Get user data including stats
  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/users/profile"],
    enabled: !!user
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("PATCH", "/api/users/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
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

  const stats = userData?.stats || {
    storiesContributed: 0,
    storiesCreated: 0,
    totalSegments: 0,
    completedStories: 0
  };

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/30">
                    {user?.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt={user.username || "User"} />
                    ) : (
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.[0] || user?.username?.[0] || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <CardTitle>{user?.username || "User"}</CardTitle>
                    <CardDescription>
                      Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={user?.authProvider === "google"}
                      />
                      {user?.authProvider === "google" && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Email cannot be changed for Google-linked accounts
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-500">First Name</h3>
                        <p>{user?.firstName || "-"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-neutral-500">Last Name</h3>
                        <p>{user?.lastName || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Username</h3>
                      <p>{user?.username}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500">Email</h3>
                      <p>{user?.email}</p>
                    </div>
                    <div className="pt-4 flex justify-end">
                      <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Your Writing Statistics</CardTitle>
                <CardDescription>
                  Track your contribution to the PlotTwist community
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{stats.storiesCreated}</span>
                    <span className="text-sm text-neutral-600">Stories Created</span>
                  </div>
                  
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{stats.storiesContributed}</span>
                    <span className="text-sm text-neutral-600">Stories Contributed</span>
                  </div>
                  
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{stats.totalSegments}</span>
                    <span className="text-sm text-neutral-600">Total Segments</span>
                  </div>
                  
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{stats.completedStories}</span>
                    <span className="text-sm text-neutral-600">Completed Stories</span>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                  
                  {userData?.recentActivity?.length > 0 ? (
                    <div className="space-y-4">
                      {userData.recentActivity.map((activity: any) => (
                        <div key={activity.id} className="bg-neutral-50 p-3 rounded-lg">
                          <p className="text-sm font-medium">
                            {activity.type === 'contribution' 
                              ? `Contributed to "${activity.storyTitle}"` 
                              : `Created story "${activity.storyTitle}"`}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            {new Date(activity.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Manage your notifications and invitations
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Story Invitations</h3>
                  
                  {userData?.invitations?.length > 0 ? (
                    <div className="space-y-4">
                      {userData.invitations.map((invitation: any) => (
                        <div key={invitation.id} className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{invitation.storyTitle}</h4>
                              <p className="text-sm text-neutral-600 mt-1">
                                Invited by {invitation.inviterName} 
                                on {new Date(invitation.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-neutral-500 mt-2">
                                {invitation.storyDescription}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => {
                                  // Implement decline invitation logic
                                }}
                              >
                                Decline
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  // Implement accept invitation logic
                                }}
                              >
                                Accept
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-center bg-neutral-50 py-6 rounded-lg">
                      No pending invitations
                    </p>
                  )}
                  
                  <Separator className="my-6" />
                  
                  <h3 className="text-lg font-medium">Notification Settings</h3>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Story Turn Notifications</h4>
                        <p className="text-sm text-neutral-500">Get notified when it's your turn to write</p>
                      </div>
                      <Button 
                        variant={userData?.settings?.turnNotifications ? "default" : "outline"}
                        className={userData?.settings?.turnNotifications ? "" : "text-neutral-500"}
                        onClick={() => {
                          // Implement toggle notification setting
                        }}
                      >
                        {userData?.settings?.turnNotifications ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Story Invitations</h4>
                        <p className="text-sm text-neutral-500">Get notified when you're invited to a story</p>
                      </div>
                      <Button 
                        variant={userData?.settings?.invitationNotifications ? "default" : "outline"}
                        className={userData?.settings?.invitationNotifications ? "" : "text-neutral-500"}
                        onClick={() => {
                          // Implement toggle notification setting
                        }}
                      >
                        {userData?.settings?.invitationNotifications ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Story Completions</h4>
                        <p className="text-sm text-neutral-500">Get notified when a story you contributed to is completed</p>
                      </div>
                      <Button 
                        variant={userData?.settings?.completionNotifications ? "default" : "outline"}
                        className={userData?.settings?.completionNotifications ? "" : "text-neutral-500"}
                        onClick={() => {
                          // Implement toggle notification setting
                        }}
                      >
                        {userData?.settings?.completionNotifications ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}