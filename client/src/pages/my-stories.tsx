import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import StoryCard from "@/components/StoryCard";
import NewStoryModal from "@/components/NewStoryModal";
import WritingModal from "@/components/WritingModal";
import CompleteStoryModal from "@/components/CompleteStoryModal";
import PrintModal from "@/components/PrintModal";
import ReadStoryModal from "@/components/ReadStoryModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyStories() {
  const { user } = useAuth();
  const [newStoryModal, setNewStoryModal] = useState(false);
  const [writingModal, setWritingModal] = useState(false);
  const [completeStoryModal, setCompleteStoryModal] = useState(false);
  const [printModal, setPrintModal] = useState(false);
  const [readModal, setReadModal] = useState(false);
  const [activeStory, setActiveStory] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: myStories, isLoading } = useQuery({
    queryKey: ["/api/my-stories"],
  });

  const openWritingModal = (storyId: number) => {
    setActiveStory(storyId);
    setWritingModal(true);
  };

  const closeWritingModal = () => {
    setWritingModal(false);
  };

  const openCompleteStoryModal = (storyId: number) => {
    setActiveStory(storyId);
    setWritingModal(false);
    setCompleteStoryModal(true);
  };

  const openPrintModal = (storyId: number) => {
    setActiveStory(storyId);
    setCompleteStoryModal(false);
    setPrintModal(true);
  };

  const openReadModal = (storyId: number) => {
    setActiveStory(storyId);
    setReadModal(true);
  };

  const filteredStories = myStories
    ? myStories.filter(story => {
        // Apply search filter
        if (searchQuery) {
          if (!story.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
          }
        }

        // Apply status filter
        if (filter === "active" && story.isComplete) {
          return false;
        }
        if (filter === "completed" && !story.isComplete) {
          return false;
        }
        if (filter === "my-turn") {
          // Check if it's the user's turn
          return story.currentUserId === user?.id && !story.isComplete;
        }
        if (filter === "authored" && user) {
          // Show only stories where the user is the creator
          return story.creatorId === user.id;
        }

        return true;
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">My Stories</h1>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input 
                placeholder="Search stories..." 
                className="w-full md:w-64 pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setNewStoryModal(true)} className="hidden md:flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Story
            </Button>
          </div>
        </div>

        {/* Story Filtering & Sorting */}
        <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by:</span>
              <Button 
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                className={filter === "all" ? "rounded-full" : "bg-muted text-muted-foreground rounded-full hover:bg-muted/80"}
                onClick={() => setFilter("all")}
              >
                All Stories
              </Button>
              <Button 
                variant={filter === "active" ? "default" : "outline"}
                size="sm"
                className={filter === "active" ? "rounded-full" : "bg-muted text-muted-foreground rounded-full hover:bg-muted/80"}
                onClick={() => setFilter("active")}
              >
                Active
              </Button>
              <Button 
                variant={filter === "completed" ? "default" : "outline"}
                size="sm"
                className={filter === "completed" ? "rounded-full" : "bg-muted text-muted-foreground rounded-full hover:bg-muted/80"}
                onClick={() => setFilter("completed")}
              >
                Completed
              </Button>
              <Button 
                variant={filter === "my-turn" ? "default" : "outline"}
                size="sm"
                className={filter === "my-turn" ? "rounded-full" : "bg-muted text-muted-foreground rounded-full hover:bg-muted/80"}
                onClick={() => setFilter("my-turn")}
              >
                My Turn
              </Button>
              <Button 
                variant={filter === "authored" ? "default" : "outline"}
                size="sm"
                className={filter === "authored" ? "rounded-full" : "bg-muted text-muted-foreground rounded-full hover:bg-muted/80"}
                onClick={() => setFilter("authored")}
              >
                Authored
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <select className="text-sm bg-muted text-muted-foreground border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary">
                <option>Recently Updated</option>
                <option>Date Created</option>
                <option>Alphabetical</option>
                <option>Contributors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Story Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="h-2 bg-gray-200"></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-16 w-full" />
                  <div className="flex items-center mt-4 gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="mt-4 bg-neutral-50 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-secondary rounded-full mr-2"></div>
                        <span className="text-sm text-neutral-600">Progress:</span>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-2 w-full mt-2 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between mt-5">
                    <div className="flex -space-x-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => {
              const isMyTurn = story.currentUserId === user?.id && !story.isComplete;

              // Determine status based on actual conditions
              const status = story.isComplete ? "Completed" : isMyTurn ? "Your Turn" : "Active";

              return (
                <StoryCard
                  key={story.id}
                  story={story}
                  status={status}
                  showProgress
                  onContinue={isMyTurn ? () => openWritingModal(story.id) : undefined}
                  onComplete={() => openCompleteStoryModal(story.id)}
                  onPrint={() => openPrintModal(story.id)}
                  onRead={() => openReadModal(story.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
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
                className="text-muted-foreground"
              >
                <path d="M17 7 7.11 15.81"></path>
                <path d="M17 7v10H7V7"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No stories found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? "No stories match your search criteria."
                : "It looks like you haven't created or joined any stories yet."}
            </p>
            <Button onClick={() => setNewStoryModal(true)}>
              Create Your First Story
            </Button>
          </div>
        )}

        {/* Modals */}
        <NewStoryModal open={newStoryModal} onOpenChange={setNewStoryModal} />

        {activeStory && (
          <>
            <WritingModal 
              open={writingModal} 
              onOpenChange={closeWritingModal} 
              storyId={activeStory}
              onComplete={() => {
                // Optional: Handle story completion if needed
                closeWritingModal();
              }}
            />

            <CompleteStoryModal 
              open={completeStoryModal} 
              onOpenChange={setCompleteStoryModal}
              storyId={activeStory}
              onPrint={() => openPrintModal(activeStory)}
            />

            <PrintModal 
              open={printModal} 
              onOpenChange={setPrintModal}
              storyId={activeStory}
            />

            <ReadStoryModal 
              open={readModal} 
              onOpenChange={setReadModal}
              storyId={activeStory}
            />
          </>
        )}
      </div>
  );
}