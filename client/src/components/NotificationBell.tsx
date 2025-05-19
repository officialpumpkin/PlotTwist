import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch pending invitations
  const { data: invitations, refetch, isLoading } = useQuery({
    queryKey: ['/api/invitations/pending'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Handle invitation acceptance
  const handleAccept = async (invitationId: number) => {
    try {
      await apiRequest('POST', `/api/invitations/${invitationId}/accept`);
      toast({
        title: 'Invitation accepted',
        description: 'You have successfully joined the story!',
      });
      refetch();
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
  const handleDecline = async (invitationId: number) => {
    try {
      await apiRequest('POST', `/api/invitations/${invitationId}/decline`);
      toast({
        title: 'Invitation declined',
        description: 'The invitation has been declined',
      });
      refetch();
    } catch (error) {
      console.error('Error declining invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      });
    }
  };

  // Auto-close dropdown when there are no more invitations
  useEffect(() => {
    if (isOpen && Array.isArray(invitations) && invitations.length === 0) {
      setIsOpen(false);
    }
  }, [invitations, isOpen]);

  if (!isAuthenticated) return null;

  const pendingCount = Array.isArray(invitations) ? invitations.length : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Bell className="h-[1.2rem] w-[1.2rem]" />
                  {pendingCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading notifications...
                  </div>
                ) : pendingCount === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  <>
                    {invitations.map((invitation: any) => (
                      <div key={invitation.id} className="p-3 border-b">
                        <div className="text-sm mb-2">
                          <span className="font-medium">
                            {invitation.inviter?.username || 'Someone'}
                          </span>{' '}
                          invited you to join a story:
                          <div className="font-medium text-primary mt-1">
                            {invitation.story?.title || 'Untitled Story'}
                          </div>
                        </div>
                        <div className="flex justify-between gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleDecline(invitation.id)}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleAccept(invitation.id)}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notifications</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}