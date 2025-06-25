import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, CloseIcon, CheckIcon } from "./assets/icons";

interface CompleteStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
  onPrint?: () => void;
}

export default function CompleteStoryModal({ 
  open, 
  onOpenChange, 
  storyId,
  onPrint 
}: CompleteStoryModalProps) {
  const { toast } = useToast();
  const [finalNote, setFinalNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get story details
  const { data: story, isLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: open,
  });

  // Complete story mutation
  const completeStoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/stories/${storyId}/complete`);
    },
    onSuccess: () => {
      toast({
        title: "Story completed!",
        description: "The story has been marked as complete.",
      });
      
      // If image was selected, upload it
      if (selectedFile) {
        uploadImageMutation.mutate();
      } else if (onPrint) {
        onOpenChange(false);
        onPrint();
      } else {
        onOpenChange(false);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-turn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waiting-turn"] });
    },
    onError: (error) => {
      toast({
        title: "Error completing story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;
      
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("caption", finalNote);
      
      const response = await fetch(`/api/stories/${storyId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Image uploaded",
        description: "Your image was successfully attached to the story.",
      });
      
      if (onPrint) {
        onOpenChange(false);
        onPrint();
      } else {
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      
      // Still move to print if requested
      if (onPrint) {
        onOpenChange(false);
        onPrint();
      } else {
        onOpenChange(false);
      }
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto mb-6" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="complete-story-description">
        <div className="absolute top-4 right-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 text-neutral-400 hover:text-neutral-500"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-accent/20">
          <CheckIcon className="text-accent" />
        </div>
        <DialogTitle className="text-center mt-3">Complete Story</DialogTitle>
        <DialogDescription id="complete-story-description" className="text-center">
          Are you sure you want to mark "{story?.title}" as complete? All contributors will be notified and no further additions will be allowed.
        </DialogDescription>
        
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Would you like to add images or illustrations?</p>
            <div className="flex items-center justify-center border-2 border-dashed border-neutral-300 rounded-md py-6">
              <label className="text-center cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png,image/jpeg,image/gif" 
                  onChange={handleFileChange}
                />
                <ImageIcon className="text-3xl text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">
                  {selectedFile 
                    ? `Selected: ${selectedFile.name}` 
                    : <>Drag images here, or <span className="text-primary">browse</span></>
                  }
                </p>
                <p className="text-xs text-neutral-400 mt-1">PNG, JPG up to 5MB</p>
              </label>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Add a final note (optional)</p>
            <Textarea 
              rows={2} 
              placeholder="Say something about this collaborative journey..."
              value={finalNote}
              onChange={(e) => setFinalNote(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-accent hover:bg-accent/90"
              disabled={completeStoryMutation.isPending || uploadImageMutation.isPending}
              onClick={() => completeStoryMutation.mutate()}
            >
              {completeStoryMutation.isPending 
                ? "Completing..." 
                : uploadImageMutation.isPending 
                  ? "Uploading..." 
                  : "Complete Story"
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
