import Navbar from "./Navbar";
import MobileNav from "./MobileNav";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <Navbar />
        <MobileNav />
      </div>
      <main className="pt-4">{children}</main>
    </div>
  );
}