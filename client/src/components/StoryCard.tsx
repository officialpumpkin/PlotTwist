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
    enabled: !!story?.id && showProgress,
  });
  
  // Find waiting user
  const waitingUser = participants?.find(p => p.userId === waitingUserId)?.user;
  
  // Calculate progress
  const progress = segments ? 
    Math.min(100, Math.round((segments.length / (story.maxSegments || 30)) * 100)) : 0;
    
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
          <span>{participants?.length || 0} contributors</span>
          <span className="mx-2">•</span>
          <TimeIcon className="mr-1" />
          <span>
            {segments ? `${segments.length}/${story.maxSegments || 30} segments` : 'Updated recently'}
          </span>
        </div>
        
        {showProgress && (
          <div className="mt-4 bg-neutral-50 dark:bg-neutral-800 rounded-md p-3">
            <div className="flex items-center justify-between">
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
                <Button size="sm" variant="outline" onClick={() => setShowReadModal(true)}>
                  Read Story
                </Button>
                <Button size="sm" variant="outline" className="bg-neutral-100 text-neutral-500 cursor-not-allowed">
                  {waitingUser ? `${waitingUser.firstName || waitingUser.username}'s Turn` : 'Waiting'}
                </Button>
              </>
            )}
            
            {status === "Completed" && onPrint && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowReadModal(true)}>Read</Button>
                <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={onPrint}>Print</Button>
              </>
            )}
            
            {variant === "explore" && onJoin && (
              <Button 
                size="sm" 
                className={status === "Completed" ? "bg-accent hover:bg-accent/90" : "bg-secondary hover:bg-secondary/90"}
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
    </div>
  );
}
