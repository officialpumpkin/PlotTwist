import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { storyFormSchema, Story } from "@shared/schema";
import { z } from "zod";
import "@/lib/dropdown-fix.css";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CloseIcon } from "./assets/icons";

// We're using the storyFormSchema imported from shared/schema.ts

interface NewStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewStoryModal({ open, onOpenChange }: NewStoryModalProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState("");
  const [showCustomGenre, setShowCustomGenre] = useState(false);

  const form = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      genre: "",
      wordLimit: 100,
      characterLimit: 0, // 0 means no character limit
      maxSegments: 30,
      isPublic: true,
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof storyFormSchema>) => {
      // Create the story first
      const story = await apiRequest<Story>("POST", "/api/stories", values);

      // If we have invites, send them after creating the story
      if (invites.length > 0 && story && story.id) {
        try {
          await Promise.all(
            invites.map(invite => 
              apiRequest<{ message: string }>(
                "POST", 
                `/api/stories/${story.id}/invite`, 
                { usernameOrEmail: invite }
              )
            )
          );
        } catch (error) {
          console.error("Failed to send some invites:", error);
          // We'll continue even if some invites fail
        }
      }

      return story;
    },
    onSuccess: () => {
      toast({
        title: "Story created!",
        description: invites.length > 0 
          ? `Your story has been created and ${invites.length} contributor${invites.length > 1 ? 's' : ''} invited.`
          : "Your new story has been created successfully.",
      });
      form.reset();
      setInvites([]);
      setInviteEmail("");
      setCustomGenre("");
      setShowCustomGenre(false);
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-turn"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addInvite = () => {
    if (!inviteEmail.trim()) return;

    // Simple validation for email or username
    if (!invites.includes(inviteEmail)) {
      setInvites([...invites, inviteEmail.trim()]);
      setInviteEmail("");
    } else {
      toast({
        title: "Duplicate invite",
        description: "This person has already been added to the invite list.",
        variant: "destructive",
      });
    }
  };

  const removeInvite = (invite: string) => {
    setInvites(invites.filter(i => i !== invite));
  };

  function onSubmit(values: z.infer<typeof storyFormSchema>) {
    createStoryMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Create a New Story</DialogTitle>
          <DialogDescription>
            Set up your collaborative storytelling project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 pb-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a captivating title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Prompt or Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Set the scene for your story..." 
                      className="resize-none" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    {!showCustomGenre ? (
                      <Select 
                        onValueChange={(value) => {
                          if (value === "Custom") {
                            setShowCustomGenre(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="relative">
                            <SelectValue placeholder="Select a genre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper" sideOffset={4}>
                          <SelectItem value="Fantasy">Fantasy</SelectItem>
                          <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                          <SelectItem value="Mystery">Mystery</SelectItem>
                          <SelectItem value="Romance">Romance</SelectItem>
                          <SelectItem value="Adventure">Adventure</SelectItem>
                          <SelectItem value="Horror/Thriller">Horror/Thriller</SelectItem>
                          <SelectItem value="Historical">Historical</SelectItem>
                          <SelectItem value="Comedy">Comedy</SelectItem>
                          <SelectItem value="Drama">Drama</SelectItem>
                          <SelectItem value="Western">Western</SelectItem>
                          <SelectItem value="Post-Apocalyptic">Post-Apocalyptic</SelectItem>
                          <SelectItem value="Slice of Life">Slice of Life</SelectItem>
                          <SelectItem value="Custom">+ Create Custom Genre</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="Enter custom genre"
                            value={customGenre}
                            onChange={(e) => {
                              setCustomGenre(e.target.value);
                              field.onChange(e.target.value);
                            }}
                            onBlur={() => {
                              if (!customGenre.trim()) {
                                setShowCustomGenre(false);
                                field.onChange("");
                              }
                            }}
                            autoFocus
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomGenre(false);
                            setCustomGenre("");
                            field.onChange("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wordLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Word Limit per Turn</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="relative">
                          <SelectValue placeholder="Select word limit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" sideOffset={4}>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="characterLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Character Limit per Turn</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="relative">
                          <SelectValue placeholder="Select character limit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" sideOffset={4}>
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

              <FormField
                control={form.control}
                name="maxSegments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Story Segments</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="relative">
                          <SelectValue placeholder="Select max segments" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="10">10 turns</SelectItem>
                        <SelectItem value="20">20 turns</SelectItem>
                        <SelectItem value="30">30 turns</SelectItem>
                        <SelectItem value="50">50 turns</SelectItem>
                        <SelectItem value="100">100 turns</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Privacy Settings</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === "public")}
                      defaultValue={field.value ? "public" : "private"}
                      className="flex items-center space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <label htmlFor="public" className="text-sm">Public</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <label htmlFor="private" className="text-sm">Invite Only</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Invite Contributors (Optional)</FormLabel>
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
                  onClick={addInvite}
                >
                  Add
                </Button>
              </div>

              {invites.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">Invitees:</p>
                  <div className="flex flex-wrap gap-2">
                    {invites.map((invite, index) => (
                      <div 
                        key={index} 
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
                      >
                        <span>{invite}</span>
                        <button
                          type="button"
                          className="ml-1.5 text-blue-600 hover:text-blue-800"
                          onClick={() => removeInvite(invite)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end space-x-3 pt-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createStoryMutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {createStoryMutation.isPending ? "Creating..." : "Create Story"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}