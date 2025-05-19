import { ReactNode } from "react";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";

export default function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="font-sans min-h-screen flex flex-col">
      {/* Only show navigation when authenticated */}
      {isAuthenticated && (
        <>
          <Navbar />
          <MobileNav />
        </>
      )}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
