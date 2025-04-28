'use client';

import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { notesApi } from '@/utils/api'; // Import notesApi
import type { Note } from '@/utils/types'; // Import Note type
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

export function NotesInterface() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isLoadingFetch, setIsLoadingFetch] = useState(true); // Loading state for fetching
  const [isLoadingCreate, setIsLoadingCreate] = useState(false); // Loading state for creating
  const [error, setError] = useState<string | null>(null);

  // Fetch notes on component mount
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoadingFetch(true);
    setError(null);
    try {
      console.log('NotesInterface: Calling notesApi.getNotes()'); // Log before API call
      const fetchedNotes = await notesApi.getNotes();
      console.log('NotesInterface: Received notes from API:', fetchedNotes); // Log raw response
      
      if (!Array.isArray(fetchedNotes)) {
        console.error('NotesInterface: Fetched data is not an array!', fetchedNotes);
        setError('Invalid data received from server.');
        setNotes([]); // Clear notes state
        setIsLoadingFetch(false);
        return;
      }
      
      // Sort notes by creation date, newest first
      fetchedNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      console.log('NotesInterface: Setting notes state with:', fetchedNotes); // Log data being set
      setNotes(fetchedNotes);

    } catch (err) {
      setError('Failed to load notes.'); 
      console.error("NotesInterface: Error during fetchNotes:", err); 
    }
    setIsLoadingFetch(false);
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) return;
    setIsLoadingCreate(true);
    setError(null);
    try {
      const createdNote = await notesApi.createNote(newNoteContent);
      if (createdNote) {
        // Add the new note to the top of the list
        setNotes((prevNotes) => [createdNote, ...prevNotes]);
        setNewNoteContent(''); // Clear input field
      } else {
        // Error handled by notesApi, but set local error if needed
        setError('Failed to save the note.');
      }
    } catch (err) {
      // Catch potential errors not handled by notesApi (unlikely with current setup)
      setError('An unexpected error occurred while saving.');
      console.error("Error in component handleCreateNote:", err);
    }
    setIsLoadingCreate(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>My Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Notes History */}
          <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/50 min-h-[200px]">
            {isLoadingFetch ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error && notes.length === 0 ? (
              <p className="text-center text-destructive">Error loading notes. Please try again later.</p>
            ) : !isLoadingFetch && notes.length === 0 ? (
              <p className="text-center text-muted-foreground">No notes yet. Start writing!</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-background rounded shadow-sm text-sm break-words">
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="flex flex-col gap-2 pt-2">
            <Textarea
              placeholder="Write your note here..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={isLoadingCreate}
            />
            {error && !isLoadingFetch && <p className="text-sm text-destructive">{error}</p>} {/* Show create/general errors */}
            <Button
              onClick={handleCreateNote}
              disabled={isLoadingCreate || !newNoteContent.trim()}
            >
              {isLoadingCreate ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 