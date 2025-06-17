import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { LoginInput, loginSchema } from "@shared/schema";
import { Eye, EyeOff } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginForm() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate(data.redirect || "/");
    },
    onError: (error: any) => {
      // If email verification is required, show special UI
      if (error.emailVerificationRequired) {
        setEmailVerificationRequired(error.email);
        setError(null);
        return;
      }

      const errorMessage = error.message || "Invalid email or password.";
      setError(errorMessage);
      setShowForgotPassword(true);
      setEmailVerificationRequired(null);
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/auth/resend-verification", { email });
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent!",
        description: "Please check your email for the verification link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent!",
        description: "Check your email for instructions to reset your password.",
      });
      setShowForgotPassword(false);
      setError(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: LoginInput) {
    setError(null);
    setEmailVerificationRequired(null);
    loginMutation.mutate(data);
  }

  function handleResendVerification() {
    if (emailVerificationRequired) {
      resendVerificationMutation.mutate(emailVerificationRequired);
    }
  }

  function handleForgotPassword() {
    const email = form.getValues("email");
    if (email) {
      forgotPasswordMutation.mutate(email);
    } else {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
        <p className="text-neutral-600 text-sm">
          Log in to your PlotTwist account
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForgotPassword && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <p className="font-medium">Forgot your password?</p>
              <p className="text-sm">
                We can send you a link to reset your password. Make sure to enter your email address below first.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleForgotPassword}
                disabled={forgotPasswordMutation.isPending}
                className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Send password reset email"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {emailVerificationRequired && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-800">
            <div className="space-y-3">
              <p className="font-medium">Email verification required</p>
              <p className="text-sm">
                Please verify your email address before logging in. Check your inbox for a verification link.
              </p>
              <p className="text-sm">
                Didn't receive the email? Check your spam folder or click below to send a new one.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={resendVerificationMutation.isPending}
                className="mt-2"
              >
                {resendVerificationMutation.isPending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    disabled={loginMutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={loginMutation.isPending}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loginMutation.isPending}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center text-sm">
        <p className="text-neutral-600">
          Don't have an account?{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold"
            onClick={() => navigate("/register")}
          >
            Create account
          </Button>
        </p>
      </div>
    </div>
  );
}