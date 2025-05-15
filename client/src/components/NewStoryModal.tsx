import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

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

// Story form schema
const storyFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description is too long"),
  genre: z.string().min(1, "Please select a genre"),
  wordLimit: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().min(50).max(500)
  ),
  characterLimit: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().min(0).max(2000)
  ),
  maxSegments: z.preprocess(
    (val) => parseInt(String(val), 10),
    z.number().min(5).max(100)
  ),
  isPublic: z.boolean().default(true),
});

interface NewStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewStoryModal({ open, onOpenChange }: NewStoryModalProps) {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");

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
      return await apiRequest("POST", "/api/stories", values);
    },
    onSuccess: () => {
      toast({
        title: "Story created!",
        description: "Your new story has been created successfully.",
      });
      form.reset();
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

  function onSubmit(values: z.infer<typeof storyFormSchema>) {
    createStoryMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 text-neutral-400 hover:text-neutral-500"
            >
              <CloseIcon className="h-4 w-4" />
            </Button>
          </div>
          <DialogTitle className="text-lg">Create a New Story</DialogTitle>
          <DialogDescription>
            Set up your collaborative storytelling project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fantasy">Fantasy</SelectItem>
                        <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                        <SelectItem value="Mystery">Mystery</SelectItem>
                        <SelectItem value="Romance">Romance</SelectItem>
                        <SelectItem value="Adventure">Adventure</SelectItem>
                        <SelectItem value="Horror/Thriller">Horror/Thriller</SelectItem>
                        <SelectItem value="Historical">Historical</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select word limit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select character limit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select max segments" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

            <div className="space-y-2">
              <FormLabel>Invite Contributors (Optional)</FormLabel>
              <div className="flex space-x-2">
                <Input 
                  placeholder="Enter email or username" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    // Would handle invites here
                    toast({
                      title: "Invitation feature",
                      description: "Invitations will be implemented soon!",
                    });
                    setInviteEmail("");
                  }}
                >
                  Add
                </Button>
              </div>
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
