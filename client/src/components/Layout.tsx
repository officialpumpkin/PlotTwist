import { ReactNode } from "react";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="font-sans min-h-screen flex flex-col bg-background text-foreground">
      {/* Always show navigation, content will adjust based on auth state */}
      <Navbar />
      <MobileNav />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
