import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

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
  const [currentPage, setCurrentPage] = useState(1);
  const SEGMENTS_PER_PAGE = 3;

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

  // Add segment mutation
  const addSegmentMutation = useMutation({
    mutationFn: async () => {
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
      setWordCount(content.trim().split(/\s+/).length);
      setCharacterCount(content.length);
    }
  }, [content]);

  // Check if the word and character counts are valid
  const isValidWordCount = wordCount > 0 && 
    story && wordCount <= (story.wordLimit || 100);
    
  const isValidCharacterCount = characterCount > 0 && 
    (!story?.characterLimit || characterCount <= story.characterLimit);
    
  const isValidContribution = isValidWordCount && isValidCharacterCount;

  // Sort segments by turn number
  const sortedSegments = segments?.sort((a, b) => a.turn - b.turn);
  
  // Calculate pagination info
  const totalPages = sortedSegments?.length 
    ? Math.ceil(sortedSegments.length / SEGMENTS_PER_PAGE) 
    : 1;
    
  // Make sure current page is valid
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  
  // Get paginated segments
  const startIndex = (currentPage - 1) * SEGMENTS_PER_PAGE;
  const paginatedSegments = sortedSegments?.slice(startIndex, startIndex + SEGMENTS_PER_PAGE);
  
  // Navigate to next/previous page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(current => current + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(current => current - 1);
    }
  };

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
      <DialogContent className="sm:max-w-3xl p-0 h-[36rem]">
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
        
        <div className="flex flex-col h-full">
          {/* Story Header */}
          <div className="p-6 border-b border-neutral-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">{story?.title}</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Turn {turn?.currentTurn} of {story?.maxSegments} • {turn?.currentUserId === user?.id ? "Your turn" : "Waiting"}
                </p>
              </div>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                {story?.genre}
              </span>
            </div>
            
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center text-sm text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1.5"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{participants?.length || 0} contributors</span>
              </div>
              <div className="flex items-center text-sm text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1.5"
                >
                  <path d="M4 7V4h16v3" />
                  <path d="M9 20h6" />
                  <path d="M12 4v16" />
                </svg>
                <span>{story?.wordLimit} word limit</span>
              </div>
              {story?.characterLimit > 0 && (
                <div className="flex items-center text-sm text-neutral-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 mr-1.5"
                  >
                    <path d="M18 6H6L2 12l4 6h12l4-6-4-6z" />
                    <path d="M12 10v4" />
                    <path d="M12 16h.01" />
                  </svg>
                  <span>{story?.characterLimit} character limit</span>
                </div>
              )}
              <div className="flex items-center text-sm text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  {new Date(story?.createdAt).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
          
          {/* Story Content */}
          <div className="flex-grow overflow-y-auto p-6 bg-neutral-50">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Story title and pagination */}
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-neutral-500">
                  Story So Far ({sortedSegments?.length || 0} segments)
                </h3>
                
                {/* Pagination controls */}
                {sortedSegments && sortedSegments.length > SEGMENTS_PER_PAGE && (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToPrevPage} 
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Previous page</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </Button>
                    <span className="text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToNextPage} 
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <span className="sr-only">Next page</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Initial prompt - always displayed on first page */}
              {currentPage === 1 && story && (
                <div className="bg-white rounded-lg shadow-sm p-5 border border-primary/20 mb-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <Avatar className="h-8 w-8">
                      {story.creator && story.creator.profileImageUrl ? (
                        <AvatarImage 
                          src={story.creator.profileImageUrl} 
                          alt={story.creator.username || "Creator"} 
                        />
                      ) : (
                        <AvatarFallback>
                          {story.creator && (story.creator.firstName?.[0] || story.creator.username?.[0]) || "C"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-neutral-800">
                        {story.creator && (story.creator.firstName || story.creator.username) || "Story Creator"}
                      </p>
                      <p className="text-xs font-medium text-primary">
                        Initial Prompt
                      </p>
                    </div>
                  </div>
                  <div className="prose prose-sm mt-3">
                    <p>{story && story.description}</p>
                  </div>
                </div>
              )}
              
              {/* Display message if no segments yet */}
              {(!sortedSegments || sortedSegments.length === 0) && (
                <div className="py-6 text-center bg-white rounded-lg border border-dashed border-neutral-200">
                  <p className="text-neutral-500">This will be the first contribution to this story!</p>
                </div>
              )}
              
              {/* Previous Content */}
              {paginatedSegments?.map((segment) => (
                <div key={segment.id} className="bg-white rounded-lg shadow-sm p-5 border border-neutral-200">
                  <div className="flex items-start space-x-3 mb-3">
                    <Avatar className="h-8 w-8">
                      {segment.user?.profileImageUrl ? (
                        <AvatarImage 
                          src={segment.user.profileImageUrl} 
                          alt={segment.user.username || "User"} 
                        />
                      ) : (
                        <AvatarFallback>
                          {segment.user?.firstName?.[0] || segment.user?.username?.[0] || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-neutral-800">
                        {segment.user?.firstName || segment.user?.username || "Unknown User"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Turn {segment.turn} • {new Date(segment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="font-serif text-neutral-700">
                    <p>{segment.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Current Turn Input */}
              {turn?.currentUserId === user?.id && (
                <div className="bg-white rounded-lg shadow-sm p-5 border-2 border-primary">
                  <div className="flex items-start space-x-3 mb-4">
                    <Avatar className="h-8 w-8">
                      {user?.profileImageUrl ? (
                        <AvatarImage 
                          src={user.profileImageUrl} 
                          alt={user.username || "User"} 
                        />
                      ) : (
                        <AvatarFallback>
                          {user?.firstName?.[0] || user?.username?.[0] || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium text-neutral-800">Your Turn</p>
                      <p className="text-xs text-neutral-500">Turn {turn.currentTurn} • Now</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-32 p-3 font-serif text-neutral-700 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none" 
                        placeholder="Continue the story..."
                      ></textarea>
                      <div className="absolute bottom-3 right-3 space-y-1 text-right">
                        <div>
                          <span className={wordCount > (story?.wordLimit || 100) ? "text-error font-medium" : "font-medium"}>
                            {wordCount}
                          </span>
                          <span className="text-neutral-500">/{story?.wordLimit} words</span>
                        </div>
                        {story?.characterLimit > 0 && (
                          <div>
                            <span className={characterCount > (story?.characterLimit || 0) ? "text-error font-medium" : "font-medium"}>
                              {characterCount}
                            </span>
                            <span className="text-neutral-500">/{story?.characterLimit} chars</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100">
                          <BoldIcon />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100">
                          <ItalicIcon />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100">
                          <UnderlineIcon />
                        </Button>
                        <div className="w-px h-6 bg-neutral-200"></div>
                        <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100">
                          <EmojiIcon />
                        </Button>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-neutral-700"
                        >
                          Save Draft
                        </Button>
                        <Button 
                          size="sm" 
                          disabled={!isValidContribution || addSegmentMutation.isPending}
                          onClick={() => addSegmentMutation.mutate()}
                        >
                          {addSegmentMutation.isPending ? "Submitting..." : "Submit"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Story Progress */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center">
                <span className="text-sm text-neutral-600 mr-3">Progress:</span>
                <div className="w-32 sm:w-48 bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="ml-3 text-sm font-medium text-neutral-700">
                  {segments?.length || 0}/{story?.maxSegments || 30}
                </span>
              </div>
              
              <div className="flex space-x-2">
                {/* Show invite button only for the creator of the story */}
                {story?.creatorId === user?.id && !story?.isComplete && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm text-neutral-600 hover:text-neutral-800"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <UserIcon className="mr-1" /> Invite Collaborators
                  </Button>
                )}
                
                {onComplete && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm text-neutral-600 hover:text-neutral-800"
                    onClick={onComplete}
                  >
                    <FlagIcon className="mr-1" /> Mark as Complete
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
