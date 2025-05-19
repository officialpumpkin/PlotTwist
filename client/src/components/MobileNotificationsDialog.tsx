import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MobileNotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileNotificationsDialog({ 
  open, 
  onOpenChange 
}: MobileNotificationsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<number | null>(null);

  // Fetch pending invitations
  const { data: invitations, isLoading, refetch } = useQuery({
    queryKey: ['/api/invitations/pending'],
    enabled: open,
  });

  // Handle invitation acceptance
  const handleAccept = async (invitationId: number) => {
    try {
      setPendingAction(invitationId);
      await apiRequest('POST', `/api/invitations/${invitationId}/accept`);
      toast({
        title: 'Invitation accepted',
        description: 'You have successfully joined the story!',
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      setPendingAction(null);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
      setPendingAction(null);
    }
  };

  // Handle invitation decline
  const handleDecline = async (invitationId: number) => {
    try {
      setPendingAction(invitationId);
      await apiRequest('POST', `/api/invitations/${invitationId}/decline`);
      toast({
        title: 'Invitation declined',
        description: 'The invitation has been declined',
      });
      await refetch();
      setPendingAction(null);
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      });
      setPendingAction(null);
    }
  };

  // Auto-close when there are no more invitations
  const pendingCount = Array.isArray(invitations) ? invitations.length : 0;
  if (open && pendingCount === 0 && !isLoading) {
    setTimeout(() => onOpenChange(false), 300);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitations</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading invitations...
            </div>
          ) : pendingCount === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No pending invitations
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              {invitations.map((invitation: any) => (
                <div key={invitation.id} className="p-3 border-b last:border-b-0">
                  <div className="text-sm mb-3">
                    <span className="font-medium">
                      {invitation.inviter?.username || 'Someone'}
                    </span>{' '}
                    invited you to join a story:
                    <div className="font-medium text-primary mt-1">
                      {invitation.story?.title || 'Untitled Story'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {invitation.story?.genre} · {invitation.story?.description.substring(0, 60)}
                      {invitation.story?.description.length > 60 ? '...' : ''}
                    </div>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={pendingAction === invitation.id}
                      onClick={() => handleDecline(invitation.id)}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={pendingAction === invitation.id}
                      onClick={() => handleAccept(invitation.id)}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}