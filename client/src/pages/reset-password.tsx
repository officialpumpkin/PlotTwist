
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'resetting' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token from URL
    const searchParams = new URLSearchParams(window.location.search);
    const resetToken = searchParams.get('token');

    if (!resetToken) {
      setStatus('invalid');
      setMessage('No reset token provided');
      return;
    }

    setToken(resetToken);

    // Verify the token
    apiRequest('/api/auth/verify-reset-token?token=' + encodeURIComponent(resetToken))
      .then((response) => {
        setStatus('valid');
        setEmail(response.email);
        setMessage('Enter your new password below');
      })
      .catch((error) => {
        setStatus('invalid');
        setMessage(error.message || 'Invalid or expired reset token');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setStatus('resetting');

    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      setStatus('success');
      setMessage('Password reset successfully! You can now log in with your new password.');
      
      toast({
        title: "Success",
        description: "Password reset successfully!",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to reset password');
      
      toast({
        title: "Error",
        description: error.message || 'Failed to reset password',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
        </div>

        {status === 'loading' && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Verifying reset token...</span>
          </div>
        )}

        {status === 'invalid' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {message}
              <div className="mt-4">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status === 'valid' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Reset password for: <strong>{email}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="sr-only">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="pr-10"
                      placeholder="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="pr-10"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="group relative w-full flex justify-center"
                disabled={status === 'resetting'}
              >
                {status === 'resetting' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </div>

            <div className="text-center">
              <Link href="/login">
                <Button variant="link" size="sm">
                  Back to Login
                </Button>
              </Link>
            </div>
          </form>
        )}

        {status === 'resetting' && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Resetting password...</span>
          </div>
        )}

        {status === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {message}
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Redirecting to login page in 3 seconds...
                </p>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="mt-2">
                    Go to Login Now
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {message}
              <div className="mt-4">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
