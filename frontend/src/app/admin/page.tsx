'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type FormData = {
  bio: string;
  skills: string;
  experience: string;
  projects: string;
  interests: string;
};

export default function AdminPage() {
  const [formData, setFormData] = useState<FormData>({
    bio: "I'm a software engineer with a passion for building AI and web applications. I specialize in full-stack development and have experience across the entire development lifecycle.",
    skills: "JavaScript, TypeScript, React, Node.js, Python, FastAPI, PostgreSQL, ChromaDB, Supabase, Next.js, TailwindCSS",
    experience: "5+ years of experience in full-stack development, with a focus on building AI-powered applications and responsive web interfaces.",
    projects: "AI-powered portfolio system, real-time analytics dashboard, natural language processing application",
    interests: "AI, machine learning, web development, reading sci-fi, hiking"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    
    try {
      // This would be a real API call to update data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Saved data:', formData);
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50">
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Agent Ciril Admin</h1>
          <nav>
            <Link href="/" className="text-muted-foreground hover:text-primary">
              Back to Chat
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Update Portfolio Content</CardTitle>
            <CardDescription>
              Manage the information used in your AI assistant responses.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {saveSuccess && (
              <div className="mb-6 p-3 bg-green-100 text-green-700 rounded-md">
                Content updated successfully!
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Bio
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
                  Skills
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
                  Experience
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
                  Projects
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
                  Interests & Hobbies
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
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              onClick={handleSubmit}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
} 