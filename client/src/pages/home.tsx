import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import LoginOptions from "@/components/LoginOptions";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Home() {
  const [showLoginOptions, setShowLoginOptions] = useState(false);
  
  const openLoginOptions = () => {
    setShowLoginOptions(true);
  };
  
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center space-x-2 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M17 7 7.11 15.81"></path>
                <path d="M17 7v10H7V7"></path>
                <path d="M5 3a2 2 0 0 0-2 2"></path>
                <path d="M12 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"></path>
                <path d="M12 21H3a2 2 0 0 1-2-2V5"></path>
              </svg>
              <span className="text-xl font-bold text-primary">PlotTwist</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 max-w-3xl">
              Collaborate with friends, writing stories one turn at a time
            </h1>
            <p className="text-xl text-neutral-600 max-w-prose">
              Build creative narratives together where each person contributes within word limits
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button size="lg" className="font-medium" onClick={openLoginOptions}>
                Signup/Login
              </Button>
              <Button size="lg" variant="outline" className="font-medium" asChild>
                <Link href="/explore">
                  Explore Stories
                </Link>
              </Button>
            </div>
            
            <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
              <DialogContent className="sm:max-w-md">
                <LoginOptions />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900">How It Works</h2>
            <p className="text-lg text-neutral-600 mt-2">Collaborative storytelling made simple</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-neutral-50 p-6 rounded-xl">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"></path>
                  <path d="M12 4h6v6"></path>
                  <path d="m9 15 6-6"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Create a Story</h3>
              <p className="text-neutral-600">
                Start a new story, set a word limit per turn, and invite friends to collaborate.
              </p>
            </div>
            <div className="bg-neutral-50 p-6 rounded-xl">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12h8"></path>
                  <path d="M12 16V8"></path>
                  <rect width="16" height="16" x="4" y="4" rx="2"></rect>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Take Turns</h3>
              <p className="text-neutral-600">
                Contributors take turns writing within the set word limit to build the story together.
              </p>
            </div>
            <div className="bg-neutral-50 p-6 rounded-xl">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Print Your Story</h3>
              <p className="text-neutral-600">
                When the story is complete, print it as a keepsake or gift for contributors. 
                (Under Construction, ts and cs apply, may cause mild to severe allergic reactions)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900">Creative Collaboration</h2>
            <p className="text-lg text-neutral-600 mt-2">
              See how other real totally not made up people are using PlotTwist
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  "Our book club uses PlotTwist, specifically the erotic fiction function, between meetings to keep our creative juices flowing."
                </h3>
                <p className="text-neutral-600 italic">
                  — Sarah L. Fake Book Club Organiser and Casual Testimonial Enthusiast
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  "My creative writing students collaborate on stories to learn about narrative structure and voice."
                </h3>
                <p className="text-neutral-600 italic">
                  — Professor James W. Paid Literature Department Influencer
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-3xl font-bold">Ready to weave your story?</h2>
            <p className="text-xl max-w-prose">
              Join our community of collaborative storytellers today.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-6 bg-white text-primary hover:bg-neutral-100 font-medium"
              onClick={openLoginOptions}
            >
              Sign Up Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-neutral-800 text-neutral-300">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 7 7.11 15.81"></path>
                <path d="M17 7v10H7V7"></path>
                <path d="M5 3a2 2 0 0 0-2 2"></path>
                <path d="M12 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"></path>
                <path d="M12 21H3a2 2 0 0 1-2-2V5"></path>
              </svg>
              <span className="text-lg font-bold">PlotTwist</span>
            </div>
            <div className="text-sm">
              © {new Date().getFullYear()} PlotTwist. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
