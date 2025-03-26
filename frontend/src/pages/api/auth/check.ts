import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Simple API endpoint to check the Supabase connection status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Supabase configuration missing',
      });
    }
    
    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check Supabase connection by making a simple query
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Supabase connection error',
        details: error.message,
      });
    }
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Supabase connection working',
      data,
    });
  } catch (error: any) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'Server error checking Supabase connection',
      details: error.message,
    });
  }
} 