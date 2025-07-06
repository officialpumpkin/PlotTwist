import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

import { 
  CloseIcon, 
  BoldIcon, 
  ItalicIcon, 
  UnderlineIcon, 
  EmojiIcon,
  FlagIcon,
  UserIcon
} from "./assets/icons";
import { Edit } from "lucide-react";

import InviteCollaboratorModal from "./InviteCollaboratorModal";
import EditRequestModal from "./EditRequestModal";
import StoryControlsModal from "./StoryControlsModal";

interface WritingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
  onComplete?: () => void;
}

export default function WritingModal({ 
  open, 
  onOpenChange, 
  storyId,
  onComplete 
}: WritingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showStoryControls, setShowStoryControls] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);

  // Rich text editor reference
  const quillRef = useRef<ReactQuill>(null);

  // Get story details
  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: open,
  });

  // Get story segments
  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}/segments`],
    enabled: open,
  });

  // Get story turn information
  const { data: turn, isLoading: turnLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}/turn`],
    enabled: open,
  });

  // Get participants
  const { data: participants } = useQuery({
    queryKey: [`/api/stories/${storyId}/participants`],
    enabled: open,
  });

  // Check if current user is the author (either by role or by being the creator)
  const isAuthor = participants?.some(p => 
    p.userId === user?.id && p.role === 'author'
  ) || story?.creatorId === user?.id;

  // Calculate the progress
  const progress = story && segments 
    ? Math.min(100, Math.round((segments.length / (story.maxSegments || 30)) * 100)) 
    : 0;

  // Add segment mutation with rich text support
  const addSegmentMutation = useMutation({
    mutationFn: async () => {
      // The content already has HTML formatting applied through the applyFormatting function
      return await apiRequest("POST", `/api/stories/${storyId}/segments`, {
        content,
        wordCount,
        characterCount,
      });
    },
    onSuccess: () => {
      toast({
        title: "Contribution added!",
        description: "Your contribution has been successfully added to the story.",
      });
      setContent("");
      setWordCount(0);
      setCharacterCount(0);
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/segments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/turn`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-turn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waiting-turn"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error adding contribution",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSkipTurn = async () => {
    try {
      await apiRequest("POST", `/api/stories/${storyId}/skip-turn`);

      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/turn`] });
      queryClient.invalidateQueries({ queryKey: [`/api/my-turn`] });
      queryClient.invalidateQueries({ queryKey: [`/api/waiting-turn`] });

      toast({
        title: "Success",
        description: "Turn has been skipped to the next participant",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to skip turn",
        variant: "destructive",
      });
    }
  };

  // Update word and character count when content changes
  useEffect(() => {
    if (content.trim() === '') {
      setWordCount(0);
      setCharacterCount(0);
    } else {
      // Count words excluding HTML markup
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const textContent = tempDiv.textContent || tempDiv.innerText;
      setWordCount(textContent.trim().split(/\s+/).length);
      setCharacterCount(textContent.length);
    }
  }, [content]);

  // Quill editor modules and formats
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ],
    clipboard: {
      matchVisual: false,
    }
  };

  const formats = [
    'bold', 'italic', 'underline',
    'list', 'bullet'
  ];

  // Check if the word and character counts are valid
  const isValidWordCount = wordCount > 0 && 
    story && wordCount <= (story.wordLimit || 100);

  const isValidCharacterCount = characterCount > 0 && 
    (!story?.characterLimit || characterCount <= story.characterLimit);

  const isValidContribution = isValidWordCount && isValidCharacterCount;

  // Sort segments by turn number
  const sortedSegments = segments?.sort((a, b) => a.turn - b.turn);

  // Get recent segments (up to 5 most recent)
  const recentSegments = sortedSegments?.slice(-5);

  if (storyLoading || segmentsLoading || turnLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl p-0 h-[36rem]">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-neutral-200">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex-grow overflow-y-auto p-6 bg-neutral-50">
              <div className="max-w-3xl mx-auto space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-5 border border-neutral-200">
                    <div className="flex items-start space-x-3 mb-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 h-[95vh] flex flex-col writing-modal-content" aria-describedby="writing-modal-description">
        <div className="sr-only" id="writing-modal-description">Writing modal for story collaboration</div>
        <h2 className="sr-only">Story Writing Interface</h2>

        {/* Split into 3 fixed-height sections: header, scrollable content, footer */}
        <div className="flex flex-col h-full">
          {/* Fixed Story Header - absolute height */}
          <div className="p-3 border-b border-border shrink-0 bg-background z-10 h-[100px]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-foreground">{story?.title || 'Untitled Story'}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Turn {turn?.currentTurn} of {story?.maxSegments} • {turn?.currentUserId === user?.id ? "Your turn" : "Waiting"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                  {story?.genre}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onOpenChange(false)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <CloseIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex items-center text-xs text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 mr-1"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{participants?.length || 0}</span>
              </div>
              <div className="flex items-center text-xs text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 mr-1"
                >
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                </svg>
                <span>{story?.wordLimit} words</span>
              </div>
              {story?.characterLimit > 0 && (
                <div className="flex items-center text-xs text-neutral-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 mr-1"
                  >
                    <path d="M18 6H6L2 12l4 6h12l4-6-4-6z" />
                    <path d="M12 10v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  <span>{story?.characterLimit} chars</span>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Story Content - takes remaining space minus header and input form */}
          <div className="overflow-y-auto bg-muted/30 flex-grow">
            <div className="p-4 max-w-3xl mx-auto space-y-4">
              {/* Story content - continuous flow */}
              
                <div className="relative bg-muted/30 border border-border/30 rounded-lg p-4 mb-4">
                  <p className="font-serif text-foreground leading-relaxed whitespace-pre-wrap">
                    {story?.description}
                  </p>
                  {/* Edit prompt button - only for authors */}
                  {isAuthor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6 p-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent"
                      onClick={() => {
                        setEditingSegment({ id: 'prompt', content: story?.description || '' });
                        setShowEditRequestModal(true);
                      }}
                      title="Edit story prompt"
                    >
                      <Edit className="h-3 w-3" />
                      <span className="sr-only">Edit story prompt</span>
                    </Button>
                  )}
                </div>
              

              {recentSegments?.map((segment, index) => (
                <div 
                  key={segment.id}
                  className={`story-segment font-serif leading-relaxed contributor-text-${index % 5} relative pr-10`}
                >
                  <div dangerouslySetInnerHTML={{ __html: segment.content }} />
                  {/* Edit button for user's own segments */}
                  {user?.id === segment.userId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-0 right-0 h-6 w-6 p-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent"
                      onClick={() => {
                        setEditingSegment(segment);
                        setShowEditRequestModal(true);
                      }}
                      title="Edit your contribution"
                    >
                      <Edit className="h-3 w-3" />
                      <span className="sr-only">Edit your contribution</span>
                    </Button>
                  )}
                </div>
              ))}

              
            </div>
          </div>

          {/* Fixed input area at the bottom */}
          {turn?.currentUserId === user?.id && (
            <div className="border-t border-border bg-background shrink-0 p-4 h-[280px]">
              <div className="h-full flex flex-col">
                <div className="flex items-start space-x-3 mb-3">
                  <Avatar className="h-7 w-7">
                    {user?.profileImageUrl ? (
                      <AvatarImage 
                        src={user.profileImageUrl} 
                        alt={user.username || "User"} 
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.firstName?.[0] || user?.username?.[0] || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground text-sm">Your Turn</p>
                    <p className="text-xs text-muted-foreground">Turn {turn.currentTurn} • Now</p>
                  </div>
                </div>

                <div className="flex-grow flex flex-col">
                  {/* React Quill Editor */}
                  <div className="flex-grow mb-3">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      formats={formats}
                      placeholder={segments?.length === 0 ? "It's time to begin the story! You're the first contributor." : "Continue the story... Let your imagination flow!"}
                      className="font-serif text-foreground h-24"
                      style={{ height: '120px' }}
                    />
                  </div>

                  {/* Word/Character Count */}
                  <div className="flex justify-end mb-3">
                    <div className="bg-background/90 rounded-md px-2 py-1 shadow-sm border border-border text-right">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground">Words:</span>
                        <span className={`text-sm font-medium ${wordCount > (story?.wordLimit || 100) ? "text-destructive" : "text-primary"}`}>
                          {wordCount}
                        </span>
                        <span className="text-xs text-muted-foreground">/{story?.wordLimit}</span>
                      </div>

                      {story?.characterLimit > 0 && (
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-xs text-muted-foreground">Chars:</span>
                          <span className={`text-sm font-medium ${characterCount > (story?.characterLimit || 0) ? "text-destructive" : "text-primary"}`}>
                            {characterCount}
                          </span>
                          <span className="text-xs text-muted-foreground">/{story?.characterLimit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end items-center pt-3 border-t border-border">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="gap-1 h-8"
                        disabled={!isValidContribution || addSegmentMutation.isPending}
                        onClick={() => addSegmentMutation.mutate()}
                      >
                        {addSegmentMutation.isPending ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <polyline points="19 12 12 19 5 12"></polyline>
                            </svg>
                            Submit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Story Progress - Fixed height footer */}
          <div className="p-3 border-t border-border bg-background shrink-0 h-[70px]">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground mr-2">Progress:</span>
                <div className="w-24 sm:w-32 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-xs font-medium text-foreground">
                  {segments?.length || 0}/{story?.maxSegments || 30}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isAuthor && !story?.isComplete && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setShowStoryControls(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Story Controls
                  </Button>
                )}

                {story?.creatorId === user?.id && progress >= 80 && onComplete && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-7 px-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                    onClick={onComplete}
                  >
                    <FlagIcon className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                )}
 
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Story Controls Modal */}
      <StoryControlsModal 
        open={showStoryControls} 
        onOpenChange={setShowStoryControls}
        storyId={storyId}
      />

      {/* Edit Request Modal */}
      {editingSegment && (
        <EditRequestModal 
          open={showEditRequestModal}
          onOpenChange={(open) => {
            setShowEditRequestModal(open);
            if (!open) setEditingSegment(null);
          }}
          storyId={storyId}
          editType="segment_content"
          segmentId={editingSegment.id === 'prompt' ? null : editingSegment.id}
          currentContent={editingSegment.content}
          isPrompt={editingSegment.id === 'prompt'}
        />
      )}
    </Dialog>
  );
}