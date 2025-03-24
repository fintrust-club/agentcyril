"use client";

import React, { useState } from 'react';
import { Project } from '@/utils/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from 'next/dynamic';
import { Badge } from "@/components/ui/badge";
import { Save, X } from "lucide-react";

// Dynamically import the Markdown Editor with no SSR to avoid hydration issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

// Dynamically import the Markdown Preview component
const MDPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => {
    const { default: ReactMarkdown } = mod;
    return ({ source }: { source: string }) => (
      <div className="markdown-body" style={{ padding: '20px' }}>
        <div data-color-mode="light" className="wmde-markdown-var">
          <ReactMarkdown value={source} />
        </div>
      </div>
    );
  }),
  { ssr: false }
);

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
  
  const handleContentChange = (value?: string) => {
    setEditedProject(prev => ({
      ...prev,
      content: value || ''
    }));
  };
  
  const handleSave = () => {
    onSave(editedProject);
    setEditMode(false);
  };
  
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'tech':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'design':
        return 'bg-purple-50 text-purple-600 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };
  
  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'tech':
        return 'Technology';
      case 'design':
        return 'Design';
      default:
        return 'Other';
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-2xl">{project.title}</DialogTitle>
              <Badge 
                variant="outline" 
                className={getCategoryBadgeClass(project.category)}
              >
                {getCategoryDisplayName(project.category)}
              </Badge>
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
                    onClick={() => setEditMode(false)}
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
                >
                  Edit Content
                </Button>
              )}
            </div>
          </div>
          <DialogDescription>
            {project.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="border rounded-md mb-6">
            <div className="bg-muted p-3 border-b">
              <h3 className="text-sm font-medium">Project Details</h3>
            </div>
            <div className="p-4 text-sm">
              {project.details}
            </div>
          </div>
          
          <div className="border rounded-md">
            <div className="bg-muted p-3 border-b flex justify-between items-center">
              <h3 className="text-sm font-medium">Project Content</h3>
            </div>
            <div className="p-0">
              {editMode ? (
                <div data-color-mode="light" className="p-2">
                  <MDEditor
                    value={editedProject.content || ''}
                    onChange={handleContentChange}
                    height={500} 
                    preview="edit"
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="p-4 prose max-w-none overflow-auto h-[500px]" data-color-mode="light">
                  {project.content ? (
                    <div className="wmde-markdown wmde-markdown-color">
                      <MDPreview source={project.content} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No content added yet. Click Edit Content to add markdown content.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 