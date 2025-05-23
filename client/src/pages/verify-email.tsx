import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [location] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const token = searchParams.get('token');

    console.log('Current location:', location);
    console.log('Extracted token:', token);

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Verify the email
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(response => {
        if (response.ok) {
          return response.json().then(data => {
            setStatus('success');
            setMessage(data.message || 'Email verified successfully!');
          });
        } else {
          return response.json().then(data => {
            setStatus('error');
            setMessage(data.message || 'Verification failed');
          });
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to verify email. Please try again.');
      });
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <div className="text-blue-600 dark:text-blue-400">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Verifying Email</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-green-600 dark:text-green-400">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your email has been successfully verified.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-600 dark:text-red-400">
              <XCircle className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                There was an issue verifying your email address.
              </p>
            </div>
          )}
        </div>

        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Link href="/login">
            <Button className="w-full" variant={status === 'success' ? 'default' : 'outline'}>
              {status === 'success' ? 'Continue to Login' : 'Go to Login'}
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="ghost" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}