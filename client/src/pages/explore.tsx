import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import StoryCard from "@/components/StoryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function Explore() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const { data: stories, isLoading } = useQuery({
    queryKey: ["/api/stories"],
  });

  // Get user's stories to filter them out from explore
  const { data: userStories } = useQuery({
    queryKey: ["/api/my-stories"],
    enabled: isAuthenticated,
  });

  const joinStoryMutation = useMutation({
    mutationFn: async (storyId: number) => {
      return await apiRequest("POST", `/api/stories/${storyId}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
      toast({
        title: "Success!",
        description: "You've joined the story.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join story",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleJoinStory = (storyId: number) => {
    if (!isAuthenticated) {
      window.location.href = "/register";
      return;
    }
    
    joinStoryMutation.mutate(storyId);
  };

  const filteredStories = stories
    ? stories.filter((story: any) => {
        // Filter out stories user is already involved with
        if (isAuthenticated && userStories) {
          const isAlreadyInvolved = userStories.some((userStory: any) => userStory.id === story.id);
          if (isAlreadyInvolved) {
            return false;
          }
        }
        
        // Apply search filter
        if (searchQuery) {
          if (!story.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
          }
        }
        
        // Apply genre filter
        if (selectedGenre && story.genre !== selectedGenre) {
          return false;
        }
        
        return true;
      })
    : [];

  // Group stories by genre for the genre showcase
  const genres = filteredStories.length > 0
    ? Array.from(new Set(filteredStories.map((story: any) => story.genre)))
    : [];

  // Featured stories (first 3 most recent stories, excluding user's stories)
  const featuredStories = filteredStories.slice(0, 3);

  // Recently added stories (next 3 most recent stories, excluding user's stories)
  const recentStories = filteredStories.slice(3, 6);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Explore Stories</h1>
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
              placeholder="Search for stories to join..." 
              className="w-full md:w-64 pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Featured Stories Section */}
        {isLoading ? (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Featured Stories</h2>
            <div className="relative rounded-xl overflow-hidden shadow-md mb-6 bg-neutral-800">
              <Skeleton className="w-full h-64" />
            </div>
          </div>
        ) : featuredStories.length > 0 ? (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Featured Stories</h2>
            
            {/* Featured Story Banner */}
            <div className="relative rounded-xl overflow-hidden shadow-md mb-6 bg-neutral-800">
              <img 
                src="https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=400" 
                alt="Creative writing desk with an open book and pen" 
                className="w-full h-64 object-cover object-center opacity-60"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <span className="bg-primary text-white text-sm px-3 py-1 rounded-full w-max mb-3">
                  {featuredStories[0].genre} • {featuredStories[0].isComplete ? "Completed" : "Active"}
                </span>
                <h3 className="text-2xl font-bold text-white mb-2">{featuredStories[0].title}</h3>
                <p className="text-neutral-100 mb-4 max-w-3xl">{featuredStories[0].description}</p>
                <Button 
                  className="w-max bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" 
                  onClick={() => handleJoinStory(featuredStories[0].id)}
                >
                  {isAuthenticated ? "Join Story" : "Sign up"}
                </Button>
              </div>
            </div>
            
            {/* Other Featured Stories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredStories.slice(1).map((story: any) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  status={story.isComplete ? "Completed" : "Active"}
                  variant="explore"
                  onJoin={() => handleJoinStory(story.id)}
                />
              ))}
            </div>
          </div>
        ) : null}
        
        {/* Categories Section */}
        {isLoading ? (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Explore by Genre</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="w-full h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : genres.length > 0 ? (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Explore by Genre</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {genres.map((genre: any, index: number) => {
                // Use different background images based on genre
                const images = [
                  "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=150",
                  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=150",
                  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=150",
                  "https://images.unsplash.com/photo-1518199266791-5375a83190b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=150",
                  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=150",
                  "https://images.unsplash.com/photo-1509248961158-e54f6934749c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=150"
                ];
                
                // Count stories in this genre
                const count = filteredStories.filter((s: any) => s.genre === genre).length;
                
                return (
                  <div 
                    key={genre} 
                    className="relative rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                  >
                    <img 
                      src={images[index % images.length]} 
                      alt={`${genre} genre category`} 
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent flex items-end justify-center p-3">
                      <span className="text-white font-medium">{genre}</span>
                    </div>
                    <div className={`absolute inset-0 ${selectedGenre === genre ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} bg-primary/70 flex items-center justify-center transition-opacity`}>
                      <span className="text-white font-medium">{count} Stories</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        
        {/* Recently Added Section */}
        {isLoading ? (
          <div>
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Recently Added</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="w-full h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ) : recentStories.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold text-neutral-800 mb-4">Recently Added</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentStories.map((story: any) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  status={story.isComplete ? "Completed" : "Active"}
                  variant="explore"
                  onJoin={() => handleJoinStory(story.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 rounded-full mb-4">
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
                className="text-neutral-500"
              >
                <path d="M17 7 7.11 15.81"></path>
                <path d="M17 7v10H7V7"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-neutral-800 mb-2">No stories found</h3>
            <p className="text-neutral-600 mb-6">
              {searchQuery || selectedGenre 
                ? "No stories match your search criteria."
                : "Be the first to create a story!"}
            </p>
            {isAuthenticated ? (
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" asChild>
                <a href="/dashboard">Create Your First Story</a>
              </Button>
            ) : (
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" asChild>
                <a href="/register">Sign up to Create Stories</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}