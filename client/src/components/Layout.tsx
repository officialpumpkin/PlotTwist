import { ReactNode } from "react";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="font-sans min-h-screen flex flex-col bg-background text-foreground">
      {/* Desktop Navigation - hidden on mobile */}
      <div className="hidden md:block">
        <Navbar />
      </div>
      
      {/* Mobile Navigation - hidden on desktop */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
      
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
