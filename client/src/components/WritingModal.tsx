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
import { Edit, Settings } from "lucide-react";

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
  const isAuthor = (participants as any[])?.some((p: any) => 
    p.userId === user?.id && p.role === 'author'
  ) || (story as any)?.creatorId === user?.id;

  // Calculate the progress
  const progress = story && segments 
    ? Math.min(100, Math.round(((segments as any[]).length / ((story as any).maxSegments || 30)) * 100)) 
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
    story && wordCount <= ((story as any).wordLimit || 100);

  const isValidCharacterCount = characterCount > 0 && 
    (!(story as any)?.characterLimit || characterCount <= (story as any).characterLimit);

  const isValidContribution = isValidWordCount && isValidCharacterCount;

  // Show validation warnings
  const isWordCountExceeded = story && wordCount > (story as any).wordLimit;
  const isCharacterCountExceeded = story && (story as any).characterLimit > 0 && characterCount > (story as any).characterLimit;

  // Sort segments by turn number
  const sortedSegments = (segments as any[])?.sort((a: any, b: any) => a.turn - b.turn);

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
      <DialogContent className="sm:max-w-4xl p-0 h-[90vh] flex flex-col [&>button]:hidden" aria-describedby="writing-modal-description">
        <div className="sr-only" id="writing-modal-description">Writing modal for story collaboration</div>
        <h2 className="sr-only">Story Writing Interface</h2>

        {/* Split into 2 sections: header and scrollable content with editor at bottom */}
        <div className="flex flex-col h-full">
          {/* Compact Story Header */}
          <div className="p-4 border-b border-border shrink-0 bg-background z-10">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-foreground">{(story as any)?.title || 'Untitled Story'}</h2>
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                    {(story as any)?.genre}
                  </span>
                  {/* Story Controls button - only for authors */}
                  {isAuthor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowStoryControls(true)}
                      className="h-6 text-xs"
                      title="Story controls and settings"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Controls
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Turn {(turn as any)?.currentTurn} of {(story as any)?.maxSegments}</span>
                  <span>
                    {(turn as any)?.currentUserId === user?.id ? "Your turn" : "Waiting"}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span>{(participants as any[])?.length || 0} participants</span>
                    <span>•</span>
                    <span>{(story as any)?.wordLimit} words max</span>
                    {(story as any)?.characterLimit > 0 && (
                      <>
                        <span>•</span>
                        <span>{(story as any)?.characterLimit} chars max</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground ml-2"
              >
                <CloseIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main scrollable story content area - takes most of the screen */}
          <div className="flex-1 overflow-y-auto bg-muted/30">
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {/* Story prompt */}
              <div className="relative bg-muted/30 border border-border/30 rounded-lg p-4 mb-6">
                <p className="font-serif text-foreground leading-relaxed whitespace-pre-wrap">
                  {(story as any)?.description}
                </p>
                {/* Edit prompt button - only for authors */}
                {isAuthor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 -right-12 h-6 w-6 p-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent"
                    onClick={() => {
                      setEditingSegment({ id: 'prompt', content: (story as any)?.description || '' });
                      setShowEditRequestModal(true);
                    }}
                    title="Edit story prompt"
                  >
                    <Edit className="h-3 w-3" />
                    <span className="sr-only">Edit story prompt</span>
                  </Button>
                )}
              </div>

              {/* Story segments */}
              {recentSegments?.map((segment: any, index: number) => (
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
                      className="absolute top-0 -right-12 h-6 w-6 p-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent"
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

              {/* Writing area for user's turn - positioned at bottom of scroll */}
              {(turn as any)?.currentUserId === user?.id && (
                <div className="bg-background border border-border rounded-lg p-4 mt-6 mb-6">
                  <div className="flex items-start space-x-3 mb-3">
                    <Avatar className="h-8 w-8">
                      {user?.profileImageUrl ? (
                        <AvatarImage 
                          src={user.profileImageUrl} 
                          alt={user.username || "User"} 
                        />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {user?.firstName?.[0] || user?.username?.[0] || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm mb-2">Your Turn</p>
                      
                      {/* React Quill Editor */}
                      <div className="mb-4">
                        <ReactQuill
                          ref={quillRef}
                          theme="snow"
                          value={content}
                          onChange={setContent}
                          modules={modules}
                          formats={formats}
                          placeholder={(segments as any[])?.length === 0 ? "It's time to begin the story! You're the first contributor." : "Continue the story... Let your imagination flow!"}
                          className="font-serif text-foreground"
                          style={{ height: '150px' }}
                        />
                      </div>

                      {/* Word/Character Count and Submit */}
                      <div className="flex justify-between items-center mt-12">
                        <div className="bg-background/90 rounded-md px-3 py-2 shadow-sm border border-border">
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-muted-foreground">Words:</span>
                            <span className={`font-medium ${isWordCountExceeded ? "text-destructive" : "text-primary"}`}>
                              {wordCount}
                            </span>
                            <span className="text-muted-foreground">/{(story as any)?.wordLimit}</span>
                            
                            {(story as any)?.characterLimit > 0 && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">Chars:</span>
                                <span className={`font-medium ${isCharacterCountExceeded ? "text-destructive" : "text-primary"}`}>
                                  {characterCount}
                                </span>
                                <span className="text-muted-foreground">/{(story as any)?.characterLimit}</span>
                              </>
                            )}
                          </div>
                          
                          {(isWordCountExceeded || isCharacterCountExceeded) && (
                            <div className="text-sm text-destructive mt-1">
                              {isWordCountExceeded && <span>Exceeds word limit</span>}
                              {isWordCountExceeded && isCharacterCountExceeded && <span> & </span>}
                              {isCharacterCountExceeded && <span>Exceeds character limit</span>}
                            </div>
                          )}
                        </div>

                        <Button 
                          size="default" 
                          className="gap-2"
                          disabled={!isValidContribution || addSegmentMutation.isPending}
                          onClick={() => addSegmentMutation.mutate()}
                        >
                          {addSegmentMutation.isPending ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <polyline points="19 12 12 19 5 12"></polyline>
                              </svg>
                              Submit Turn
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Extra padding at bottom */}
              <div className="h-8"></div>
            </div>
          </div>

          {/* Story Progress - Fixed height footer */}
          <div className="p-3 border-t border-border bg-background shrink-0">
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
                  {(segments as any[])?.length || 0}/{(story as any)?.maxSegments || 30}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(story as any)?.creatorId === user?.id && progress >= 80 && onComplete && (
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
        onClose={() => setShowStoryControls(false)}
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