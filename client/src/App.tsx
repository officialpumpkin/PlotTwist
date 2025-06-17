import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { useRealTimeNotifications } from "@/hooks/useRealTimeNotifications";
import { Router, Route, Switch } from "wouter";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import MyStories from "@/pages/my-stories";
import Explore from "@/pages/explore";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import CheckEmail from "@/pages/check-email";
import VerifyEmail from "@/pages/verify-email";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Dashboard />;
  }

  return <>{children}</>;
}

function AppRouter() {
  useRealTimeNotifications();

  return (
    <Router>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/login">
          <PublicRoute><Login /></PublicRoute>
        </Route>
        <Route path="/register">
          <PublicRoute><Register /></PublicRoute>
        </Route>
        <Route path="/check-email" component={CheckEmail} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Protected routes */}
        <Route path="/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/my-stories">
          <ProtectedRoute><MyStories /></ProtectedRoute>
        </Route>
        <Route path="/explore">
          <ProtectedRoute><Explore /></ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute><Profile /></ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute><Settings /></ProtectedRoute>
        </Route>

        {/* 404 route */}
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <ErrorBoundary>
          <AppRouter />
          <Toaster />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;