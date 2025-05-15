import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import LoginForm from "@/components/LoginForm";
import Layout from "@/components/Layout";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  
  // Redirect to home if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[80vh]">
        <LoginForm />
      </div>
    </Layout>
  );
}