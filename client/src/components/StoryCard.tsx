import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  onJoin
}: StoryCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReadModal, setShowReadModal] = useState(false);

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

  // Find waiting user
  const waitingUser = participants?.find(p => p.userId === waitingUserId)?.user;

  // Calculate progress
  const progress = segments ? 
    Math.min(100, Math.round((segments.length / (story.maxSegments || 30)) * 100)) : 0;

  // Calculate actual contributors (unique users who have written segments)
  const actualContributors = segments ? 
    [...new Set(segments.map(segment => segment.userId))].length : 0;

  // Check if user is the creator (needed for leave story logic)
  const isCreator = user && story.creatorId === user.id;

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
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg">{story.title}</h3>
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

        <p className="text-muted-foreground text-sm line-clamp-3">{story.description}</p>

        <div className="flex items-center mt-4 text-sm text-neutral-500">
          <UserIcon className="mr-1" />
          <span>{actualContributors} contributors</span>
          <span className="mx-2">•</span>
          <TimeIcon className="mr-1" />
          <span>
            {segments ? `${segments.length}/${story.maxSegments || 30} segments` : 'Updated recently'}
          </span>
        </div>

        {showProgress && (
          <div className="mt-4 bg-neutral-50 dark:bg-neutral-800 rounded-md p-3">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center text-sm text-neutral-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>{participants?.length || 0}</span>
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
                  className="h-4 w-4 mr-1"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                <span>Author: {participants?.find(p => p.role === 'author')?.user?.firstName || participants?.find(p => p.role === 'author')?.user?.username || participants?.find(p => p.userId === story.creatorId)?.user?.firstName || participants?.find(p => p.userId === story.creatorId)?.user?.username || 'Unknown'}</span>
              </div>
            </div>
              <div className="flex items-center">
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  story.isComplete ? "bg-accent" : "bg-secondary"
                )}></div>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{story.isComplete ? "Final:" : "Progress:"}</span>
              </div>
              <span className="text-sm font-medium">
                {segments ? `${segments.length}/${story.maxSegments || 30} segments` : '0/0 segments'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
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

        <div className="flex items-center justify-between mt-5">
          <div className="flex -space-x-2">
            {participants?.slice(0, 3).map((participant) => (
              <Avatar key={participant.userId} className="w-7 h-7 border-2 border-white">
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
            ))}
            {participants && participants.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-xs text-neutral-600">
                +{participants.length - 3}
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            {status === "Your Turn" && onContinue && (
              <Button size="sm" onClick={onContinue}>Continue</Button>
            )}

            {status === "Waiting" && (
              <>
                <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => setShowReadModal(true)}>
                  Read Story
                </Button>
                <Button size="sm" variant="outline" className="bg-neutral-100 text-neutral-500 cursor-not-allowed">
                  {waitingUser ? `${waitingUser.firstName || waitingUser.username}'s Turn` : 'Waiting'}
                </Button>
              </>
            )}

            {status === "Completed" && onPrint && (
              <>
                <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => setShowReadModal(true)}>Read</Button>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onPrint}>Print</Button>
              </>
            )}

            {variant === "explore" && onJoin && (
              <Button 
                size="sm" 
                className={status === "Completed" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}
                onClick={onJoin}
              >
                Join Story
              </Button>
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
    </div>
  );
}