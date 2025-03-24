'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuth } from '@/utils/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await supabaseAuth.getSession();
        if (session) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard');
        } else {
          // User is not logged in, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // On error, default to login
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-center">
        <h1 className="text-xl font-medium">Loading...</h1>
        <p className="text-muted-foreground">Redirecting to the appropriate page</p>
      </div>
    </div>
  );
} 