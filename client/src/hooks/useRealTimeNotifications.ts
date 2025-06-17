
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export function useRealTimeNotifications() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleNotification = useCallback((data: any) => {
    switch (data.type) {
      case 'invitation':
        // Refresh invitations
        queryClient.invalidateQueries({ queryKey: ['/api/invitations/pending'] });
        
        toast({
          title: "New Story Invitation",
          description: `${data.invitation.inviter.username} invited you to "${data.invitation.story.title}"`,
        });
        break;

      case 'contribution':
        // Refresh relevant story data
        queryClient.invalidateQueries({ queryKey: [`/api/stories/${data.storyId}/segments`] });
        queryClient.invalidateQueries({ queryKey: [`/api/stories/${data.storyId}/turn`] });
        queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
        queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
        
        toast({
          title: "New Contribution",
          description: `${data.contributor} added to "${data.storyTitle}"`,
        });
        break;

      case 'turn':
        // Refresh turn-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/my-turn'] });
        queryClient.invalidateQueries({ queryKey: ['/api/waiting-turn'] });
        
        if (data.isYourTurn) {
          toast({
            title: "Your Turn!",
            description: `It's your turn to contribute to "${data.storyTitle}"`,
          });
        }
        break;
    }
  }, [queryClient, toast]);

  useEffect(() => {
    if (!user) return;

    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'connected') {
          handleNotification(data);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [user, handleNotification]);
}
