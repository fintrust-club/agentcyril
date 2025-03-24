'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchProfileData, updateProfileData, projectApi } from '@/utils/api';
import { ProfileData, Project } from '@/utils/types';
import { AdminChatHistory } from '@/components/admin/chat-history';
import { supabaseAuth } from '@/utils/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Plus, Edit, Trash2, X } from "lucide-react";
import { ProjectDetailView } from '@/components/project-detail-view';

const AutoResizingTextarea = ({ value, onChange, name, placeholder, rows = 4, className = "", required = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);
  
  return (
    <Textarea
      ref={textareaRef}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`resize-none text-base py-3 min-h-${rows * 24}px ${className}`}
      required={required}
      onInput={(e) => {
        const textarea = e.currentTarget;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }}
    />
  );
};

const ProjectDialog = ({ 
  isOpen, 
  onClose, 
  project, 
  onSave,
  isNew = false
}: { 
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (project: Project) => void;
  isNew?: boolean;
}) => {
  const [formData, setFormData] = useState<Project>(project);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Create New Project' : 'Edit Project'}</DialogTitle>
            <DialogDescription>
              Add details about your project that will be vectorized and used by your AI.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="title" className="text-right font-medium">
                Title
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right font-medium">
                Category
              </label>
              <Select 
                value={formData.category} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right font-medium">
                Description
              </label>
              <div className="col-span-3">
                <AutoResizingTextarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the project"
                  rows={2}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <label htmlFor="details" className="text-right font-medium pt-2">
                Details
              </label>
              <div className="col-span-3">
                <AutoResizingTextarea
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  placeholder="Detailed information about the project, technologies used, your role, challenges, etc."
                  rows={6}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileData>({
    bio: "Loading...",
    skills: "Loading...",
    experience: "Loading...",
    projects: "Loading...",
    interests: "Loading...",
    project_list: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [user, setUser] = useState<{ id: string, email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Project dialog state
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project>({
    title: '',
    description: '',
    category: 'tech',
    details: ''
  });
  const [isNewProject, setIsNewProject] = useState(true);

  // Add these new state variables inside the component
  const [isProjectDetailOpen, setIsProjectDetailOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);

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
      
      // Ensure project_list is an array
      if (!data.project_list) {
        data.project_list = [];
      }
      
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
  
  // Project-related handlers
  const openNewProjectDialog = () => {
    setCurrentProject({
      title: '',
      description: '',
      category: 'tech',
      details: ''
    });
    setIsNewProject(true);
    setIsProjectDialogOpen(true);
  };
  
  const openEditProjectDialog = (project: Project) => {
    setCurrentProject(project);
    setIsNewProject(false);
    setIsProjectDialogOpen(true);
  };
  
  const handleSaveProject = async (project: Project) => {
    setIsSaving(true);
    try {
      let updatedProfile: ProfileData;
      
      if (isNewProject) {
        // Create new project
        updatedProfile = await projectApi.createProject(project);
      } else {
        // Update existing project
        if (!project.id) {
          throw new Error("Project ID is missing for update");
        }
        updatedProfile = await projectApi.updateProject(project.id, project);
      }
      
      // Update form data with the new/updated project list
      setFormData(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteProject = async (projectId: string) => {
    if (!projectId) return;
    
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }
    
    setIsSaving(true);
    try {
      await projectApi.deleteProject(projectId);
      
      // Refresh the profile data to get the updated project list
      await fetchProfileData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new function to handle project card click
  const openProjectDetail = (project: Project) => {
    setViewingProject(project);
    setIsProjectDetailOpen(true);
  };
  
  // Add a function to save content from detailed view
  const handleSaveProjectContent = async (updatedProject: Project) => {
    if (!updatedProject.id) return;
    
    setIsSaving(true);
    try {
      const updatedProfile = await projectApi.updateProject(updatedProject.id, updatedProject);
      
      // Update form data with the updated project
      setFormData(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Update the viewing project with the latest changes
      setViewingProject(updatedProject);
    } catch (err) {
      console.error('Error saving project content:', err);
      setError('Failed to save project content. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <ThemeToggle />
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
              <TabsTrigger value="projects">
                Projects
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
            <div className="space-y-6">
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-1">Update Your AI Chatbot Data</h2>
                <p className="text-muted-foreground">
                  Manage the information your AI chatbot will use when responding to visitors
                </p>
              </div>
              
              {saveSuccess && (
                <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-700">
                  <p className="font-medium">Success!</p>
                  <p className="text-sm">Content updated successfully and saved to database.</p>
                </div>
              )}
              
              {error && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              {isLoading ? (
                <div className="py-8 text-center">Loading profile data...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Grid Layout with 30/60 split */}
                  <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                    {/* Profile Information Container - 30% */}
                    <div className="lg:col-span-3 space-y-2">
                      <h3 className="text-lg font-medium mb-4">Clone data</h3>
                      <div className="border rounded-xl p-4 shadow-sm bg-card">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Name <Badge variant="outline" className="ml-2">Personal</Badge>
                            </label>
                            <Input
                              name="name"
                              value={formData.name || ""}
                              onChange={handleChange}
                              placeholder="Your name"
                              className="h-12 text-base"
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
                              className="h-12 text-base"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Bio <Badge variant="outline" className="ml-2">Personal</Badge>
                            </label>
                            <AutoResizingTextarea
                              name="bio"
                              value={formData.bio}
                              onChange={handleChange}
                              placeholder="Tell us about yourself"
                              rows={3}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Email <Badge variant="outline" className="ml-2">Contact</Badge>
                            </label>
                            <Input
                              value={user?.email || ""}
                              readOnly
                              disabled
                              className="h-12 text-base bg-muted/50"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              This is your login email (cannot be changed)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detailed Information Container - 60% */}
                    <div className="lg:col-span-7 space-y-2">
                      <h3 className="text-lg font-medium mb-4">Detailed Information</h3>
                      <div className="border rounded-xl p-4 shadow-sm bg-card">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Skills <Badge variant="outline" className="ml-2">Technical</Badge>
                            </label>
                            <AutoResizingTextarea
                              name="skills"
                              value={formData.skills}
                              onChange={handleChange}
                              placeholder="List your technical skills"
                              rows={4}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Experience <Badge variant="outline" className="ml-2">Professional</Badge>
                            </label>
                            <AutoResizingTextarea
                              name="experience"
                              value={formData.experience}
                              onChange={handleChange}
                              placeholder="Describe your professional experience"
                              rows={4}
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Interests & Hobbies <Badge variant="outline" className="ml-2">Personal</Badge>
                            </label>
                            <AutoResizingTextarea
                              name="interests"
                              value={formData.interests}
                              onChange={handleChange}
                              placeholder="What are you interested in?"
                              rows={3}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 h-12 text-base"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="projects">
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Projects</h2>
                  <p className="text-muted-foreground">
                    Manage the projects that will be vectorized and used by your AI chatbot
                  </p>
                </div>
                <Button onClick={openNewProjectDialog} className="flex items-center gap-2">
                  <Plus size={16} /> Add Project
                </Button>
              </div>
              
              {saveSuccess && (
                <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-700">
                  <p className="font-medium">Success!</p>
                  <p className="text-sm">Project updated successfully and saved to database.</p>
                </div>
              )}
              
              {error && (
                <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              {isLoading ? (
                <div className="py-8 text-center">Loading projects...</div>
              ) : (
                <div className="space-y-4 border rounded-xl p-4 shadow-sm bg-card">
                  {(!formData.project_list || formData.project_list.length === 0) ? (
                    <div className="text-center py-12 border border-dashed rounded-lg">
                      <p className="text-muted-foreground mb-4">No projects added yet</p>
                      <Button onClick={openNewProjectDialog} variant="outline" className="flex items-center gap-2 mx-auto">
                        <Plus size={16} /> Add Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.project_list.map((project) => (
                        <Card 
                          key={project.id} 
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => openProjectDetail(project)}
                        >
                          <CardHeader className="pb-2 relative">
                            <div className="absolute right-4 top-4 flex space-x-2">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8" 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card click event
                                  openEditProjectDialog(project);
                                }}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive" 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent card click event
                                  handleDeleteProject(project.id!);
                                }}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={
                                project.category === 'tech' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                project.category === 'design' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                'bg-gray-50 text-gray-600 border-gray-200'
                              }
                            >
                              {project.category === 'tech' ? 'Technology' : 
                              project.category === 'design' ? 'Design' : 'Other'}
                            </Badge>
                            <CardTitle className="mt-2 text-xl">{project.title}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {project.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pb-4">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {project.details}
                            </p>
                            {project.content && (
                              <div className="mt-2 pt-2 border-t flex items-center">
                                <span className="text-xs text-muted-foreground mr-1">Content:</span>
                                <Badge variant="outline" className="text-xs">
                                  {`${(project.content.length / 1000).toFixed(1)}k characters`}
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="share">
            <div className="space-y-6">
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-1">Share Your AI Chatbot</h2>
                <p className="text-muted-foreground">
                  Get a unique link to your AI-powered chatbot that you can share with others
                </p>
              </div>
              
              {user && (
                <div className="space-y-6 border rounded-xl p-4 shadow-sm bg-card">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Your Chatbot URL</h3>
                    <div className="flex">
                      <div className="flex-1 p-3 bg-muted rounded-l-md truncate">
                        {window.location.origin}/chat/{user.id}
                      </div>
                      <TooltipProvider>
                        <Tooltip open={copied}>
                          <TooltipTrigger asChild>
                            <Button 
                              className="rounded-l-none" 
                              onClick={copyToClipboard}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {copied ? 'Copied!' : 'Copy'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copied to clipboard!</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Preview Your Chatbot</h3>
                    <Button asChild className="w-full">
                      <Link href={`/chat/${user.id}`} target="_blank">
                        Open Chatbot in New Tab
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="chat">
            <div className="space-y-6">
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-1">Chat History</h2>
                <p className="text-muted-foreground">
                  View past conversations with your AI chatbot
                </p>
              </div>
              
              <AdminChatHistory />
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Project Dialog */}
      {isProjectDialogOpen && (
        <ProjectDialog
          isOpen={isProjectDialogOpen}
          onClose={() => setIsProjectDialogOpen(false)}
          project={currentProject}
          onSave={handleSaveProject}
          isNew={isNewProject}
        />
      )}
      
      {/* Project Detail View */}
      {isProjectDetailOpen && viewingProject && (
        <ProjectDetailView
          isOpen={isProjectDetailOpen}
          onClose={() => setIsProjectDetailOpen(false)}
          project={viewingProject}
          onSave={handleSaveProjectContent}
        />
      )}
    </div>
  );
} 