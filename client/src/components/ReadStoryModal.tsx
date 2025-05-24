import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { X as CloseIcon, Book, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ReadStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: number;
}

export default function ReadStoryModal({ 
  open, 
  onOpenChange, 
  storyId 
}: ReadStoryModalProps) {
  const { user } = useAuth();

  const { data: story } = useQuery({
    queryKey: ['/api/stories', storyId],
    enabled: open
  });

  const { data: segments, isLoading } = useQuery({
    queryKey: ['/api/stories', storyId, 'segments'],
    enabled: open
  });

  const { data: participants } = useQuery({
    queryKey: ['/api/stories', storyId, 'participants'],
    enabled: open
  });

  if (!story) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 h-[90vh] flex flex-col" aria-describedby="read-story-description">
        <div className="sr-only" id="read-story-description">Reading story content</div>
        
        {/* Header */}
        <div className="p-6 border-b border-border shrink-0 bg-background">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Book className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">{story.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{story.description}</p>
              
              {/* Story Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{participants?.length || 0} writers</span>
                </div>
                <div>
                  {segments?.length || 0} segments
                </div>
                {story.isCompleted && (
                  <span className="bg-accent/10 text-accent px-2 py-1 rounded-full text-xs">
                    Completed
                  </span>
                )}
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <CloseIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Story Content */}
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading story...</p>
              </div>
            ) : !segments || segments.length === 0 ? (
              <div className="text-center py-12">
                <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Story Just Started</h3>
                <p className="text-muted-foreground">
                  This story is waiting for its first contribution.
                </p>
              </div>
            ) : (
              <>
                {/* Original Story Prompt */}
                <div className="bg-background rounded-lg border border-primary/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                      <Book className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Story Prompt</h3>
                      <p className="text-sm text-muted-foreground">How it all began</p>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {story.description}
                    </p>
                  </div>
                </div>

                {/* Story Segments */}
                {segments.map((segment, index) => (
                  <div key={segment.id} className="relative">
                    {/* Connecting line */}
                    {index < segments.length - 1 && (
                      <div className="absolute left-5 top-16 w-0.5 bg-border h-6 z-0"></div>
                    )}
                    
                    <div className={`bg-background rounded-lg border p-6 relative z-10 ${
                      segment.userId === user?.id 
                        ? "border-primary/30 bg-primary/5" 
                        : "border-border"
                    }`}>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-10 w-10 ring-2 ring-background">
                          {segment.user?.profileImageUrl ? (
                            <AvatarImage 
                              src={segment.user.profileImageUrl} 
                              alt={segment.user?.username || "User"} 
                            />
                          ) : (
                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                              {segment.user?.username?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {segment.user?.firstName || segment.user?.username || "Anonymous"}
                            </h4>
                            {segment.userId === user?.id && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Turn {segment.turn} • {new Date(segment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="prose prose-sm max-w-none">
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap mb-0">
                          {segment.content}
                        </p>
                      </div>
                      
                      {/* Word count */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          {segment.content.split(/\s+/).filter(word => word.length > 0).length} words
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Story Status */}
                {story.isCompleted ? (
                  <div className="text-center py-8 border-t border-border">
                    <div className="bg-accent/10 text-accent px-4 py-2 rounded-full inline-flex items-center gap-2">
                      <Book className="h-4 w-4" />
                      <span className="font-medium">Story Complete</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      This collaborative story has reached its conclusion.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Story continues... waiting for the next contribution.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0 bg-background">
          <div className="flex justify-center">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}