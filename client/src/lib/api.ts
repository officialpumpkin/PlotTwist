export async function apiRequest(method: string, endpoint: string, data?: any): Promise<any> {
  const makeRequest = async (): Promise<Response> => {
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    return fetch(endpoint, config);
  };

  let response = await makeRequest();

  // Retry once on 401 errors (auth issues)
  if (response.status === 401) {
    console.log(`Retrying request to ${endpoint} after 401 error`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    response = await makeRequest();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Fetch invitation status for a story
export async function fetchInviteStatus(storyId: string): Promise<{ joined: boolean; invitedAt: string }[]> {
  const response = await apiRequest('GET', `/api/stories/${storyId}/invite-status`);
  return response.json();
}

// Send invitation reminder for a story
export async function sendInviteReminder(twistId: string): Promise<void> {
  await apiRequest("POST", `/api/plot-twist/${twistId}/invite-status/reminder`);
}

export async function checkStoryAccess(storyId: number): Promise<{
  storyExists: boolean;
  storyTitle?: string;
  userIsParticipant: boolean;
  userId: string;
  participantCount: number;
  segmentCount: number;
  participants: string[];
}> {
  return apiRequest("GET", `/api/debug/story-access/${storyId}`);
}