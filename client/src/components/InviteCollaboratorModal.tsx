import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import UserAutocomplete from "@/components/UserAutocomplete";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InviteCollaboratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
}

// Schema for form validation
const inviteByEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const inviteByUsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

type InviteByEmailInput = z.infer<typeof inviteByEmailSchema>;
type InviteByUsernameInput = z.infer<typeof inviteByUsernameSchema>;

export default function InviteCollaboratorModal({
  open,
  onOpenChange,
  storyId,
}: InviteCollaboratorModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"email" | "username">("email");
  const [error, setError] = useState<string | null>(null);
  const [autocompleteValue, setAutocompleteValue] = useState("");

  // Email form
  const emailForm = useForm<InviteByEmailInput>({
    resolver: zodResolver(inviteByEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Username form
  const usernameForm = useForm<InviteByUsernameInput>({
    resolver: zodResolver(inviteByUsernameSchema),
    defaultValues: {
      username: "",
    },
  });

  // Mutation for inviting by email
  const inviteByEmailMutation = useMutation({
    mutationFn: (data: InviteByEmailInput) =>
      apiRequest("POST", `/api/stories/${storyId}/invite`, {
        ...data,
        inviteType: "email",
      }),
    onSuccess: () => {
      toast({
        title: "Invitation sent!",
        description: "The user has been invited to collaborate on this story.",
      });
      // Refresh participants list
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/participants`] });
      emailForm.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to send invitation. Please try again.");
    },
  });

  // Mutation for inviting by username
  const inviteByUsernameMutation = useMutation({
    mutationFn: (data: InviteByUsernameInput) =>
      apiRequest("POST", `/api/stories/${storyId}/invite`, {
        ...data,
        inviteType: "username",
      }),
    onSuccess: () => {
      toast({
        title: "Collaborator added!",
        description: "The user has been added to this story.",
      });
      // Refresh participants list
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/participants`] });
      usernameForm.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to add collaborator. Please try again.");
    },
  });

  // Handle user selection from autocomplete
  const handleUserSelect = (user: { username: string; email: string }) => {
    if (activeTab === "email") {
      emailForm.setValue("email", user.email);
      setAutocompleteValue(user.email);
    } else {
      usernameForm.setValue("username", user.username);
      setAutocompleteValue(user.username);
    }
  };

  // Handle form submission based on active tab
  function onSubmit(data: InviteByEmailInput | InviteByUsernameInput) {
    setError(null);
    if (activeTab === "email") {
      inviteByEmailMutation.mutate(data as InviteByEmailInput);
    } else {
      inviteByUsernameMutation.mutate(data as InviteByUsernameInput);
    }
  }

  const isPending = inviteByEmailMutation.isPending || inviteByUsernameMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Collaborator</DialogTitle>
          <DialogDescription>
            Invite someone to collaborate on this story. They'll be able to add their contributions when it's their turn.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(value) => { 
          setActiveTab(value as "email" | "username");
          setAutocompleteValue("");
          setError(null);
        }} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Invite by Email</TabsTrigger>
            <TabsTrigger value="username">Add by Username</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-4">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <UserAutocomplete
                          placeholder="Type to search by email or username..."
                          value={autocompleteValue}
                          onChange={(value) => {
                            setAutocompleteValue(value);
                            // Update form value if user types directly
                            if (value.includes('@')) {
                              field.onChange(value);
                            }
                          }}
                          onSelect={(user) => {
                            handleUserSelect(user);
                            field.onChange(user.email);
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Sending Invitation..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="username" className="mt-4">
            <Form {...usernameForm}>
              <form onSubmit={usernameForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <UserAutocomplete
                          placeholder="Type to search by username or email..."
                          value={autocompleteValue}
                          onChange={(value) => {
                            setAutocompleteValue(value);
                            // Update form value if user types directly
                            if (!value.includes('@')) {
                              field.onChange(value);
                            }
                          }}
                          onSelect={(user) => {
                            handleUserSelect(user);
                            field.onChange(user.username);
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Adding Collaborator..." : "Add Collaborator"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}