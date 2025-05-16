import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserIcon, 
  TimeIcon,
  ArrowRightIcon
} from "./assets/icons";

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
  
  // Fetch story participants
  const { data: participants } = useQuery({
    queryKey: [`/api/stories/${story.id}/participants`],
    enabled: !!story?.id,
  });
  
  // Fetch story segments - always fetch for scrollbar feature
  const { data: segments } = useQuery({
    queryKey: [`/api/stories/${story.id}/segments`],
    enabled: !!story?.id,
  });
  
  // Find waiting user
  const waitingUser = participants?.find(p => p.userId === waitingUserId)?.user;
  
  // Calculate progress
  const progress = segments ? 
    Math.min(100, Math.round((segments.length / (story.maxSegments || 30)) * 100)) : 0;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow flex flex-col">
      {/* Color indicator */}
      <div className={cn(
        "h-2",
        status === "Your Turn" && "bg-primary",
        status === "Waiting" && "bg-neutral-400",
        status === "Active" && variant === "explore" && "bg-secondary",
        status === "Completed" && "bg-accent"
      )}></div>
      
      {/* Header */}
      <div className="px-6 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-neutral-800">{story.title}</h3>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full whitespace-nowrap",
            status === "Your Turn" && "bg-primary/10 text-primary",
            status === "Waiting" && "bg-neutral-100 text-neutral-600",
            status === "Active" && variant === "explore" && "bg-secondary/10 text-secondary",
            status === "Completed" && "bg-accent/10 text-accent",
          )}>
            {status === "Waiting" && waitingUser ? `${waitingUser.firstName || waitingUser.username}'s Turn` : status}
          </span>
        </div>
      </div>
      
      {/* Story Content */}
      <div className="p-6">
        {/* Description */}
        <div className="mb-4 pb-4 border-b border-neutral-100">
          <h4 className="text-sm font-semibold text-neutral-800 mb-2">Story Description:</h4>
          <p className="text-neutral-600 text-sm">{story.description}</p>
        </div>
        
        {/* Segments - Limited to 2 most recent */}
        {segments && segments.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-3">
              Recent Segments {segments.length > 2 ? `(${segments.length} total)` : ''}:
            </h4>
            <div className="space-y-3">
              {segments.slice(-2).map((segment: any, index: number) => (
                <div key={segment.id || index} className="bg-neutral-50 p-3 rounded-md mb-3">
                  <div className="flex items-start space-x-2 mb-1.5">
                    <Avatar className="w-5 h-5">
                      {segment.user?.profileImageUrl ? (
                        <AvatarImage 
                          src={segment.user.profileImageUrl} 
                          alt={segment.user?.username || "User"} 
                        />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {segment.user?.firstName?.[0] || segment.user?.username?.[0] || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium text-neutral-700">
                        {segment.user?.firstName || segment.user?.username || "Anonymous"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Turn {segment.turn || index + 1}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 font-serif leading-relaxed">{segment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center text-sm text-neutral-500 mt-3">
          <UserIcon className="mr-1" />
          <span>{participants?.length || 0} contributors</span>
          <span className="mx-2">•</span>
          <TimeIcon className="mr-1" />
          <span>
            {segments ? `${segments.length}/${story.maxSegments || 30} segments` : 'Updated recently'}
          </span>
        </div>
      </div>
      
      {/* Footer - Fixed */}
      <div className="px-6 py-4 border-t border-neutral-100 mt-auto">
        {showProgress && (
          <div className="mb-4 bg-neutral-50 rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  story.isComplete ? "bg-accent" : "bg-secondary"
                )}></div>
                <span className="text-sm text-neutral-600">{story.isComplete ? "Final:" : "Progress:"}</span>
              </div>
              <span className="text-sm font-medium">
                {segments ? `${segments.length}/${story.maxSegments || 30} segments` : '0/0 segments'}
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full",
                  story.isComplete ? "bg-accent" : "bg-secondary"
                )} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
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
              <Button size="sm" variant="outline" className="bg-neutral-100 text-neutral-500 cursor-not-allowed">
                {waitingUser ? `${waitingUser.firstName || waitingUser.username}'s Turn` : 'Waiting'}
              </Button>
            )}
            
            {status === "Completed" && onPrint && (
              <>
                <Button size="sm" variant="outline">Read</Button>
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
          </div>
        </div>
      </div>
    </div>
  );
}
