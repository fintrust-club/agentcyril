import axios from 'axios';
import { supabase } from './supabase';
import type { ProfileData } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Get or create a visitor ID
export const getOrCreateVisitorId = (): string => {
  if (typeof window === 'undefined') return 'server-side';
  
  let visitorId = localStorage.getItem('visitor_id');
  if (!visitorId) {
    visitorId = `visitor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('visitor_id', visitorId);
  }
  return visitorId;
};

// Get visitor name
export const getVisitorName = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('visitor_name');
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

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    // Get the latest Supabase session
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    
    // If we have a session, add the access token to the Authorization header
    if (session && config.headers) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }
  return config;
});

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
   * If userId is provided, get responses based on that user's profile
   */
  sendMessage: async (message: string, userId?: string) => {
    try {
      const visitorId = getOrCreateVisitorId();
      const visitorName = getVisitorName();
      
      // Add the userId to the request if provided
      const payload = { 
        message, 
        visitor_id: visitorId,
        visitor_name: visitorName
      };
      
      // If userId is provided, add it to the request
      if (userId) {
        Object.assign(payload, { target_user_id: userId });
      }
      
      const response = await api.post('/chat/chat', payload);
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
   * Get all chat history (admin only)
   */
  getAllChatHistory: async (limit: number = 100) => {
    try {
      const response = await api.get(`/chat/history?limit=${limit}`);
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

// Function to fetch profile data
export async function fetchProfileData(): Promise<ProfileData> {
  const response = await fetch(`${API_URL}/profile`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.status}`);
  }
  
  return response.json();
}

// Function to update profile data
export async function updateProfileData(profileData: ProfileData): Promise<{ profile: ProfileData }> {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.status}`);
  }
  
  return response.json();
}

// Function to send a message to the chatbot
export async function sendMessage(
  messages: Array<{ role: string; content: string }>,
  userId?: string
): Promise<{ response: string }> {
  const visitorId = getOrCreateVisitorId();
  const visitorName = getVisitorName();
  
  // Get the latest user message
  let lastMessage = "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastMessage = messages[i].content;
      break;
    }
  }
  
  console.log("Sending message to chatbot API:");
  console.log(`- Visitor ID: ${visitorId}`);
  console.log(`- Visitor Name: ${visitorName || 'Not set'}`);
  console.log(`- User ID: ${userId || 'Not set'}`);
  console.log(`- Message: ${lastMessage}`);
  
  // Use the correct endpoint and format
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      messages,
      user_id: userId,
      visitor_id: visitorId,
      visitor_name: visitorName
    }),
  });
  
  if (!response.ok) {
    console.error(`Error response from API: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to send message: ${response.status}`);
  }
  
  const responseData = await response.json();
  console.log("Received response from API:", responseData);
  
  return responseData;
} 