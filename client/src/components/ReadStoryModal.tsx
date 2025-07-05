import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Book, Edit, Users, AlertTriangle, X as CloseIcon } from "lucide-react";
import PrintModal from "./PrintModal";
import EditRequestModal from "./EditRequestModal";
import { useState } from "react";
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState<any>(null);
  const [editingStoryMetadata, setEditingStoryMetadata] = useState(false);
  const { user } = useAuth();

  const { data: story } = useQuery({
    queryKey: [`/api/stories/${storyId}`],
    enabled: open
  });

  const { data: segments, isLoading } = useQuery({
    queryKey: [`/api/stories/${storyId}/segments`],
    enabled: open
  });

  const { data: participants } = useQuery({
    queryKey: [`/api/stories/${storyId}/participants`],
    enabled: open
  });

  // Type-safe data with fallbacks
  const safeSegments = Array.isArray(segments) ? segments : [];
  const safeParticipants = Array.isArray(participants) ? participants : [];

  if (!story) return null;

    // Determine if the user can request an edit
    const isAuthor = story?.authorId === user?.id;
    const canRequestEdit = !isAuthor;
    const isParticipant = safeParticipants.some((p: any) => p.userId === user?.id);


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
                <h2 className="text-xl font-bold">{story?.title || 'Untitled Story'}</h2>
                {story?.isEdited && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      Story Edited
                    </span>
                  </div>
                )}
                {/* Edit story metadata button - only for creators */}
                {isAuthor && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingStoryMetadata(true);
                      setShowEditRequestModal(true);
                    }}
                    className="ml-2 h-6 text-xs"
                    title="Edit story details"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit Details
                  </Button>
                )}
              </div>
              <div className="mb-3">
                <div className="relative">
                  <p className="text-sm text-muted-foreground pr-10">{story?.description || 'No description available'}</p>
                  {/* Edit prompt button - only for creators */}
                  {isAuthor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-0 right-0 h-6 w-6 p-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-accent"
                      onClick={() => {
                        setEditingSegment({ id: 'prompt', content: story?.description || '' });
                        setShowEditRequestModal(true);
                      }}
                      title="Edit story prompt"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Story Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{safeParticipants.length} participants</span>
                </div>
                <div>
                  {safeSegments.length} segments
                </div>
                {story?.isComplete && (
                  <span className="bg-accent/10 text-accent px-2 py-1 rounded-full text-xs">
                    Completed
                  </span>
                )}
              </div>
            </div>
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
            ) : safeSegments.length === 0 ? (
              <div className="text-center py-12">
                <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Story Just Started</h3>
                <p className="text-muted-foreground">
                  This story is waiting for its first contribution.
                </p>
              </div>
            ) : (
              <>
                {/* Story content - continuous flow */}
                <div className="story-segment">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {story.description}
                  </p>
                  {safeSegments
                    .sort((a: any, b: any) => a.turn - b.turn)
                    .map((segment: any, index: number) => (
                    <div 
                      key={segment.id}
                      className={`story-segment contributor-text-${index % 5} relative pr-10`}
                    >
                      <div dangerouslySetInnerHTML={{ __html: segment.content || '' }} />
                      {isParticipant && user?.id === segment.userId && (
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
                          <span className="sr-only">
                            Edit segment
                          </span>
                        </Button>
                      )}
                    </div>
                    ))}
                </div>

                {/* Story Status */}
                {story?.isComplete ? (
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

      {/* Print Modal */}
      <PrintModal 
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
        story={story}
      />

      {/* Edit Request Modal */}
      {(editingSegment || editingStoryMetadata) && (
        <EditRequestModal 
          open={showEditRequestModal}
          onOpenChange={(open) => {
            setShowEditRequestModal(open);
            if (!open) {
              setEditingSegment(null);
              setEditingStoryMetadata(false);
            }
          }}
          storyId={story.id}
          editType={editingSegment ? "segment_content" : "story_metadata"}
          segmentId={editingSegment?.id === 'prompt' ? null : editingSegment?.id}
          currentContent={editingSegment?.content}
          currentTitle={editingStoryMetadata ? story?.title : story?.title}
          currentDescription={editingStoryMetadata ? story?.description : story?.description}
          currentGenre={editingStoryMetadata ? story?.genre : story?.genre}
          isPrompt={editingSegment?.id === 'prompt'}
        />
      )}
      </DialogContent>
    </Dialog>
  );
}