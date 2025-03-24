import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Sign up with email and password
   */
  signUpWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current user session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Check if the current user is logged in
   * This now simply checks if there's an authenticated user, not requiring a specific admin role
   */
  isAdmin: async () => {
    try {
      const user = await supabaseAuth.getUser();
      // Any authenticated user is considered an admin
      return !!user;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  },

  /**
   * Create a new admin user account
   */
  createAdmin: async (email: string, password: string, signupCode: string) => {
    try {
      // First, contact the backend API to create the admin user
      // This is needed because the frontend doesn't have permission to use the admin API directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          signup_code: signupCode,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create admin user');
      }
      
      // If admin creation was successful, sign in with the new credentials
      return await supabaseAuth.signInWithEmail(email, password);
    } catch (error) {
      console.error('Error creating admin account:', error);
      throw error;
    }
  }
};

export default supabase; 