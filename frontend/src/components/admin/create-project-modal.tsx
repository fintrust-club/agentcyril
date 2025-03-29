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
import { Save, X } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [project, setProject] = useState<Project>({
    title: '',
    description: '',
    technologies: '',
    project_url: '',
    image_url: '',
    is_featured: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProject((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    onSave(project);
    setProject({
      title: '',
      description: '',
      technologies: '',
      project_url: '',
      image_url: '',
      is_featured: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Project</DialogTitle>
          <DialogDescription>
            Add a new project to your portfolio. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              name="title"
              value={project.title}
              onChange={handleChange}
              placeholder="Enter project title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={project.description}
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
              value={project.technologies}
              onChange={handleChange}
              placeholder="Enter technologies used (comma separated)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_url">Project URL (optional)</Label>
            <Input
              id="project_url"
              name="project_url"
              value={project.project_url}
              onChange={handleChange}
              placeholder="Enter project URL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL (optional)</Label>
            <Input
              id="image_url"
              name="image_url"
              value={project.image_url}
              onChange={handleChange}
              placeholder="Enter image URL"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_featured"
              checked={project.is_featured}
              onCheckedChange={(checked) => 
                setProject(prev => ({ ...prev, is_featured: checked }))
              }
            />
            <Label htmlFor="is_featured">Featured Project</Label>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex items-center gap-1"
          >
            <X size={16} /> Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex items-center gap-1"
          >
            <Save size={16} /> Save Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 