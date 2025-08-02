import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { 
  UserIcon, 
  TimeIcon,
  ArrowRightIcon
} from "./assets/icons";
import ReadStoryModal from "./ReadStoryModal";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import EditRequestModal from "./EditRequestModal";

interface StoryCardProps {
  story: any;
  status: "Your Turn" | "Waiting" | "Active" | "Completed";
  variant?: "default" | "explore";
  showProgress?: boolean;
  waitingUserId?: string;
  onContinue?: () => void;
  onComplete?: () => void;
  onPrint?: () => void;
  onJoin?: () => void;
  onRead?: () => void;
}

export default function StoryCard({
  story,
  status,
  variant = "default",
  showProgress = false,
  waitingUserId,
  onContinue,
  onComplete,
  onPrint,
  onJoin,
  onRead
}: StoryCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReadModal, setShowReadModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);



  // Fetch story participants
  const { data: participants } = useQuery({
    queryKey: [`/api/stories/${story.id}/participants`],
    enabled: !!story?.id,
  });

  // Fetch story segments
  const { data: segments } = useQuery({
    queryKey: [`/api/stories/${story.id}/segments`],
    enabled: !!story?.id,
  });

  // Fetch join request status for explore variant
  const { data: joinRequestStatus } = useQuery({
    queryKey: [`/api/stories/${story.id}/join-request-status`],
    enabled: !!story?.id && variant === "explore" && !!user,
  });

  // Find waiting user
  const waitingUser = participants?.find(p => p.userId === waitingUserId)?.user;

  // Calculate progress
  const progress = segments ? 
    Math.min(100, Math.round((segments.length / (story.maxSegments || 30)) * 100)) : 0;

  // Use actual participants count (all users who joined the story)
  const participantCount = participants?.length || 0;

  // Check if user is the creator (needed for leave story logic)
  const isCreator = user && story.creatorId === user.id;

    // Check if the user has contributed segments
    const hasContributed = segments?.some(segment => segment.userId === user?.id);

    // Determine if the user can edit
    const canEdit = isCreator || hasContributed;

    // Determine the read button text
    const readButtonText = canEdit ? "Read/Edit" : "Read";

  // Mutation for leaving a story
  const leaveStoryMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/stories/${story.id}/leave`),
    onSuccess: () => {
      toast({
        title: "Left story",
        description: "You have successfully left this story",
      });
      // Refresh stories lists
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-turn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/waiting-turn"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to leave the story",
      });
    }
  });

  // Mutation for requesting to join a story
  const requestJoinMutation = useMutation({
    mutationFn: (message?: string) => apiRequest("POST", `/api/stories/${story.id}/request-join`, { message }),
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: "Your request to join this story has been sent to the author",
      });
      // Refresh join request status
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${story.id}/join-request-status`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send join request",
      });
    }
  });

  // Mutation for cancelling join request
  const cancelRequestMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/stories/${story.id}/cancel-request`),
    onSuccess: () => {
      toast({
        title: "Request cancelled",
        description: "Your join request has been cancelled",
      });
      // Refresh join request status
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${story.id}/join-request-status`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to cancel join request",
      });
    }
  });

  // Debug logging to help identify issues
  console.log('StoryCard render:', {
    storyId: story.id,
    status,
    hasOnContinue: !!onContinue,
    userId: user?.id,
    currentUserId: story.currentUserId,
    isComplete: story.isComplete,
    shouldShowContinue: !!onContinue && status === "Your Turn",
    currentTurn: story.currentTurn
  });

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow">
      <div className={cn(
        "h-2",
        status === "Your Turn" && "bg-primary",
        status === "Waiting" && "bg-neutral-400",
        status === "Active" && variant === "explore" && "bg-secondary",
        status === "Completed" && "bg-accent"
      )}></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">{story.title || 'Untitled Story'}</h3>
              {story.isEdited && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                    Edited
                  </span>
                </div>
              )}
            </div>
          </div>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            status === "Your Turn" && "bg-primary/10 text-primary",
            status === "Waiting" && "bg-muted text-muted-foreground",
            status === "Active" && variant === "explore" && "bg-secondary/10 text-secondary",
            status === "Completed" && "bg-accent/10 text-accent",
          )}>
            {status === "Waiting" && waitingUser ? `${waitingUser.firstName || waitingUser.username}'s Turn` : status}
          </span>
        </div>

        <div className="h-10 flex items-start">
          <p className="text-muted-foreground text-sm leading-5 overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '2.5rem', // Equivalent to 2 lines at leading-5 (1.25rem per line)
            maxHeight: '2.5rem'
          }}>
            {story.description || '\u00A0'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-neutral-500">
          <div className="flex items-center">
            <UserIcon className="mr-1" />
            <span>{participantCount} participants</span>
          </div>
          {!story.isComplete && segments && (
            <div className="text-xs text-muted-foreground">
              Turn {segments.length + 1} of {story.maxSegments || 30}
            </div>
          )}
        </div>

        {showProgress && (
          <div className="mt-4 bg-neutral-50 dark:bg-neutral-800 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {story.isComplete ? "Final:" : "Progress:"}
              </span>
              <span className="text-sm font-medium">
                {segments ? `${segments.length}/${story.maxSegments || 30} segments` : '0/0 segments'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full",
                  story.isComplete ? "bg-accent" : "bg-primary"
                )} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Participants Section */}
        <div className="mt-5">
          <div className="flex items-end space-x-2">
            {participants && (() => {
              // Find current turn user
              const currentTurnUser = participants.find(p => 
                p.userId === waitingUserId || (status === "Your Turn" && p.userId === user?.id)
              );

              // Filter out current turn user from others
              const otherParticipants = participants.filter(p => 
                p.userId !== currentTurnUser?.userId
              );

              return (
                <>
                  {/* Current turn user - always first (bottom left) */}
                  {currentTurnUser && (
                    <div className="flex flex-col items-center">
                      {/* Chevron turn indicator above avatar */}
                      <svg 
                        className="w-3 h-3 text-primary mb-1" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Avatar className="w-7 h-7 cursor-pointer hover:scale-110 transition-transform border-2 border-primary ring-2 ring-primary/20">
                            {currentTurnUser.user?.profileImageUrl ? (
                              <AvatarImage 
                                src={currentTurnUser.user.profileImageUrl} 
                                alt={`${currentTurnUser.user.firstName || currentTurnUser.user.username}`} 
                                className="object-cover"
                              />
                            ) : (
                              <AvatarFallback className="text-xs">
                                {currentTurnUser.user?.firstName?.[0] || currentTurnUser.user?.username?.[0] || '?'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-48" side="top" align="start" sideOffset={8}>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Avatar className="w-8 h-8">
                                {currentTurnUser.user?.profileImageUrl ? (
                                  <AvatarImage 
                                    src={currentTurnUser.user.profileImageUrl} 
                                    alt={`${currentTurnUser.user.firstName || currentTurnUser.user.username}`} 
                                    className="object-cover"
                                  />
                                ) : (
                                  <AvatarFallback className="text-xs">
                                    {currentTurnUser.user?.firstName?.[0] || currentTurnUser.user?.username?.[0] || '?'}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {currentTurnUser.user?.firstName || currentTurnUser.user?.username || 'Unknown User'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{currentTurnUser.user?.username || 'unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                Current Turn
                              </span>
                              {currentTurnUser.userId === story.creatorId && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  Author
                                </span>
                              )}
                              {segments?.some(segment => segment.userId === currentTurnUser.userId) && (
                                <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                                  Contributor
                                </span>
                              )}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  )}

                  {/* Other participants */}
                  {otherParticipants.map((participant) => {
                    const isAuthor = participant.userId === story.creatorId;
                    const hasContributed = segments?.some(segment => segment.userId === participant.userId);

                    return (
                      <div key={participant.userId}>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Avatar className="w-7 h-7 cursor-pointer hover:scale-110 transition-transform border-2 border-white">
                              {participant.user?.profileImageUrl ? (
                                <AvatarImage 
                                  src={participant.user.profileImageUrl} 
                                  alt={`${participant.user.firstName || participant.user.username}`} 
                                  className="object-cover"
                                />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {participant.user?.firstName?.[0] || participant.user?.username?.[0] || '?'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-48" side="top" align="start" sideOffset={8}>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-8 h-8">
                                  {participant.user?.profileImageUrl ? (
                                    <AvatarImage 
                                      src={participant.user.profileImageUrl} 
                                      alt={`${participant.user.firstName || participant.user.username}`} 
                                      className="object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback className="text-xs">
                                      {participant.user?.firstName?.[0] || participant.user?.username?.[0] || '?'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {participant.user?.firstName || participant.user?.username || 'Unknown User'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    @{participant.user?.username || 'unknown'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {isAuthor && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                    Author
                                  </span>
                                )}
                                {hasContributed && (
                                  <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                                    Contributor
                                  </span>
                                )}
                                {!hasContributed && !isAuthor && (
                                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                    Participant
                                  </span>
                                )}
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div></div>
          <div className="flex space-x-2">
            {/* Continue Writing button - only visible if it's user's turn */}
            {status === "Your Turn" && onContinue && (
              <Button size="sm" onClick={onContinue} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Continue Writing
              </Button>
            )}

            {/* Read/Edit button for non-turn stories */}
            {status === "Active" && onRead && (
              <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={onRead}>
                Read/Edit
              </Button>
            )}

            {status === "Waiting" && (
              <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => setShowReadModal(true)}>
                {readButtonText}
              </Button>
            )}

            {status === "Completed" && (
              <>
                <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={onRead || (() => setShowReadModal(true))}>
                  Read/Edit
                </Button>
                {onPrint && (
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onPrint}>
                    Print
                  </Button>
                )}
              </>
            )}

            {variant === "explore" && (
              <>
                {user ? (
                  <>
                    {joinRequestStatus?.hasRequest ? (
                      joinRequestStatus.status === "pending" ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-200 text-red-500 hover:bg-red-50"
                          onClick={() => cancelRequestMutation.mutate()}
                          disabled={cancelRequestMutation.isPending}
                        >
                          {cancelRequestMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
                        </Button>
                      ) : joinRequestStatus.status === "approved" ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled
                        >
                          Request Approved
                        </Button>
                      ) : joinRequestStatus.status === "denied" ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled
                        >
                          Request Denied
                        </Button>
                      ) : null
                    ) : (
                      <Button 
                        size="sm" 
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => requestJoinMutation.mutate()}
                        disabled={requestJoinMutation.isPending}
                      >
                        {requestJoinMutation.isPending ? 'Requesting...' : 'Request to Join'}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => window.location.href = '/register'}
                  >
                    Sign up
                  </Button>
                )}
              </>
            )}

            {/* Leave Story button - only visible for participants who are not creators */}
            {variant !== "explore" && !isCreator && user && status !== "Completed" && (
              <Button 
                size="sm" 
                variant="outline" 
                className="border-red-200 text-red-500 hover:bg-red-50"
                onClick={() => leaveStoryMutation.mutate()}
                disabled={leaveStoryMutation.isPending}
              >
                {leaveStoryMutation.isPending ? 'Leaving...' : 'Leave Story'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Read Story Modal */}
      <ReadStoryModal 
        open={showReadModal}
        onOpenChange={setShowReadModal}
        storyId={story.id}
      />

            {/* Edit Request Modal */}
      <EditRequestModal 
        open={showEditRequestModal}
        onOpenChange={setShowEditRequestModal}
        storyId={story.id}
        editType="story_metadata"
        currentTitle={story.title}
        currentDescription={story.description}
        currentGenre={story.genre}
      />
    </div>
  );
}