'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchProfileData, updateProfileData } from '@/utils/api';
import { ProfileData } from '@/utils/types';
import { AdminChatHistory } from '@/components/admin/chat-history';
import { supabaseAuth } from '@/utils/supabase';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
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
  const [user, setUser] = useState<{ id: string, email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session
        const session = await supabaseAuth.getSession();
        
        if (session) {
          // Any user with a session is authenticated
          const currentUser = await supabaseAuth.getUser();
          
          if (currentUser) {
            setIsAuthenticated(true);
            setUser({ id: currentUser.id, email: currentUser.email || '' });
            fetchProfileData(currentUser.id);
          } else {
            // No user found, redirect to login
            router.push('/login');
          }
        } else {
          // No session, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsLoading(false);
        // On error, redirect to login
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);
  
  const handleLogout = async () => {
    try {
      await supabaseAuth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchProfileData = async (userId?: string) => {
    try {
      setIsLoading(true);
      const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profile`).then(r => r.json());
      setFormData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
      setError('Failed to load profile data. Using default values.');
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
      // Use direct fetch to update profile
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
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

  const copyToClipboard = () => {
    if (!user) return;
    
    const url = `${window.location.origin}/chat/${user.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <h1 className="text-xl font-medium">Loading...</h1>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">AIChat Dashboard</h1>
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
            {user && (
              <Button variant="outline" asChild>
                <Link href={`/chat/${user.id}`}>View My Chatbot</Link>
              </Button>
            )}
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
              <TabsTrigger value="share">
                Share Your Chatbot
              </TabsTrigger>
              <TabsTrigger value="chat">
                Chat History
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="profile">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Update Your AI Chatbot Data</CardTitle>
                <CardDescription>
                  Manage the information your AI chatbot will use when responding to visitors
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Name <Badge variant="outline" className="ml-2">Personal</Badge>
                        </label>
                        <Input
                          name="name"
                          value={formData.name || ""}
                          onChange={handleChange}
                          placeholder="Your name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Location <Badge variant="outline" className="ml-2">Personal</Badge>
                        </label>
                        <Input
                          name="location"
                          value={formData.location || ""}
                          onChange={handleChange}
                          placeholder="Your location (e.g., City, Country)"
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
          
          <TabsContent value="share">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Share Your AI Chatbot</CardTitle>
                <CardDescription>
                  Get a personalized link to share your AI chatbot with others
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Your Chatbot Link</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Share this link with anyone to let them chat with your AI assistant
                    </p>
                    
                    <div className="flex items-center mt-2">
                      <Input 
                        value={user ? `${window.location.origin}/chat/${user.id}` : 'Loading...'}
                        readOnly
                        className="flex-1"
                      />
                      <TooltipProvider>
                        <Tooltip open={copied}>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="ml-2" 
                              onClick={copyToClipboard}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copied!</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-2">Preview Your Chatbot</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      See how your chatbot looks to others
                    </p>
                    
                    <Button asChild>
                      <Link href={user ? `/chat/${user.id}` : '#'}>
                        Open Chatbot Preview
                      </Link>
                    </Button>
                  </div>
                </div>
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
          AIChat - Your Personal AI Chatbot &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 