import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, SkipForward, UserPlus, Edit, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const storyControlsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  wordLimit: z.number().min(1, "Word limit must be at least 1"),
  characterLimit: z.number().min(0, "Character limit must be at least 0"),
});

interface Story {
  id: number;
  title: string;
  wordLimit: number;
  characterLimit: number;
  creatorId: string;
  isComplete: boolean;
}

interface StoryControlsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
  onClose: () => void;
}

export default function StoryControlsModal({ 
  open, 
  onOpenChange, 
  storyId,
  onClose
}: StoryControlsModalProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const { user } = useAuth();

  // Get story details
  const { data: story } = useQuery<Story>({
    queryKey: [`/api/stories/${storyId}`],
    enabled: open
  });

  // Get participants for turn info
  const { data: participants } = useQuery({
    queryKey: [`/api/stories/${storyId}/participants`],
    enabled: open
  });

  // Form for story settings
  const form = useForm<z.infer<typeof storyControlsSchema>>({
    resolver: zodResolver(storyControlsSchema),
    defaultValues: {
      title: story?.title || "",
      wordLimit: story?.wordLimit || 100,
      characterLimit: story?.characterLimit || 1000,
    },
  });

  // Update form when story data loads
  useEffect(() => {
    if (story) {
      form.reset({
        title: story.title || "",
        wordLimit: story.wordLimit || 100,
        characterLimit: story.characterLimit || 1000,
      });
    }
  }, [story, form]);

  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      return await apiRequest("PATCH", `/api/stories/${storyId}`, { title });
    },
    onSuccess: () => {
      toast({
        title: "Title updated",
        description: "Story title has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-turn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waiting-turn"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update title",
      });
    }
  });

  // Update limits mutation
  const updateLimitsMutation = useMutation({
    mutationFn: async (limits: { wordLimit: number; characterLimit: number }) => {
      return await apiRequest("PATCH", `/api/stories/${storyId}`, limits);
    },
    onSuccess: () => {
      toast({
        title: "Limits updated",
        description: "Story limits have been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update limits",
      });
    }
  });

  // Skip turn mutation
  const skipTurnMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/stories/${storyId}/skip-turn`);
    },
    onSuccess: () => {
      toast({
        title: "Turn skipped",
        description: "The current turn has been skipped to the next participant",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-turn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waiting-turn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to skip turn",
      });
    }
  });

  // Invite collaborators mutation
  const inviteCollaboratorsMutation = useMutation({
    mutationFn: async (inviteList: string[]) => {
      // Send individual invitations
      const results = await Promise.all(
        inviteList.map(async (invite) => {
          // Determine if it's an email or username
          const isEmail = invite.includes('@');
          return await apiRequest("POST", `/api/stories/${storyId}/invite`, {
            inviteType: isEmail ? 'email' : 'username',
            [isEmail ? 'email' : 'username']: invite
          });
        })
      );
      return results;
    },
    onSuccess: () => {
      toast({
        title: "Invitations sent",
        description: "Story invitations have been sent successfully",
      });
      setInvites([]);
      setInviteEmail("");
      setInviteSuccess(true);
      // Reset success state after 3 seconds
      setTimeout(() => setInviteSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/participants`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send invitations",
      });
    }
  });

  const completeMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/stories/${storyId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-stories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
      toast({
        title: "Story completed!",
        description: "The story has been marked as complete.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to complete story",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/stories/${storyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-stories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
      toast({
        title: "🔥 Story burned!",
        description: "The story has been deleted. All participants have been notified and received the story content via email.",
        duration: 7000,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete story",
        variant: "destructive",
      });
    },
  });

  const addInvite = () => {
    const email = inviteEmail.trim();
    if (email && !invites.includes(email)) {
      setInvites([...invites, email]);
      setInviteEmail("");
    }
  };

  const removeInvite = (invite: string) => {
    setInvites(invites.filter(i => i !== invite));
  };

  const handleUpdateTitle = () => {
    const title = form.getValues("title");
    if (title && title !== story?.title) {
      updateTitleMutation.mutate(title);
    }
  };

  const handleUpdateLimits = () => {
    const { wordLimit, characterLimit } = form.getValues();
    if (wordLimit !== story?.wordLimit || characterLimit !== story?.characterLimit) {
      updateLimitsMutation.mutate({ wordLimit, characterLimit });
    }
  };

  const handleSendInvites = () => {
    if (invites.length > 0) {
      inviteCollaboratorsMutation.mutate(invites);
    }
  };

  const handleCompleteStory = () => {
    if (confirm("Are you sure you want to mark this story as complete? This action cannot be undone.")) {
      completeMutation.mutate();
    }
  };

  const handleDeleteStory = () => {
    if (confirm(`Are you sure you want to BURN "${story?.title}"? This will permanently delete the story and send the complete story to all participants via email. This action cannot be undone!`)) {
      deleteMutation.mutate();
    }
  };

  if (!story) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="story-controls-description">
        <div className="sr-only" id="story-controls-description">Story controls and settings</div>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Story Controls
          </DialogTitle>
          <DialogDescription>
            Manage your story settings, contributors, and turn flow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Edit Title Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <h3 className="text-sm font-medium">Edit Title</h3>
            </div>
            <Form {...form}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder="Story title" {...field} />
                        <Button 
                          type="button"
                          size="sm"
                          onClick={handleUpdateTitle}
                          disabled={updateTitleMutation.isPending}
                        >
                          {updateTitleMutation.isPending ? "Updating..." : "Update"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Form>
          </div>

          <Separator />

          {/* Update Limits Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Update Contribution Limits</h3>
            <p className="text-xs text-muted-foreground">
              Changes will apply to the next contribution
            </p>
            <Form {...form}>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="wordLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Word Limit</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select word limit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="item-aligned" sideOffset={4}>
                          <SelectItem value="50">50 words</SelectItem>
                          <SelectItem value="100">100 words</SelectItem>
                          <SelectItem value="150">150 words</SelectItem>
                          <SelectItem value="200">200 words</SelectItem>
                          <SelectItem value="250">250 words</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="characterLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character Limit</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select character limit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="item-aligned" sideOffset={4}>
                          <SelectItem value="0">No limit</SelectItem>
                          <SelectItem value="280">280 characters (Tweet length)</SelectItem>
                          <SelectItem value="500">500 characters</SelectItem>
                          <SelectItem value="1000">1000 characters</SelectItem>
                          <SelectItem value="1500">1500 characters</SelectItem>
                          <SelectItem value="2000">2000 characters</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button 
                type="button"
                size="sm"
                onClick={handleUpdateLimits}
                disabled={updateLimitsMutation.isPending}
                className="w-full"
              >
                {updateLimitsMutation.isPending ? "Updating..." : "Update Limits"}
              </Button>
            </Form>
          </div>

          <Separator />

          {/* Skip Current User Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SkipForward className="h-4 w-4" />
              <h3 className="text-sm font-medium">Skip Current User</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep the story moving by skipping users who are taking too long to respond, you can also skip your own turn if you want someone to take your turn.
            </p>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => skipTurnMutation.mutate()}
              disabled={skipTurnMutation.isPending}
              className="w-full"
            >
              {skipTurnMutation.isPending ? "Skipping..." : "Skip Current User"}
            </Button>
          </div>

          <Separator />

          {/* Invite Contributors Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <h3 className="text-sm font-medium">Invite Contributors (Optional)</h3>
            </div>

            <div className="flex space-x-2">
              <Input 
                placeholder="Enter email or username" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInvite();
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline"
                size="sm"
                onClick={addInvite}
              >
                Add
              </Button>
            </div>

            {invites.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Invitees:</p>
                <div className="flex flex-wrap gap-2">
                  {invites.map((invite, index) => (
                    <div 
                      key={index} 
                      className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center"
                    >
                      <span>{invite}</span>
                      <button
                        type="button"
                        className="ml-1.5 text-primary/70 hover:text-primary"
                        onClick={() => removeInvite(invite)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <Button 
                  size="sm"
                  onClick={handleSendInvites}
                  disabled={inviteCollaboratorsMutation.isPending}
                  className="w-full"
                >
                  {inviteCollaboratorsMutation.isPending ? "Sending..." : "Send Invitations"}
                </Button>
              </div>
            )}

            {/* Success feedback */}
            {inviteSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Invitations sent successfully!</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Story Actions Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Story Actions</h3>
            <div className="flex flex-col gap-2">
              <Button 
                variant="destructive" 
                onClick={handleCompleteStory}
                disabled={completeMutation.isPending}
                className="w-full"
              >
                {completeMutation.isPending ? "Completing..." : "Mark as Complete"}
              </Button>

              {story?.creatorId === user?.id && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteStory}
                  disabled={deleteMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {deleteMutation.isPending ? "Burning..." : "🔥 Burn the Book (Delete)"}
                </Button>
              )}
            </div>
            
            {story?.creatorId === user?.id && (
              <p className="text-xs text-muted-foreground">
                Burning the book will permanently delete the story and send the complete story to all participants via email.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}