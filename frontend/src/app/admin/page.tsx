'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { profileApi, type ProfileData, adminApi } from '@/utils/api';
import { AdminChatHistory } from '@/components/admin/chat-history';
import AdminLogin from './login';

export default function AdminPage() {
  const [formData, setFormData] = useState<ProfileData>({
    bio: "Loading...",
    skills: "Loading...",
    experience: "Loading...",
    projects: "Loading...",
    interests: "Loading..."
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Check authentication on mount
  useEffect(() => {
    const isLoggedIn = adminApi.isLoggedIn();
    setIsAuthenticated(isLoggedIn);
    
    if (isLoggedIn) {
      fetchProfileData();
    } else {
      setIsLoading(false);
    }
  }, []);
  
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    fetchProfileData();
  };
  
  const handleLogout = () => {
    adminApi.logout();
    setIsAuthenticated(false);
  };

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const data = await profileApi.getProfileData();
      setFormData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
      setError('Failed to load profile data. Using default values.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
      // Call actual API to update data
      await profileApi.updateProfileData(formData);
      setSaveSuccess(true);
      
      // Refresh data from server to ensure we see the latest
      await fetchProfileData();
    } catch (err) {
      console.error('Error saving data:', err);
      setError('Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    await fetchProfileData();
  };

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Agent Ciril Admin</h1>
          <nav className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link href="/">Back to Chat</Link>
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
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
                  <div className="mb-6 p-4 rounded-md bg-green-50 border border-green-200 text-green-700">
                    <p className="font-medium">Success!</p>
                    <p className="text-sm">Content updated successfully and saved to database.</p>
                  </div>
                )}
                
                {error && (
                  <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="py-8 text-center">Loading profile data...</div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
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
                        Projects <Badge variant="outline" className="ml-2">Portfolio</Badge>
                      </label>
                      <Textarea
                        name="projects"
                        value={formData.projects}
                        onChange={handleChange}
                        rows={4}
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