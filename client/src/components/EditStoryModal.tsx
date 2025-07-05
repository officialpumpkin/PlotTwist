
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { Story } from "@shared/schema";
import { AlertTriangle } from "lucide-react";

const editStorySchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  genre: z.string().min(1, "Genre is required"),
});

interface EditStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story: Story | null;
}

const genres = [
  "Fantasy", "Science Fiction", "Mystery", "Romance", "Thriller", 
  "Horror", "Adventure", "Comedy", "Drama", "Historical Fiction",
  "Contemporary Fiction", "Young Adult", "Children's", "Other"
];

export default function EditStoryModal({ 
  open, 
  onOpenChange, 
  story 
}: EditStoryModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof editStorySchema>>({
    resolver: zodResolver(editStorySchema),
    defaultValues: {
      title: story?.title || "",
      description: story?.description || "",
      genre: story?.genre || "",
    },
  });

  // Reset form when story changes
  React.useEffect(() => {
    if (story) {
      form.reset({
        title: story.title,
        description: story.description,
        genre: story.genre,
      });
    }
  }, [story, form]);

  const editStoryMutation = useMutation({
    mutationFn: async (values: z.infer<typeof editStorySchema>) => {
      if (!story) throw new Error("No story to edit");
      return await apiRequest<Story>("PATCH", `/api/stories/${story.id}`, values);
    },
    onSuccess: () => {
      toast({
        title: "Story updated!",
        description: "Your story details have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${story?.id}`] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating story",
        description: error.message || "Failed to update story",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof editStorySchema>) {
    editStoryMutation.mutate(values);
  }

  if (!story) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Edit Story Details
          </DialogTitle>
          <DialogDescription>
            Make changes to your story information. This will mark the story as edited for all participants.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter story title" {...field} />
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
                  <FormLabel>Story Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your story premise..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genres.map(genre => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-700">
                  <p className="font-medium">Story Edit Notice</p>
                  <p className="mt-1">
                    Editing this story will mark it as "edited" and all participants will be notified that the story details have been changed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={editStoryMutation.isPending}
              >
                {editStoryMutation.isPending ? "Updating..." : "Update Story"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
