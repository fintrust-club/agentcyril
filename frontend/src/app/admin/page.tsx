'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { profileApi } from '@/utils/api';
import { AdminChatHistory } from '@/components/admin/chat-history';
import { useAuth } from '@/hooks/useAuth';
import type { ProfileData } from '@/utils/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { redirect } from 'next/navigation';

export default function AdminPage() {
  const [formData, setFormData] = useState<ProfileData>({
    bio: "",
    skills: "",
    experience: "",
    projects: "",
    interests: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Use the standardized useAuth hook
  const { user, loading, signOut } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      redirect('/');
    }
  }, [user, loading]);

  // Fetch profile data when user is available
  useEffect(() => {
    if (user) {
      fetchProfileData(user.id);
    }
  }, [user]);
  
  const fetchProfileData = async (userId: string) => {
    try {
      setIsLoading(true);
      console.log(`Fetching profile data for user: ${userId}`);
      
      const data = await profileApi.getProfileData(userId);
      console.log('Received profile data:', data);
      
      // Ensure data complies with our ProfileData interface
      setFormData({
        bio: data.bio || "No bio available",
        skills: data.skills || "No skills listed",
        experience: data.experience || "No experience listed",
        interests: data.interests || "No interests listed",
        name: data.name || "",
        location: data.location || "",
        user_id: data.user_id || userId, // Preserve user_id
        // Don't include projects field here as it might not exist in newer schemas
      });
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
      setError('Failed to load profile data. Using default values.');
      
      // Set default values in case of error
      setFormData({
        bio: "Enter your bio here",
        skills: "Enter your skills here",
        experience: "Enter your experience here",
        interests: "Enter your interests here",
        user_id: userId, // Always include user_id even with default values
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);
    
    try {
      if (!user) {
        throw new Error('You must be logged in to update your profile');
      }
      
      // Create a cleaned version of the form data without projects field
      // to avoid Supabase column issues
      const cleanedData = {
        bio: formData.bio,
        skills: formData.skills,
        experience: formData.experience,
        interests: formData.interests,
        name: formData.name,
        location: formData.location,
        user_id: user.id,
      };
      
      console.log('Submitting profile data with user_id:', user.id);
      
      // Call API to update data with the cleaned data object
      const result = await profileApi.updateProfileData(cleanedData);
      
      console.log('Profile update result:', result);
      
      setSaveSuccess(true);
      
      // Display success message and automatically clear it after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
      // Refresh data from server to ensure we see the latest
      await fetchProfileData(user.id);
    } catch (err: any) {
      console.error('Error saving data:', err);
      setError(err?.message || 'Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (user) {
      await fetchProfileData(user.id);
    }
  };

  // Show loading state while authenticating
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-lg font-medium">Loading...</p>
            <p className="text-sm text-muted-foreground">Please wait while we authenticate you</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show a message if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Authentication Required</CardTitle>
            <CardDescription>
              You need to be signed in to access the admin panel
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">Personal Dashboard</h1>
            {user && (
              <p className="text-sm text-muted-foreground hidden md:block">
                Logged in as: <span className="font-medium">{user.email}</span>
              </p>
            )}
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link href={user ? `/chat/${user.id}` : '/'}>Back to Chatbot</Link>
            </Button>
            <Button variant="destructive" onClick={signOut}>
              Logout
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <Tabs 
          defaultValue="profile" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full max-w-5xl mx-auto"
        >
          <div className="flex justify-center mb-8">
            <TabsList>
              <TabsTrigger value="profile">
                Profile Information
              </TabsTrigger>
              <TabsTrigger value="chat">
                Chat History
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="profile">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Update Portfolio Content</CardTitle>
                <CardDescription>
                  Manage the information used in your AI assistant responses.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                {saveSuccess && (
                  <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400">
                    <p className="font-medium">Success!</p>
                    <p className="text-sm">Content updated successfully and saved to database.</p>
                  </div>
                )}
                
                {error && (
                  <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400">
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={handleRefresh}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p>Loading profile data...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleChange}
                          placeholder="Your name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location || ''}
                          onChange={handleChange}
                          placeholder="Your location"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Bio <Badge variant="outline" className="ml-2">Personal</Badge>
                      </label>
                      <Textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={3}
                        className="resize-none"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Skills <Badge variant="outline" className="ml-2">Technical</Badge>
                      </label>
                      <Textarea
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        rows={3}
                        className="resize-none"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Experience <Badge variant="outline" className="ml-2">Professional</Badge>
                      </label>
                      <Textarea
                        name="experience"
                        value={formData.experience}
                        onChange={handleChange}
                        rows={3}
                        className="resize-none"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Interests & Hobbies <Badge variant="outline" className="ml-2">Personal</Badge>
                      </label>
                      <Textarea
                        name="interests"
                        value={formData.interests}
                        onChange={handleChange}
                        rows={2}
                        className="resize-none"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="px-6"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Public Chatbot Link Section */}
                {user && (
                  <div className="border-t mt-8 pt-6">
                    <h3 className="text-lg font-medium mb-4">Your Public Chatbot Link</h3>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Share this link with anyone who wants to chat with your AI assistant.
                        They'll be asked for their name and then can chat with an AI trained on your profile data.
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        <Input 
                          readOnly
                          value={`${window.location.origin}/chat/${user.id}`}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/chat/${user.id}`);
                            alert('Link copied to clipboard!');
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        All chats will appear in your Chat History tab. Update your profile info to change what the AI knows about you.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="chat">
            <AdminChatHistory />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="bg-muted py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Agent Ciril - Interactive AI Portfolio &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 