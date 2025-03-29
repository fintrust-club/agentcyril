// Types for the API responses and data models

export interface Project {
  id?: string;
  title: string;
  description: string;
  technologies: string;
  image_url?: string;
  project_url?: string;
  is_featured: boolean;
  database_config?: Record<string, any>;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileData {
  id?: string;
  user_id?: string;
  bio: string;
  skills: string;
  experience: string;
  projects?: string; // Text field for projects (used in older/current schema)
  project_list?: Project[]; // Array of Project objects (used in newer schema)
  interests: string;
  name?: string;
  location?: string;
  calendly_link?: string; // Calendly meeting scheduling link
  meeting_rules?: string; // Rules/criteria for allowing meeting requests
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

export interface Chatbot {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  is_public?: boolean;
  configuration?: Record<string, any>;
  public_url_slug?: string;
  created_at?: string;
  updated_at?: string;
} 