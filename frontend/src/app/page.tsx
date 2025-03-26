'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/utils/api';
import api from '@/utils/api';
import { supabase } from '@/utils/supabase';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [backendUser, setBackendUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [jwtDebug, setJwtDebug] = useState<any>(null);

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Once authenticated, redirect to admin page (updated for multi-user flow)
    if (!loading && user) {
      router.push('/admin');
      return;
    }

    // Fetch backend user for validation if needed
    if (user && !backendUser) {
      fetchBackendUser();
    }
  }, [user, loading, router, backendUser]);

  const fetchBackendUser = async () => {
    try {
      // Debug: Get and log JWT information
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      
      if (token) {
        // Log token details
        console.log("JWT Token:", {
          firstTenChars: token.substring(0, 10),
          length: token.length
        });
        
        // Split the token and extract header and payload
        const [headerB64, payloadB64] = token.split('.');
        if (headerB64 && payloadB64) {
          try {
            const header = JSON.parse(atob(headerB64));
            const payload = JSON.parse(atob(payloadB64));
            
            // Save JWT debug info
            setJwtDebug({
              header,
              payload,
              algorithm: header.alg,
              issuer: payload.iss,
              audience: payload.aud,
              subject: payload.sub
            });
            
            console.log("JWT Header:", header);
            console.log("JWT Payload:", payload);
          } catch (e) {
            console.error("Error parsing JWT:", e);
          }
        }
      }
      
      // Get the authenticated user from the backend
      const userData = await getCurrentUser();
      console.log("Backend user response:", userData);
      setBackendUser(userData);
      
      // Once we have the user, fetch their profile data
      if (userData && userData.id) {
        try {
          const response = await api.get('/profile');
          console.log("User profile data:", response.data);
          setProfileData(response.data);
        } catch (profileError) {
          console.error("Error fetching profile data:", profileError);
        }
      }
    } catch (error) {
      console.error('Error fetching user from backend:', error);
      toast({
        title: 'Authentication Error',
        description: 'Failed to authenticate with backend server',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Show loading state
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  // If authenticated, show the dashboard
  if (user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="w-full shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Dashboard</CardTitle>
            <CardDescription>
              Welcome to your personal dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <h3 className="text-lg font-medium mb-2">Your Account Information</h3>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>User ID:</strong> {user?.id}</p>
              <p><strong>Auth Status:</strong> {backendUser ? 'Authenticated with Backend' : 'Not Authenticated with Backend'}</p>
            </div>
            
            {backendUser && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2">Backend Authentication</h3>
                <p>Successfully authenticated with the backend server!</p>
                <p><strong>Backend User ID:</strong> {backendUser.id}</p>
              </div>
            )}

            {jwtDebug && !backendUser && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2">JWT Debug Information</h3>
                <p><strong>Algorithm:</strong> {jwtDebug.algorithm}</p>
                <p><strong>Issuer:</strong> {jwtDebug.issuer}</p>
                <p><strong>Audience:</strong> {jwtDebug.audience}</p>
                <p><strong>Subject:</strong> {jwtDebug.subject}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Note: This information can help debug JWT validation issues.
                </p>
              </div>
            )}

            {profileData && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <h3 className="text-lg font-medium mb-2">Your Profile</h3>
                {profileData.bio && <p><strong>Bio:</strong> {profileData.bio}</p>}
                {profileData.skills && <p><strong>Skills:</strong> {profileData.skills}</p>}
                {profileData.interests && <p><strong>Interests:</strong> {profileData.interests}</p>}
                
                {profileData.project_list && profileData.project_list.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium">Projects</h4>
                    <ul className="list-disc pl-5 mt-2">
                      {profileData.project_list.map((project: any) => (
                        <li key={project.id}>{project.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              onClick={handleSignOut}
              variant="outline"
            >
              Sign Out
            </Button>
            
            <Button 
              onClick={fetchBackendUser}
              variant="secondary"
            >
              Refresh Data
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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