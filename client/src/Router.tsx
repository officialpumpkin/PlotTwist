import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

// Lazy load heavy components
const Dashboard = lazy(() => import("@/pages/dashboard"));
const MyStories = lazy(() => import("@/pages/my-stories"));
const Explore = lazy(() => import("@/pages/explore"));
const Settings = lazy(() => import("@/pages/settings"));
const CheckEmail = lazy(() => import("@/pages/check-email"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const NotFound = lazy(() => import("@/pages/not-found"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/check-email" 
              element={
                <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <CheckEmail />
                </Suspense>
              } 
            />
        <Route 
              path="/verify-email" 
              element={
                <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <VerifyEmail />
                </Suspense>
              } 
            />
        <Route 
              path="/reset-password" 
              element={
                <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <ResetPassword />
                </Suspense>
              } 
            />
        <Route path="/explore" element={<Layout><Explore /></Layout>} />

        {/* Protected routes */}
        <Route 
                path="/dashboard" 
                element={
                  <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <Dashboard />
                  </Suspense>
                } 
              />
              <Route 
                path="/my-stories" 
                element={
                  <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <MyStories />
                  </Suspense>
                } 
              />
              <Route 
                path="/explore" 
                element={
                  <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <Explore />
                  </Suspense>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <Settings />
                  </Suspense>
                } 
              />

        {/* 404 route */}
        <Route 
              path="*" 
              element={
                <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <NotFound />
                </Suspense>
              } 
            />
      </Routes>
    </BrowserRouter>
  );
}