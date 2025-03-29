"use client";

import React, { useState } from 'react';
import { Project } from '@/utils/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X } from "lucide-react";

interface ProjectDetailViewProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState<Project>({ ...project });
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedProject(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSave = () => {
    onSave(editedProject);
    setEditMode(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-2xl font-bold">{project.title}</DialogTitle>
              {project.is_featured && (
                <Badge variant="secondary">Featured</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    onClick={handleSave}
                    className="flex items-center gap-1"
                    size="sm"
                  >
                    <Save size={16} /> Save
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMode(false);
                      setEditedProject({ ...project });
                    }}
                    variant="outline"
                    className="flex items-center gap-1"
                    size="sm"
                  >
                    <X size={16} /> Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditMode(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Edit size={16} /> Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {editMode ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                name="title"
                value={editedProject.title}
                onChange={handleChange}
                placeholder="Enter project title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={editedProject.description}
                onChange={handleChange}
                placeholder="Enter project description"
                className="resize-none"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="technologies">Technologies</Label>
              <Input
                id="technologies"
                name="technologies"
                value={editedProject.technologies}
                onChange={handleChange}
                placeholder="Enter technologies used (comma separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_url">Project URL (optional)</Label>
              <Input
                id="project_url"
                name="project_url"
                value={editedProject.project_url}
                onChange={handleChange}
                placeholder="Enter project URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input
                id="image_url"
                name="image_url"
                value={editedProject.image_url}
                onChange={handleChange}
                placeholder="Enter image URL"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_featured"
                checked={editedProject.is_featured}
                onCheckedChange={(checked) => 
                  setEditedProject(prev => ({ ...prev, is_featured: checked }))
                }
              />
              <Label htmlFor="is_featured">Featured Project</Label>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{project.description}</p>
            </div>
            
            {project.technologies && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Technologies</h3>
                <p className="text-muted-foreground">{project.technologies}</p>
              </div>
            )}
            
            {project.project_url && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Project URL</h3>
                <p className="text-muted-foreground">
                  <a 
                    href={project.project_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    {project.project_url}
                  </a>
                </p>
              </div>
            )}
            
            {project.image_url && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Image URL</h3>
                <p className="text-muted-foreground">{project.image_url}</p>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 