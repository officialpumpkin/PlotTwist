import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import CustomDropdown from '@/components/CustomDropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { counts, markAsRead } = useNotifications();

  // Fetch pending invitations (no polling, updated via WebSocket)
  const { data: pendingInvitations, refetch: refetchInvitations, isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['/api/invitations/pending'],
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const { data: pendingJoinRequests, refetch: refetchJoinRequests, isLoading: isLoadingJoinRequests } = useQuery({
    queryKey: ["/api/join-requests/pending"],
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  });

  // Handle invitation acceptance
  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await apiRequest('POST', `/api/invitations/${invitationId}/accept`);
      toast({
        title: 'Invitation accepted',
        description: 'You have successfully joined the story!',
      });
      refetchInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
    }
  };

  // Handle invitation decline
  const handleDeclineInvitation = async (invitationId: number) => {
    try {
      await apiRequest('POST', `/api/invitations/${invitationId}/decline`);
      toast({
        title: 'Invitation declined',
        description: 'The invitation has been declined',
      });
      refetchInvitations();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      });
    }
  };

  const approveJoinMutation = useMutation({
    mutationFn: (requestId: number) => 
      apiRequest("POST", `/api/join-requests/${requestId}/approve`),
    onSuccess: () => {
      toast({
        title: "Request approved",
        description: "The join request has been approved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests/pending"] });
      refetchJoinRequests();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to approve request",
      });
    }
  });

  const denyJoinMutation = useMutation({
    mutationFn: (requestId: number) => 
      apiRequest("POST", `/api/join-requests/${requestId}/deny`),
    onSuccess: () => {
      toast({
        title: "Request denied",
        description: "The join request has been denied",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/join-requests/pending"] });
      refetchJoinRequests();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to deny request",
      });
    }
  });

  const declineMutation = useMutation({
    mutationFn: (invitationId: number) => 
      apiRequest("POST", `/api/invitations/${invitationId}/decline`),
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "You have declined the story invitation",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/pending"] });
      refetchInvitations();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to decline invitation",
      });
    }
  });

  const handleApproveJoinRequest = (requestId: number) => {
    approveJoinMutation.mutate(requestId);
  };

  const handleDenyJoinRequest = (requestId: number) => {
    denyJoinMutation.mutate(requestId);
  };

  if (!isAuthenticated) return null;

  const totalNotifications = counts.total + (pendingInvitations?.length || 0) + (pendingJoinRequests?.length || 0);

  const isLoading = isLoadingInvitations || isLoadingJoinRequests;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <CustomDropdown
            align="left"
            className="w-64"
            onOpenChange={(open) => {
              if (open) {
                // Mark notifications as read when dropdown opens
                markAsRead('invitations');
                markAsRead('joinRequests');
              }
            }}
            trigger={
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-9 w-9 rounded-full"
              >
                <Bell className="h-[1.2rem] w-[1.2rem]" />
                {totalNotifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {totalNotifications}
                  </Badge>
                )}
              </Button>
            }
          >
              <div className="px-4 py-3 font-medium text-sm border-b">
                Notifications
              </div>

              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : totalNotifications === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-muted-foreground mb-2">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  </div>
                  <div className="text-sm font-medium mb-1">All caught up!</div>
                  <div className="text-xs text-muted-foreground">
                    You'll see story invitations and updates here
                  </div>
                </div>
              ) : (
                <>
                {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Story Invitations</h4>
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{invitation.story?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            From {invitation.inviter?.username}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            disabled={declineMutation.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            disabled={declineMutation.isPending}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pendingJoinRequests && pendingJoinRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Join Requests</h4>
                  {pendingJoinRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{request.story?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            From {request.requester?.firstName || request.requester?.username}
                          </p>
                          {request.message && (
                            <p className="text-xs text-muted-foreground mt-1">"{request.message}"</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveJoinRequest(request.id)}
                            disabled={approveJoinMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDenyJoinRequest(request.id)}
                            disabled={denyJoinMutation.isPending}
                          >
                            Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
              {(!pendingInvitations || pendingInvitations.length === 0) && (!pendingJoinRequests || pendingJoinRequests.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No new notifications
                </p>
              )}
            </CustomDropdown>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notifications</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}