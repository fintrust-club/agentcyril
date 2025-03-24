'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-700">Agent Ciril Admin</h1>
          <nav>
            <Link href="/" className="text-gray-600 hover:text-primary-600">
              Back to Chat
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Update Portfolio Content</h2>
          
          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
              Content updated successfully!
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <textarea
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                rows={3}
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience
              </label>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                rows={3}
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projects
              </label>
              <textarea
                name="projects"
                value={formData.projects}
                onChange={handleChange}
                rows={4}
                className="input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interests & Hobbies
              </label>
              <textarea
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                rows={2}
                className="input"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 