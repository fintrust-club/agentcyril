'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { profileApi } from '@/utils/api';
import { supabase } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';
import { CreateProjectModal } from './create-project-modal';
import { ProjectDetailView } from '@/components/project-detail-view';
import { Project } from '@/utils/types';
import { Plus, Trash2 } from 'lucide-react';

interface ProjectManagementProps {
  userId: string;
}

export function ProjectManagement({ userId }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Please sign in to view projects');
        return;
      }

      const response = await fetch(`/api/projects?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (project: Project) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Please sign in to add projects');
        return;
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...project,
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add project');
      }

      await fetchProjects();
      setIsCreateModalOpen(false);
      setError(null);
    } catch (err: any) {
      console.error('Error adding project:', err);
      setError(err.message || 'Failed to add project. Please try again.');
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Please sign in to update projects');
        return;
      }

      const response = await fetch(`/api/projects/${updatedProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...updatedProject,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update project');
      }

      const data = await response.json();
      
      // Update the project in the local state
      setProjects(projects.map(p => 
        p.id === updatedProject.id ? data : p
      ));
      
      setSelectedProject(null);
      setError(null);
    } catch (err: any) {
      console.error('Error updating project:', err);
      setError(err.message || 'Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setError('Please sign in to delete projects');
        return;
      }

      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      );

      const { data: project, error: fetchError } = await supabaseAuth
        .from('projects')
        .select('id, user_id')
        .eq('id', projectId)
        .single();

      if (fetchError) {
        console.error('Error fetching project:', fetchError);
        setError('Failed to verify project ownership');
        return;
      }

      if (!project) {
        setError('Project not found');
        return;
      }

      if (project.user_id !== userId) {
        setError('You do not have permission to delete this project');
        return;
      }

      const { error: deleteError } = await supabaseAuth
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        console.error('Error deleting project:', deleteError);
        setError(deleteError.message || 'Failed to delete project');
        return;
      }

      setProjects(projects.filter(p => p.id !== projectId));
      setError(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} /> Add New Project
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedProject(project)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <CardDescription className="mt-2">{project.description}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (project.id) handleDeleteProject(project.id);
                  }}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateProject}
      />

      {selectedProject && (
        <ProjectDetailView
          project={selectedProject}
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          onSave={handleUpdateProject}
        />
      )}
    </div>
  );
} 