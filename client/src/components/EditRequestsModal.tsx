
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface EditRequestsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditRequestsModal({ open, onOpenChange }: EditRequestsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: editRequests, isLoading } = useQuery({
    queryKey: ["/api/edit-requests/pending"],
    enabled: open,
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest("POST", `/api/edit-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Edit request approved",
        description: "The edit has been applied to the story.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-stories"] });
    },
    onError: (error) => {
      toast({
        title: "Error approving request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const denyRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest("POST", `/api/edit-requests/${requestId}/deny`);
    },
    onSuccess: () => {
      toast({
        title: "Edit request denied",
        description: "The edit request has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/edit-requests/pending"] });
    },
    onError: (error) => {
      toast({
        title: "Error denying request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Requests</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading edit requests...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Requests ({editRequests?.length || 0})</DialogTitle>
        </DialogHeader>

        {!editRequests || editRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-lg font-medium mb-2">No pending edit requests</div>
            <div className="text-sm text-muted-foreground">
              You'll see edit requests from collaborators here
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {editRequests.map((request: any) => (
                <Card key={request.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          {request.requester?.profileImageUrl ? (
                            <AvatarImage 
                              src={request.requester.profileImageUrl} 
                              alt={request.requester.username} 
                            />
                          ) : (
                            <AvatarFallback>
                              {request.requester?.firstName?.[0] || request.requester?.username?.[0] || "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {request.requester?.username || "Unknown User"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant={request.editType === "story_metadata" ? "default" : "secondary"}>
                        {request.editType === "story_metadata" ? "Story Details" : "Segment Content"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {request.story?.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {request.reason && (
                      <div>
                        <div className="text-sm font-medium mb-1">Reason:</div>
                        <div className="text-sm text-muted-foreground">{request.reason}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Current:</div>
                        <div className="bg-muted p-3 rounded text-sm">
                          {request.editType === "story_metadata" ? (
                            <div className="space-y-2">
                              <div><strong>Title:</strong> {request.story?.title}</div>
                              <div><strong>Description:</strong> {request.story?.description}</div>
                              <div><strong>Genre:</strong> {request.story?.genre}</div>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {request.originalContent}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Proposed:</div>
                        <div className="bg-primary/5 border border-primary/20 p-3 rounded text-sm">
                          {request.editType === "story_metadata" ? (
                            <div className="space-y-2">
                              <div><strong>Title:</strong> {request.proposedTitle}</div>
                              <div><strong>Description:</strong> {request.proposedDescription}</div>
                              <div><strong>Genre:</strong> {request.proposedGenre}</div>
                            </div>
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {request.proposedContent}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => denyRequestMutation.mutate(request.id)}
                        disabled={denyRequestMutation.isPending}
                      >
                        {denyRequestMutation.isPending ? "Denying..." : "Deny"}
                      </Button>
                      <Button
                        onClick={() => approveRequestMutation.mutate(request.id)}
                        disabled={approveRequestMutation.isPending}
                      >
                        {approveRequestMutation.isPending ? "Approving..." : "Approve & Apply"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
