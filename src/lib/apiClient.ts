// A wrapper around fetch that automatically adds the Clerk auth token.
export const fetchWithAuth = async (url: string, options: RequestInit = {}, getAuthToken: () => Promise<string | null>) => {
    const token = await getAuthToken();
  
    const headers = new Headers(options.headers || {});
    
    // This is the crucial part: adding the authorization token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
  
    const response = await fetch(url, {
      ...options,
      headers,
    });
  
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred' }));
      // Use the error message from the API, or a fallback
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
  
    // Handle cases with no response body (e.g., DELETE 204)
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  };