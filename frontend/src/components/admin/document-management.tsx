'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Trash2, Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';

interface DocumentManagementProps {
  userId: string;
}

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
  status: string;
  storage_path: string;
  user_id: string;
}

export function DocumentManagement({ userId }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchDocuments();
  }, [userId]);
  
  const fetchDocuments = async () => {
    try {
      setError(null);
      
      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to view documents');
        return;
      }
      
      const response = await fetch(`/api/documents?user_id=${userId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }
      
      const data = await response.json();
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err?.message || 'Failed to load documents');
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is too large (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }
    
    // Only allow PDF, DOC, DOCX, TXT
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, DOC, DOCX, and TXT files are allowed.');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to upload documents');
      }
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          toast({
            title: "Document Uploaded",
            description: "Your document has been uploaded successfully and is being processed.",
            type: "success"
          });
          await fetchDocuments();
        } else {
          let errorMessage = 'Failed to upload document';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.error || errorMessage;
          } catch (e) {
            // If parsing fails, use the default error message
          }
          setError(errorMessage);
        }
        setIsUploading(false);
        setUploadProgress(0);
      });
      
      xhr.addEventListener('error', () => {
        setError('Network error occurred during upload');
        setIsUploading(false);
        setUploadProgress(0);
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
  
  const handleDeleteDocument = async (documentId: string) => {
    try {
      setError(null);
      
      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to delete documents');
      }
      
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      // Update the local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Document Deleted",
        description: "The document has been removed successfully.",
        type: "info"
      });
      
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setError(err?.message || 'Failed to delete document');
    }
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Documents</h2>
        <div>
          <Input
            type="file"
            id="document-upload"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            disabled={isUploading}
          />
          <Label htmlFor="document-upload" asChild>
            <Button variant="default" disabled={isUploading} className="flex items-center gap-2">
              <Upload size={16} /> Upload Document
            </Button>
          </Label>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isUploading && (
        <div className="my-4 p-4 border rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Uploading Document...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents to make them searchable by the chatbot
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="overflow-hidden">
              <div className="flex items-center p-4">
                <div className="flex-1">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    <h3 className="font-medium">{doc.name}</h3>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground flex gap-4">
                    <span>{formatFileSize(doc.size)}</span>
                    <span>•</span>
                    <span>Added {formatDate(doc.created_at)}</span>
                    <span>•</span>
                    <span className="capitalize">
                      {doc.status === 'processed' ? (
                        <span className="text-green-600">✓ Processed</span>
                      ) : doc.status === 'failed' ? (
                        <span className="text-red-600">✗ Failed</span>
                      ) : (
                        <span className="text-amber-600">⏳ Processing</span>
                      )}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10" 
                  onClick={() => handleDeleteDocument(doc.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 