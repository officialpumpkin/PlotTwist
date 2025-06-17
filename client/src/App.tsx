import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Router from "./Router";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.message?.includes("401")) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppWithNotifications() {
  // Now this is safely inside the QueryClientProvider
  useRealTimeNotifications();
  return <Router />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system">
          <TooltipProvider>
            <AppWithNotifications />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;