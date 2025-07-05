import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
  editType: "story_metadata" | "segment_content";
  segmentId?: number;
  currentContent?: string;
  currentTitle?: string;
  currentDescription?: string;
  currentGenre?: string;
}

export default function EditRequestModal({
  open,
  onOpenChange,
  storyId,
  editType,
  segmentId,
  currentContent = "",
  currentTitle = "",
  currentDescription = "",
  currentGenre = "",
}: EditRequestModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [proposedContent, setProposedContent] = useState(currentContent);
  const [proposedTitle, setProposedTitle] = useState(currentTitle);
  const [proposedDescription, setProposedDescription] = useState(currentDescription);
  const [proposedGenre, setProposedGenre] = useState(currentGenre);
  const [reason, setReason] = useState("");

  const createEditRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/stories/${storyId}/edit-requests`, {
        editType,
        segmentId,
        proposedContent: editType === "segment_content" ? proposedContent : undefined,
        proposedTitle: editType === "story_metadata" ? proposedTitle : undefined,
        proposedDescription: editType === "story_metadata" ? proposedDescription : undefined,
        proposedGenre: editType === "story_metadata" ? proposedGenre : undefined,
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit request submitted!",
        description: "Your edit request has been sent to the story author for approval.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}`] });
      onOpenChange(false);
      // Reset form
      setReason("");
      setProposedContent(currentContent);
      setProposedTitle(currentTitle);
      setProposedDescription(currentDescription);
      setProposedGenre(currentGenre);
    },
    onError: (error) => {
      toast({
        title: "Error submitting edit request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editType === "segment_content" && proposedContent.trim() === "") {
      toast({
        title: "Error",
        description: "Proposed content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (editType === "story_metadata" && (!proposedTitle.trim() || !proposedDescription.trim() || !proposedGenre.trim())) {
      toast({
        title: "Error",
        description: "All story fields are required",
        variant: "destructive",
      });
      return;
    }

    createEditRequestMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Request Edit: {editType === "story_metadata" ? "Story Details" : "Segment Content"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {editType === "story_metadata" && (
            <>
              <div>
                <Label htmlFor="proposedTitle">Proposed Title</Label>
                <Input
                  id="proposedTitle"
                  value={proposedTitle}
                  onChange={(e) => setProposedTitle(e.target.value)}
                  placeholder="New story title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="proposedDescription">Proposed Description</Label>
                <Textarea
                  id="proposedDescription"
                  value={proposedDescription}
                  onChange={(e) => setProposedDescription(e.target.value)}
                  placeholder="New story description"
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="proposedGenre">Proposed Genre</Label>
                <Input
                  id="proposedGenre"
                  value={proposedGenre}
                  onChange={(e) => setProposedGenre(e.target.value)}
                  placeholder="New story genre"
                  required
                />
              </div>
            </>
          )}

          {editType === "segment_content" && (
            <div>
              <Label htmlFor="proposedContent">Proposed Content</Label>
              <Textarea
                id="proposedContent"
                value={proposedContent}
                onChange={(e) => setProposedContent(e.target.value)}
                placeholder="Your proposed changes to this segment"
                rows={6}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="reason">Reason for Edit (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you'd like to make this change..."
              rows={3}
            />
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
              disabled={createEditRequestMutation.isPending}
            >
              {createEditRequestMutation.isPending ? "Submitting..." : "Submit Edit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}