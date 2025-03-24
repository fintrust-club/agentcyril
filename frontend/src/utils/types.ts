// Types for the API responses and data models

export interface ProfileData {
  id?: string;
  bio: string;
  skills: string;
  experience: string;
  projects: string;
  interests: string;
  name?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  response: string;
} 