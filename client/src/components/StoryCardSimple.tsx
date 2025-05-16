import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserIcon, 
  TimeIcon
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

export default function StoryCardSimple({
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
  
  // Fetch story segments
  const { data: segments } = useQuery({
    queryKey: [`/api/stories/${story.id}/segments`],
    enabled: !!story?.id,
  });
  
  // Find waiting user
  const waitingUser = participants?.find((p: any) => p.userId === waitingUserId)?.user;
  
  // Calculate progress
  const progress = segments ? 
    Math.min(100, Math.round((segments.length / (story.maxSegments || 30)) * 100)) : 0;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
      {/* Color indicator */}
      <div className={cn(
        "h-2 rounded-t-xl",
        status === "Your Turn" && "bg-primary",
        status === "Waiting" && "bg-neutral-400",
        status === "Active" && variant === "explore" && "bg-secondary",
        status === "Completed" && "bg-accent"
      )}></div>
      
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg">{story.title}</h3>
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
        
        {/* Description */}
        <p className="text-neutral-600 text-sm mb-4">{story.description}</p>

        {/* Only show up to 2 most recent segments */}
        {segments && segments.length > 0 && (
          <div className="my-3">
            {segments.slice(-2).map((segment: any) => (
              <div key={segment.id} className="bg-neutral-50 p-3 rounded-md mb-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="w-5 h-5">
                    {segment.user?.profileImageUrl ? (
                      <AvatarImage src={segment.user.profileImageUrl} alt={segment.user?.username || "User"} />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {segment.user?.firstName?.[0] || segment.user?.username?.[0] || "U"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="text-xs font-medium">{segment.user?.firstName || segment.user?.username}</span>
                </div>
                <p className="text-neutral-700 font-serif">{segment.content}</p>
              </div>
            ))}
            {segments.length > 2 && (
              <p className="text-xs text-neutral-500 text-center my-1">
                {segments.length - 2} more segment{segments.length - 2 !== 1 ? 's' : ''} not shown
              </p>
            )}
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center text-xs text-neutral-500 my-3">
          <UserIcon className="mr-1 w-3 h-3" />
          <span>{participants?.length || 0} contributors</span>
          <span className="mx-2">•</span>
          <TimeIcon className="mr-1 w-3 h-3" />
          <span>{segments ? `${segments.length}/${story.maxSegments || 30} segments` : 'New story'}</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 mt-4">
          {status === "Your Turn" && onContinue && (
            <Button size="sm" onClick={onContinue}>Continue</Button>
          )}
          
          {status === "Waiting" && (
            <Button size="sm" variant="outline" className="text-neutral-500 cursor-not-allowed">
              Waiting
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
  );
}