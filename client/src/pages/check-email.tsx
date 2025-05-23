import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowLeft } from "lucide-react";

export default function CheckEmailPage() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Check Your Email
            </h1>
            
            <p className="text-muted-foreground mb-6">
              We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
            </p>
            
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                  📧 Important: Check Your Spam Folder
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Verification emails sometimes end up in spam or junk mail folders. If you don't see the email in your inbox within a few minutes, please check your spam folder.
                </p>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => setLocation("/login")}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}