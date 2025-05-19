import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

import InviteCollaboratorModal from "./InviteCollaboratorModal";

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
  
  // Rich text editing state
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

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
  
  // Rich text editing functions
  const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
    if (!editorRef.current) return;
    
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (start === end) {
      // No text selected, toggle the formatting state for next input
      switch (format) {
        case 'bold':
          setIsBold(!isBold);
          break;
        case 'italic':
          setIsItalic(!isItalic);
          break;
        case 'underline':
          setIsUnderline(!isUnderline);
          break;
      }
      return;
    }
    
    let formattedText = '';
    let newContent = '';
    
    switch (format) {
      case 'bold':
        formattedText = `<strong>${selectedText}</strong>`;
        break;
      case 'italic':
        formattedText = `<em>${selectedText}</em>`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
    }
    
    newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Set selection position after applying formatting
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + formattedText.length;
      textarea.setSelectionRange(start, newPosition);
    }, 0);
  };

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
      <DialogContent className="sm:max-w-3xl p-0 h-[95vh] flex flex-col overflow-hidden" aria-describedby="writing-modal-description">
        <div className="sr-only" id="writing-modal-description">Writing modal for story collaboration</div>
        <div className="absolute top-4 right-4 z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 text-neutral-400 hover:text-neutral-500"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Split into 3 fixed-height sections: header, scrollable content, footer */}
        <div className="flex flex-col h-full">
          {/* Fixed Story Header - absolute height */}
          <div className="p-3 border-b border-neutral-200 shrink-0 bg-white z-10 h-[100px]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">{story?.title}</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Turn {turn?.currentTurn} of {story?.maxSegments} • {turn?.currentUserId === user?.id ? "Your turn" : "Waiting"}
                </p>
              </div>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                {story?.genre}
              </span>
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
          <div className="overflow-y-auto bg-neutral-50 flex-grow">
            <div className="p-4 max-w-3xl mx-auto space-y-4">
              {/* Original Story Prompt - Always show this */}
              <div className="bg-white rounded-lg shadow-sm p-4 border border-neutral-200 mb-5">
                <div className="flex items-start space-x-3 mb-2">
                  <div className="h-8 w-8 flex items-center justify-center bg-primary text-white rounded-full ring-2 ring-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-neutral-800">Story Prompt</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-full">
                        Original
                      </span>
                      <span>
                        {new Date(story?.createdAt || Date.now()).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="font-serif text-neutral-700 leading-relaxed">
                  <h3 className="text-lg font-semibold mb-2">{story?.title}</h3>
                  <p className="italic">{story?.description}</p>
                  
                  {recentSegments?.length === 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      <p className="text-sm text-neutral-500">It's time to begin the story! You're the first contributor.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Previous Content with connecting lines to show the story flow */}
              <div className="relative">
                {recentSegments?.map((segment, index) => (
                  <div key={segment.id} className="relative">
                    {/* Vertical connecting line between segments */}
                    {index < (recentSegments?.length || 0) - 1 && (
                      <div className="absolute left-4 top-16 w-0.5 bg-neutral-200 h-6 z-0"></div>
                    )}
                    
                    <div className={`bg-white rounded-lg shadow-sm p-4 border mb-5 relative z-10 ${
                      segment.userId === user?.id 
                        ? "border-primary/30 bg-primary/5" 
                        : "border-neutral-200"
                    }`}>
                      <div className="flex items-start space-x-3 mb-2">
                        <Avatar className="h-8 w-8 ring-2 ring-white">
                          {segment.user?.profileImageUrl ? (
                            <AvatarImage 
                              src={segment.user.profileImageUrl} 
                              alt={segment.user?.username || "User"} 
                            />
                          ) : (
                            <AvatarFallback className={segment.userId === user?.id ? "bg-primary text-white" : ""}>
                              {segment.user?.firstName?.[0] || segment.user?.username?.[0] || "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium text-neutral-800">
                            {segment.userId === user?.id 
                              ? "You" 
                              : (segment.user?.firstName || segment.user?.username || "Unknown User")}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span className="bg-neutral-100 px-2 py-0.5 rounded-full">Turn {segment.turn}</span>
                            <span>{new Date(segment.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="font-serif text-neutral-700 leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: segment.content }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Fixed input area at the bottom */}
          {turn?.currentUserId === user?.id && (
            <div className="border-t border-neutral-200 bg-white shrink-0 p-3 pb-8 h-[240px]">
              <div className="bg-white rounded-lg shadow-sm p-3 border-2 border-primary h-full flex flex-col">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-7 w-7">
                    {user?.profileImageUrl ? (
                      <AvatarImage 
                        src={user.profileImageUrl} 
                        alt={user.username || "User"} 
                      />
                    ) : (
                      <AvatarFallback className="bg-primary text-white">
                        {user?.firstName?.[0] || user?.username?.[0] || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium text-neutral-800 text-sm">Your Turn</p>
                    <p className="text-xs text-neutral-500">Turn {turn.currentTurn} • Now</p>
                  </div>
                </div>
                
                <div className="flex-grow flex flex-col justify-between mt-2">


                  <div className="relative flex-grow">
                    {/* Regular textarea for input */}
                    <textarea 
                      ref={editorRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full h-[80px] p-3 font-serif text-neutral-700 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none shadow-sm overflow-auto" 
                      placeholder="Continue the story... Let your imagination flow!"
                    ></textarea>
                    
                    {/* Hidden preview div to show formatted content */}
                    <div 
                      className="absolute top-0 left-0 w-full h-0 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: content }}
                    ></div>
                    
                    <div className="absolute bottom-2 right-2 bg-white/90 rounded-md px-2 py-1 shadow-sm border border-neutral-100 space-y-1 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-xs text-neutral-500">Words:</span>
                        <span className={`text-sm font-medium ${wordCount > (story?.wordLimit || 100) ? "text-error" : "text-primary"}`}>
                          {wordCount}
                        </span>
                        <span className="text-xs text-neutral-500">/{story?.wordLimit}</span>
                      </div>
                      
                      {story?.characterLimit > 0 && (
                        <div className="flex items-center justify-end space-x-1">
                          <span className="text-xs text-neutral-500">Chars:</span>
                          <span className={`text-sm font-medium ${characterCount > (story?.characterLimit || 0) ? "text-error" : "text-primary"}`}>
                            {characterCount}
                          </span>
                          <span className="text-xs text-neutral-500">/{story?.characterLimit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-2 border-t border-neutral-100">
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn("text-neutral-700 h-8 w-8 p-0", isBold && "bg-primary-50 text-primary border-primary/30")}
                        onClick={() => applyFormatting('bold')}
                        title="Bold"
                      >
                        <BoldIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn("text-neutral-700 h-8 w-8 p-0", isItalic && "bg-primary-50 text-primary border-primary/30")}
                        onClick={() => applyFormatting('italic')}
                        title="Italic"
                      >
                        <ItalicIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn("text-neutral-700 h-8 w-8 p-0", isUnderline && "bg-primary-50 text-primary border-primary/30")}
                        onClick={() => applyFormatting('underline')}
                        title="Underline"
                      >
                        <UnderlineIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
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
          <div className="p-3 border-t border-neutral-200 bg-white shrink-0 h-[60px]">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center">
                <span className="text-xs text-neutral-600 mr-2">Progress:</span>
                <div className="w-24 sm:w-32 bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-xs font-medium text-neutral-700">
                  {segments?.length || 0}/{story?.maxSegments || 30}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {story?.creatorId === user?.id && !story?.isComplete && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <UserIcon className="h-3 w-3 mr-1" />
                    Invite
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
      
      {/* Invite collaborator modal */}
      <InviteCollaboratorModal 
        open={showInviteModal} 
        onOpenChange={setShowInviteModal}
        storyId={storyId}
      />
    </Dialog>
  );
}