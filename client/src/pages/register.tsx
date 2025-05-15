import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import RegisterForm from "@/components/RegisterForm";
import Layout from "@/components/Layout";

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  
  // Redirect to home if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[80vh]">
        <RegisterForm />
      </div>
    </Layout>
  );
}