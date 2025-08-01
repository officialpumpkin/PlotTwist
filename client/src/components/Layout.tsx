Adding toast notification for join request approvals and incorporating necessary imports and useEffect hook.
```
```replit_final_file
import React, { useEffect } from 'react';
import Navbar from './Navbar';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import MobileNav from "./MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // Initialize WebSocket notifications
  useWebSocketNotifications();

  // Listen for join request approval notifications
  useEffect(() => {
    const handleJoinRequestApproved = (event: CustomEvent) => {
      const notification = event.detail;
      toast({
        title: notification.title,
        description: notification.message,
        duration: 5000,
      });
    };

    window.addEventListener('joinRequestApproved', handleJoinRequestApproved as EventListener);

    return () => {
      window.removeEventListener('joinRequestApproved', handleJoinRequestApproved as EventListener);
    };
  }, [toast]);

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        {isMobile ? <MobileNav /> : <Navbar />}
      </div>
      <main className="pt-4">{children}</main>
    </div>
  );
}