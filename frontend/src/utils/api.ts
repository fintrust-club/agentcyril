import axios from 'axios';
import { supabase } from './supabase';
import type { ProfileData, Project, Chatbot } from './types';
import { toast } from '@/hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Get or create visitor ID for anonymous users
export const getOrCreateVisitorId = (): string => {
  if (typeof window === 'undefined') return '';
  
  let visitorId = localStorage.getItem('visitor_id');
  
  if (!visitorId) {
    // Generate a random visitor ID (simple UUID-like string)
    visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15);
    localStorage.setItem('visitor_id', visitorId);
  }
  
  return visitorId;
};

// Get visitor name from localStorage
export const getVisitorName = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('visitor_name');
};

// Set visitor name in localStorage
export const setVisitorName = (name: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('visitor_name', name);
};

// Get current chatbot ID
export const getCurrentChatbotId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('current_chatbot_id');
};

// Set current chatbot ID
export const setCurrentChatbotId = (chatbotId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('current_chatbot_id', chatbotId);
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token when available
api.interceptors.request.use(async (config) => {
  try {
    // Use supabase.auth directly to get the session for consistency
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized error - could redirect to login page
      toast({
        title: "Authentication Error",
        description: "Please sign in to access this feature",
        variant: "destructive",
      });
    }
    return Promise.reject(error);
  }
);

export type ChatHistoryItem = {
  id: string;
  message: string;
  sender: string;
  response: string | null;
  visitor_id: string;
  visitor_name?: string;
  timestamp: string;
};

export const chatApi = {
  /**
   * Send a message to the AI agent and get a response
   * If chatbotId is provided, use that specific chatbot
   */
  sendMessage: async (message: string, chatbotId?: string) => {
    try {
      const visitorId = getOrCreateVisitorId();
      const visitorName = getVisitorName();
      
      // Only use the provided chatbotId, don't fall back to localStorage
      // This ensures each chat page uses the correct chatbot
      const activeChatbotId = chatbotId;
      
      console.log('Sending chat message with:');
      console.log(`- Visitor ID: ${visitorId}`);
      console.log(`- Visitor Name: ${visitorName}`);
      console.log(`- Chatbot ID: ${activeChatbotId}`);
      
      // Create the payload
      const payload = { 
        message, 
        visitor_id: visitorId,
        visitor_name: visitorName
      };
      
      // Add chatbot_id if available
      if (activeChatbotId) {
        Object.assign(payload, { chatbot_id: activeChatbotId });
      }
      
      // Get authentication token from Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      // Use fetch API directly for better error handling
      const url = `${API_URL}/chat`;
      console.log(`Sending POST to ${url}`);
      console.log('Payload:', payload);
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  
  /**
   * Send a message to a public chatbot using the user_id (no authentication required)
   */
  sendPublicMessage: async (message: string, userId: string) => {
    try {
      const visitorId = getOrCreateVisitorId();
      const visitorName = getVisitorName();
      
      console.log('Sending public chat message with:');
      console.log(`- User ID: ${userId}`);
      console.log(`- Visitor ID: ${visitorId}`);
      console.log(`- Visitor Name: ${visitorName}`);
      console.log(`- Message: ${message}`);
      
      // Create the payload
      const payload = { 
        message, 
        visitor_id: visitorId,
        visitor_name: visitorName
      };
      
      // Use fetch API directly for better error handling
      const url = `${API_URL}/chat/${userId}/public`;
      console.log(`Sending POST to ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending public message:', error);
      throw error;
    }
  },

  /**
   * Get chat history for current visitor with a specific chatbot
   */
  getChatHistory: async (chatbotId?: string) => {
    try {
      const visitorId = getOrCreateVisitorId();
      
      // Use provided chatbotId or get from storage
      const activeChatbotId = chatbotId || getCurrentChatbotId();
      
      // Build the URL with appropriate query parameters
      let url = `/chat/history?visitor_id=${visitorId}`;
      if (activeChatbotId) {
        url += `&chatbot_id=${activeChatbotId}`;
      }
      
      const response = await api.get(url);
      console.log('Chat history API response:', response.data);
      
      // Check if response has the expected format with history array
      if (response.data && Array.isArray(response.data.history)) {
        return response.data.history;
      } else if (response.data && typeof response.data === 'object') {
        console.warn('Unexpected response format for chat history, trying to handle it:', response.data);
        // Try to extract history if it exists
        if (Array.isArray(response.data.history)) {
          return response.data.history;
        } 
        // If the whole response is an array, use that
        else if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      
      // Fallback if we couldn't extract a proper array
      console.error('Failed to extract chat history from response:', response.data);
      return [];
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  },

  /**
   * Get chat history for a public chatbot using the user ID
   * This doesn't require authentication and uses a separate endpoint
   */
  getPublicChatHistory: async (userId: string) => {
    try {
      const visitorId = getOrCreateVisitorId();
      console.log(`Fetching public chat history for user ID: ${userId}, visitor ID: ${visitorId}`);
      
      // Use the public history endpoint with the user ID
      const url = `${API_URL}/chat/${userId}/public/history?visitor_id=${visitorId}`;
      
      // Use fetch API directly for better error handling for public endpoints
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Public chat history API response:', data);
      
      // Check if response has the expected format with history array
      if (data && Array.isArray(data.history)) {
        return data.history;
      } else if (data && typeof data === 'object') {
        // Try to extract history if it exists
        if (Array.isArray(data.history)) {
          return data.history;
        } 
        // If the whole response is an array, use that
        else if (Array.isArray(data)) {
          return data;
        }
      }
      
      // Fallback if we couldn't extract a proper array
      console.error('Failed to extract public chat history from response:', data);
      return [];
    } catch (error) {
      console.error('Error getting public chat history:', error);
      // Return empty array instead of throwing to avoid breaking the UI
      return [];
    }
  },

  /**
   * Get all chat history for an admin/owner (all visitors for their chatbots)
   */
  getAllChatHistory: async (limit: number = 100, chatbotId?: string) => {
    try {
      // Build URL with appropriate params
      let url = `/chat/history?limit=${limit}`;
      if (chatbotId) {
        url += `&chatbot_id=${chatbotId}`;
      }
      
      const response = await api.get(url);
      console.log('All chat history API response:', response.data);
      
      // Check if response has the expected format with history array and count
      if (response.data && Array.isArray(response.data.history)) {
        // If we have a count, log it
        if (typeof response.data.count === 'number') {
          console.log(`Retrieved ${response.data.count} chat history messages`);
        }
        return response.data.history;
      } else if (response.data && typeof response.data === 'object') {
        console.warn('Unexpected response format for all chat history, trying to handle it:', response.data);
        // Try to extract history if it exists
        if (Array.isArray(response.data.history)) {
          return response.data.history;
        }
        // If the whole response is an array, use that
        else if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      
      // Fallback if we couldn't extract a proper array
      console.error('Failed to extract all chat history from response:', response.data);
      return [];
    } catch (error) {
      console.error('Error getting all chat history:', error);
      throw error;
    }
  },
};

export const profileApi = {
  /**
   * Get profile data
   * If userId is provided, get that specific user's profile
   */
  getProfileData: async (userId?: string) => {
    try {
      const endpoint = userId ? `/profile?user_id=${userId}` : '/profile';
      const response = await api.get(endpoint);
      return response.data as ProfileData;
    } catch (error) {
      console.error('Error getting profile data:', error);
      throw error;
    }
  },

  /**
   * Update profile data
   * If the profile data contains a user_id, it will be used to update that specific user's profile
   */
  updateProfileData: async (data: ProfileData) => {
    try {
      console.log('Updating profile data with:', data);
      // Make sure the user_id is included in the request body
      const response = await api.put('/profile', data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile data:', error);
      throw error;
    }
  },
};

export const chatbotApi = {
  /**
   * Get all chatbots for the authenticated user
   */
  getChatbots: async () => {
    try {
      const response = await api.get('/chatbots');
      return response.data as Chatbot[];
    } catch (error) {
      console.error('Error getting chatbots:', error);
      return [];
    }
  },
  
  /**
   * Get a chatbot by user ID (public access)
   */
  getChatbotByUserId: async (userId: string) => {
    try {
      // Use a public endpoint that doesn't require authentication
      const response = await fetch(`${API_URL}/chat/${userId}/public`);
      if (!response.ok) {
        throw new Error(`Failed to fetch chatbot: ${response.statusText}`);
      }
      const data = await response.json();
      return data as Chatbot;
    } catch (error) {
      console.error('Error getting chatbot by user ID:', error);
      throw error;
    }
  },
  
  /**
   * Create a new chatbot
   */
  createChatbot: async (data: Partial<Chatbot>) => {
    try {
      const response = await api.post('/chatbots', data);
      return response.data as Chatbot;
    } catch (error) {
      console.error('Error creating chatbot:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing chatbot
   */
  updateChatbot: async (id: string, data: Partial<Chatbot>) => {
    try {
      const response = await api.put(`/chatbots/${id}`, data);
      return response.data as Chatbot;
    } catch (error) {
      console.error('Error updating chatbot:', error);
      throw error;
    }
  },
  
  /**
   * Delete a chatbot
   */
  deleteChatbot: async (id: string) => {
    try {
      const response = await api.delete(`/chatbots/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting chatbot:', error);
      throw error;
    }
  },
  
  /**
   * Get a chatbot by its public URL slug
   */
  getChatbotBySlug: async (slug: string) => {
    try {
      const response = await api.get(`/chatbots/public/${slug}`);
      return response.data as Chatbot;
    } catch (error) {
      console.error('Error getting chatbot by slug:', error);
      throw error;
    }
  }
};

export const adminApi = {
  /**
   * Admin login
   */
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/admin/login', { username, password });
      return response.data;
    } catch (error) {
      console.error('Error during admin login:', error);
      throw error;
    }
  },

  /**
   * Check if user is authenticated as admin
   */
  checkAuth: async () => {
    try {
      const response = await api.get('/admin/auth-check');
      return response.data;
    } catch (error) {
      console.error('Error checking admin auth:', error);
      return { authenticated: false };
    }
  },

  /**
   * Create a new admin user
   */
  createAdmin: async (email: string, password: string, signupCode: string) => {
    try {
      const response = await api.post('/admin/create', { 
        email, 
        password, 
        signup_code: signupCode 
      });
      return response.data;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }
};

/**
 * Fetch profile data from the API
 */
export async function fetchProfileData(userId?: string): Promise<ProfileData> {
  try {
    return await profileApi.getProfileData(userId);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    // Return a default profile if the API call fails
    return {
      bio: "No bio available yet.",
      skills: "No skills listed yet.",
      experience: "No experience listed yet.",
      interests: "No interests listed yet.",
      project_list: []
    };
  }
}

/**
 * Update profile data via the API
 */
export async function updateProfileData(profileData: ProfileData): Promise<{ profile: ProfileData }> {
  try {
    const result = await profileApi.updateProfileData(profileData);
    return { profile: result.profile || profileData };
  } catch (error) {
    console.error('Error updating profile data:', error);
    throw error;
  }
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendMessage(
  messages: Array<{ role: string; content: string }>,
  chatbotId?: string
): Promise<{ response: string }> {
  try {
    // For backward compatibility with existing chat UI,
    // we extract the latest user message from the messages array
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (!lastUserMessage) {
      throw new Error('No user message found in the messages array');
    }
    
    // Use the chat API with the last user message
    const result = await chatApi.sendMessage(lastUserMessage.content, chatbotId);
    return { response: result.response };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Project-related API methods
export const projectApi = {
  // Create a new project
  createProject: async (project: Project): Promise<ProfileData> => {
    try {
      const response = await api.post('/profile/projects', project);
      return response.data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },
  
  // Update an existing project
  updateProject: async (projectId: string, project: Project): Promise<ProfileData> => {
    try {
      const response = await api.put(`/profile/projects/${projectId}`, project);
      return response.data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },
  
  // Delete a project
  deleteProject: async (projectId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.delete(`/profile/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
};

// Export the API instance
export default api;

// Common API functions
export const getProfile = async () => {
  try {
    const response = await api.get('/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

export const updateProfile = async (profileData: any) => {
  try {
    const response = await api.put('/profile', profileData);
    return response.data;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const sendChatMessage = async (message: string, visitorId?: string, visitorName?: string) => {
  try {
    const response = await api.post('/chat', {
      message,
      visitor_id: visitorId,
      visitor_name: visitorName
    });
    return response.data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

// Auth-specific API functions
export const getCurrentUser = async () => {
  try {
    // Use the real endpoint now that we have a JWT workaround
    const useDebugEndpoint = false;
    
    const endpoint = useDebugEndpoint ? '/auth/me/debug' : '/auth/me';
    const response = await api.get(endpoint);
    
    console.log("Backend auth response:", response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}; 