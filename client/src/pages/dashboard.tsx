import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import SimpleCard from "@/components/SimpleCard";
import NewStoryModal from "@/components/NewStoryModal";
import WritingModal from "@/components/WritingModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";

export default function Dashboard() {
  const { user } = useAuth();
  const [newStoryModal, setNewStoryModal] = useState(false);
  const [writingModal, setWritingModal] = useState(false);
  const [activeStory, setActiveStory] = useState<number | null>(null);

  const { data: myTurnStories, isLoading: myTurnLoading } = useQuery({
    queryKey: ["/api/my-turn"],
  });

  const { data: waitingStories, isLoading: waitingLoading } = useQuery({
    queryKey: ["/api/waiting-turn"],
  });

  const openWritingModal = (storyId: number) => {
    setActiveStory(storyId);
    setWritingModal(true);
  };

  const closeWritingModal = () => {
    setWritingModal(false);
    setActiveStory(null);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <Button 
            onClick={() => setNewStoryModal(true)} 
            className="hidden md:flex items-center"
          >
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

        {/* Welcome & Stats */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="sm:flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-800">
                  Welcome back, {user?.firstName || user?.username || "Storyteller"}!
                </h2>
                <p className="text-neutral-600 mt-1">
                  {myTurnStories?.length 
                    ? `You have ${myTurnStories.length} stories waiting for your contribution.`
                    : "You don't have any stories waiting for your contribution."}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-neutral-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-primary">
                    {(myTurnStories?.length || 0) + (waitingStories?.length || 0)}
                  </p>
                  <p className="text-neutral-600 text-sm">Active Stories</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-accent">
                    {/* This would typically be fetched from the API */}
                    0
                  </p>
                  <p className="text-neutral-600 text-sm">Completed</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 col-span-2 sm:col-span-1">
                  <p className="text-2xl font-bold text-secondary">
                    {/* This would typically be fetched from the API */}
                    0
                  </p>
                  <p className="text-neutral-600 text-sm">Contributors</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Turn */}
        <h2 className="text-xl font-bold text-neutral-800 mb-4">Your Turn</h2>
        {myTurnLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-2 bg-gray-200"></div>
                <CardContent className="p-6">
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
                  <div className="flex justify-between items-center mt-5">
                    <div className="flex -space-x-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : myTurnStories?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {myTurnStories.map((story) => (
              <SimpleCard
                key={story.id}
                title={story.title}
                description={story.description}
                status="Your Turn"
                stats={{
                  contributors: 0,
                  segments: story.segments || 0,
                  maxSegments: story.maxSegments || 30
                }}
                onContinue={() => openWritingModal(story.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center mb-8">
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
            <h3 className="text-lg font-medium text-neutral-800 mb-2">No stories to continue</h3>
            <p className="text-neutral-600 mb-6">It's not your turn in any stories at the moment.</p>
            <Button onClick={() => setNewStoryModal(true)}>
              Create a New Story
            </Button>
          </div>
        )}

        {/* Waiting for Others */}
        <h2 className="text-xl font-bold text-neutral-800 mb-4">Waiting for Others</h2>
        {waitingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-2 bg-gray-200"></div>
                <CardContent className="p-6">
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
                  <div className="flex justify-between items-center mt-5">
                    <div className="flex -space-x-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : waitingStories?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {waitingStories.map((story) => (
              <SimpleCard
                key={story.id}
                title={story.title}
                description={story.description}
                status="Waiting"
                stats={{
                  contributors: 0,
                  segments: story.segments || 0,
                  maxSegments: story.maxSegments || 30
                }}
              />
            ))}
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
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-neutral-800 mb-2">No stories waiting for others</h3>
            <p className="text-neutral-600 mb-6">Join more stories or invite friends to collaborate!</p>
            <Button variant="outline" onClick={() => setNewStoryModal(true)}>
              Create a New Story
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewStoryModal open={newStoryModal} onOpenChange={setNewStoryModal} />
      
      {activeStory && (
        <WritingModal 
          open={writingModal} 
          onOpenChange={closeWritingModal} 
          storyId={activeStory} 
        />
      )}
    </Layout>
  );
}
