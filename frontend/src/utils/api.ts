import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export type ProfileData = {
  bio: string;
  skills: string;
  experience: string;
  projects: string;
  interests: string;
};

export const chatApi = {
  /**
   * Send a message to the AI agent and get a response
   */
  sendMessage: async (message: string) => {
    try {
      const response = await api.post('/chat', { message });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Get chat history
   */
  getChatHistory: async () => {
    try {
      const response = await api.get('/chat/history');
      return response.data;
    } catch (error) {
      console.error('Error getting chat history:', error);
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

export default {
  chat: chatApi,
  profile: profileApi,
}; 