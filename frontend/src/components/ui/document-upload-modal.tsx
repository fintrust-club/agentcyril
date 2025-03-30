'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, X } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/components/ui/use-toast';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
  userId: string;
}

export function DocumentUploadModal({ 
  open, 
  onOpenChange, 
  onUploadComplete, 
  userId 
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is too large (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    // Only allow PDF files
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported for processing.');
      return;
    }
    
    setSelectedFile(file);
    setDocumentTitle(file.name.replace(/\.[^/.]+$/, "")); // Default title is filename without extension
    setError(null);
  };
  
  const resetForm = () => {
    setSelectedFile(null);
    setDocumentTitle('');
    setDocumentDescription('');
    setUploadProgress(0);
    setError(null);
  };
  
  const handleClose = () => {
    if (!isUploading) {
      resetForm();
      onOpenChange(false);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !documentTitle.trim()) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to upload documents');
      }
      
      // Generate a unique file path in storage
      const timestamp = new Date().getTime();
      const filePath = `${userId}/${timestamp}_${selectedFile.name}`;
      
      // First upload the file to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (storageError) {
        throw new Error(`Failed to upload file to storage: ${storageError.message}`);
      }
      
      setUploadProgress(50); // File uploaded to storage, now process it
      
      // Create FormData for backend processing
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', documentTitle);
      formData.append('description', documentDescription);
      formData.append('filePath', filePath);
      formData.append('userId', userId);
      
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Map the progress to the second half of our progress bar (50-100%)
          const percentComplete = 50 + Math.round((event.loaded / event.total) * 50);
          setUploadProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          toast({
            title: "Document Uploaded",
            description: "Your document has been uploaded successfully and is being processed.",
          });
          resetForm();
          onOpenChange(false);
          onUploadComplete();
        } else {
          let errorMessage = 'Failed to upload document';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.error || errorMessage;
          } catch (e) {
            // If parsing fails, use the default error message
          }
          setError(errorMessage);
          
          // Clean up the storage file if processing failed
          try {
            await supabase.storage.from('documents').remove([filePath]);
          } catch (cleanupError) {
            console.error('Failed to clean up uploaded file after processing error:', cleanupError);
          }
        }
        setIsUploading(false);
        setUploadProgress(0);
      });
      
      xhr.addEventListener('error', async () => {
        setError('Network error occurred during upload');
        setIsUploading(false);
        setUploadProgress(0);
        
        // Clean up the storage file if processing failed
        try {
          await supabase.storage.from('documents').remove([filePath]);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file after processing error:', cleanupError);
        }
      });
      
      xhr.open('POST', '/api/documents/process');
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      xhr.send(formData);
      
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err?.message || 'Failed to upload document');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document to be processed and made available for the chatbot.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4 py-2">
          {!selectedFile ? (
            <div 
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-base font-medium">Click to select a PDF file</p>
              <p className="text-sm text-muted-foreground mt-1">
                Or drag and drop (max 10MB)
              </p>
              <Input 
                id="file-upload" 
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf"
              />
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <div className="text-sm">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Enter a title for this document"
                    disabled={isUploading}
                    maxLength={100}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={documentDescription}
                    onChange={(e) => setDocumentDescription(e.target.value)}
                    placeholder="Add a description of this document"
                    disabled={isUploading}
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>
            </div>
          )}
          
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || !documentTitle.trim() || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 