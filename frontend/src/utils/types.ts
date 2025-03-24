// Types for the API responses and data models

export interface Project {
  id?: string;
  title: string;
  description: string;
  category: string;
  details: string;
  content?: string; // Rich markdown content
  created_at?: string;
  updated_at?: string;
}

export interface ProfileData {
  id?: string;
  bio: string;
  skills: string;
  experience: string;
  projects?: string; // Keeping for backward compatibility
  project_list?: Project[];
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