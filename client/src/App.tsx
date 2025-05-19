import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import MyStories from "@/pages/my-stories";
import Explore from "@/pages/explore";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Instead of blocking the entire UI while loading, we'll handle loading states 
  // within protected routes individually
  return (
    <Switch>
      <Route path="/" component={isLoading ? LoadingScreen : (isAuthenticated ? Dashboard : Home)} />
      <Route path="/dashboard" component={isAuthenticated ? Dashboard : Login} />
      <Route path="/my-stories" component={isAuthenticated ? MyStories : Login} />
      <Route path="/profile" component={isAuthenticated ? Profile : Login} />
      <Route path="/settings" component={isAuthenticated ? Settings : Login} />
      <Route path="/explore" component={Explore} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Simple loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
