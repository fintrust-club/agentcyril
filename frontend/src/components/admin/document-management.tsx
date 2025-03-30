'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, Eye, Trash2, Info } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/components/ui/use-toast';
import { DocumentUploadModal } from "@/components/ui/document-upload-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DocumentManagementProps {
  userId: string;
}

interface Document {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number;
  storage_path: string;
  mime_type: string;
  extracted_text: string;
  created_at: string;
  updated_at: string;
}

export function DocumentManagement({ userId }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<Document | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Ensure the document bucket exists when the component loads
    ensureDocumentBucketExists();
    fetchDocuments();
  }, [userId]);
  
  // Ensure the documents storage bucket exists
  const ensureDocumentBucketExists = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }
      
      // Check if the bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const documentsBucketExists = buckets?.some(bucket => bucket.name === 'documents');
      
      if (!documentsBucketExists) {
        // Create the documents bucket
        const { data, error } = await supabase.storage.createBucket('documents', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (error) {
          console.error('Error creating documents bucket:', error);
        } else {
          console.log('Documents bucket created successfully');
        }
      }
    } catch (err) {
      console.error('Error checking/creating documents bucket:', err);
    }
  };
  
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
      console.log("Fetched documents:", data);
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err?.message || 'Failed to load documents');
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
        <Button 
          variant="default" 
          onClick={() => setShowUploadModal(true)} 
          className="flex items-center gap-2"
        >
          <Upload size={16} /> Upload Document
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
                    <h3 className="font-medium">{doc.title}</h3>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground flex gap-4 flex-wrap">
                    <span>{doc.file_name}</span>
                    <span>•</span>
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>Added {formatDate(doc.created_at)}</span>
                    {doc.description && (
                      <>
                        <span>•</span>
                        <span title={doc.description}>
                          <Info size={14} className="inline mr-1" />
                          Has description
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="text-primary hover:bg-primary/10"
                    onClick={() => setDocumentPreview(doc)}
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10" 
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadComplete={fetchDocuments}
        userId={userId}
      />
      
      {/* Document Preview Modal */}
      <Dialog open={!!documentPreview} onOpenChange={(open) => !open && setDocumentPreview(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{documentPreview?.title}</DialogTitle>
            <DialogDescription>
              Document Details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <p className="font-medium text-muted-foreground">Filename:</p>
              <p>{documentPreview?.file_name}</p>
              
              <p className="font-medium text-muted-foreground">Size:</p>
              <p>{documentPreview?.file_size && formatFileSize(documentPreview.file_size)}</p>
              
              <p className="font-medium text-muted-foreground">Uploaded:</p>
              <p>{documentPreview?.created_at && formatDate(documentPreview.created_at)}</p>
              
              <p className="font-medium text-muted-foreground">Type:</p>
              <p>{documentPreview?.mime_type}</p>
            </div>
            
            {documentPreview?.description && (
              <div className="space-y-2">
                <h4 className="font-medium">Description</h4>
                <p className="p-3 border rounded-md bg-muted/50 text-sm">{documentPreview.description}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium">Extracted Text</h4>
              <div className="border rounded-md p-3 bg-muted/50 max-h-[300px] overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{documentPreview?.extracted_text}</pre>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 