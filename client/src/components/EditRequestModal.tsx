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
  isPrompt?: boolean;
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
  isPrompt = false,
}: EditRequestModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Helper function to strip HTML tags from content
  const stripHtmlTags = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Helper function to wrap plain text in paragraph tags
  const wrapInParagraphs = (text: string) => {
    if (!text.trim()) return '';
    // Split by double line breaks to create paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
  };

  const [proposedContent, setProposedContent] = useState(stripHtmlTags(currentContent));
  const [proposedTitle, setProposedTitle] = useState(currentTitle);
  const [proposedDescription, setProposedDescription] = useState(currentDescription);
  const [proposedGenre, setProposedGenre] = useState(currentGenre);
  const [reason, setReason] = useState("");

  const createEditRequestMutation = useMutation({
    mutationFn: async () => {
      // If it's a prompt edit, treat it as story metadata with only description change
      if (isPrompt) {
        return await apiRequest("POST", `/api/stories/${storyId}/edit-requests`, {
          editType: "story_metadata",
          proposedTitle: currentTitle, // Keep current title
          proposedDescription: proposedContent, // Update description with new prompt
          proposedGenre: currentGenre, // Keep current genre
          reason,
        });
      }
      
      return await apiRequest("POST", `/api/stories/${storyId}/edit-requests`, {
        editType,
        segmentId,
        proposedContent: editType === "segment_content" ? wrapInParagraphs(proposedContent) : undefined,
        proposedTitle: editType === "story_metadata" ? proposedTitle : undefined,
        proposedDescription: editType === "story_metadata" ? proposedDescription : undefined,
        proposedGenre: editType === "story_metadata" ? proposedGenre : undefined,
        reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit request submitted!",
        description: isPrompt 
          ? "Your prompt edit request has been sent to the story author for approval."
          : "Your edit request has been sent to the story author for approval.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/segments`] });
      onOpenChange(false);
      // Reset form
      setReason("");
      setProposedContent(stripHtmlTags(currentContent));
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

    if (isPrompt && proposedContent.trim() === "") {
      toast({
        title: "Error",
        description: "Proposed prompt cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (editType === "segment_content" && !isPrompt && proposedContent.trim() === "") {
      toast({
        title: "Error",
        description: "Proposed content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (editType === "story_metadata" && !isPrompt && (!proposedTitle.trim() || !proposedDescription.trim() || !proposedGenre.trim())) {
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
            Request Edit: {isPrompt ? "Story Prompt" : editType === "story_metadata" ? "Story Details" : "Segment Content"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isPrompt && (
            <div>
              <Label htmlFor="proposedContent">Proposed Story Prompt</Label>
              <Textarea
                id="proposedContent"
                value={proposedContent}
                onChange={(e) => setProposedContent(e.target.value)}
                placeholder="Your proposed changes to the story prompt"
                rows={6}
                required
              />
            </div>
          )}

          {editType === "story_metadata" && !isPrompt && (
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

          {editType === "segment_content" && !isPrompt && (
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