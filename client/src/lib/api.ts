
export async function apiRequest(method: string, url: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response;
}

// Fetch invitation status for a story
export async function fetchInviteStatus(storyId: string): Promise<{ joined: boolean; invitedAt: string }[]> {
  const response = await apiRequest('GET', `/api/stories/${storyId}/invite-status`);
  return response.json();
}

// Send invitation reminder for a story
export async function sendInviteReminder(storyId: string): Promise<void> {
  await apiRequest('POST', `/api/stories/${storyId}/invite-status/reminder`);
}
