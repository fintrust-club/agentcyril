import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Get or create a visitor ID for the user
const getOrCreateVisitorId = (): string => {
  if (typeof window === 'undefined') return 'server-side';
  
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    // Generate a simple UUID-like ID
    visitorId = 'v-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

// Get visitor name if set
const getVisitorName = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('visitor_name') || undefined;
};

// Set visitor name
export const setVisitorName = (name: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('visitor_name', name);
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add admin auth token to requests if available
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    }
  }
  return config;
});

export type ProfileData = {
  bio: string;
  skills: string;
  experience: string;
  projects: string;
  interests: string;
};

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
   */
  sendMessage: async (message: string) => {
    try {
      const visitorId = getOrCreateVisitorId();
      const visitorName = getVisitorName();
      
      const response = await api.post('/chat', { 
        message, 
        visitor_id: visitorId,
        visitor_name: visitorName
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Get chat history for current visitor
   */
  getChatHistory: async () => {
    try {
      const visitorId = getOrCreateVisitorId();
      const response = await api.get(`/chat/history?visitor_id=${visitorId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  },

  /**
   * Get all chat history (admin only)
   */
  getAllChatHistory: async (limit: number = 100) => {
    try {
      const response = await api.get(`/chat/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting all chat history:', error);
      throw error;
    }
  },
};

export const profileApi = {
  /**
   * Get profile data
   */
  getProfileData: async () => {
    try {
      const response = await api.get('/profile');
      return response.data as ProfileData;
    } catch (error) {
      console.error('Error getting profile data:', error);
      throw error;
    }
  },

  /**
   * Update profile data
   */
  updateProfileData: async (data: ProfileData) => {
    try {
      const response = await api.put('/profile', data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile data:', error);
      throw error;
    }
  },
};

export const adminApi = {
  /**
   * Admin login
   */
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/admin/login', { username, password });
      
      if (response.data.success && response.data.token) {
        // Store the token in localStorage
        localStorage.setItem('admin_token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error during admin login:', error);
      throw error;
    }
  },
  
  /**
   * Check if admin is logged in
   */
  isLoggedIn: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('admin_token');
  },
  
  /**
   * Admin logout
   */
  logout: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('admin_token');
  }
};

export default {
  chat: chatApi,
  profile: profileApi,
  admin: adminApi,
}; 