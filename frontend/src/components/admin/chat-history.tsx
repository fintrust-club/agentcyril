'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatApi, type ChatHistoryItem } from '@/utils/api';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/utils/supabase';
import { Input } from "@/components/ui/input";

// Group chats by visitor/user
type UserThread = {
  visitorId: string;
  visitorName: string | undefined;
  messages: ChatHistoryItem[];
  lastActive: Date;
  messageCount: number;
};

interface AdminChatHistoryProps {
  userId: string;
}

export function AdminChatHistory({ userId }: AdminChatHistoryProps) {
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [visitorThreads, setVisitorThreads] = useState<UserThread[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch chat history on component mount
  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Process chat history into visitor threads
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      console.log(`Processing ${chatHistory.length} messages into visitor threads...`);
      const threads: { [key: string]: UserThread } = {};
      
      // Group messages by visitor
      chatHistory.forEach(item => {
        // Ensure item has required fields
        if (!item) {
          console.warn("Found null item in chat history");
          return;
        }
        
        // Use visitor_id_text if available, otherwise use visitor_id
        const visitorId = item.visitor_id_text || item.visitor_id || 'unknown';
        
        if (!threads[visitorId]) {
          console.log(`Creating new thread for visitor: ${visitorId}, name: ${item.visitor_name || 'unnamed'}`);
          threads[visitorId] = {
            visitorId,
            visitorName: item.visitor_name,
            messages: [],
            lastActive: new Date(item.created_at || item.timestamp || Date.now()),
            messageCount: 0,
          };
        }
        
        // Add message to thread
        threads[visitorId].messages.push(item);
        threads[visitorId].messageCount += 1;
        
        // Update last active timestamp if more recent
        const messageDate = new Date(item.created_at || item.timestamp || Date.now());
        if (messageDate > threads[visitorId].lastActive) {
          threads[visitorId].lastActive = messageDate;
        }
      });
      
      // Sort messages by timestamp within each thread
      Object.values(threads).forEach(thread => {
        thread.messages.sort((a, b) => {
          const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
          const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
          return dateA - dateB;
        });
      });
      
      // Convert to array and sort by last active (most recent first)
      const threadsArray = Object.values(threads).sort((a, b) => 
        b.lastActive.getTime() - a.lastActive.getTime()
      );
      
      console.log(`Created ${threadsArray.length} visitor threads`);
      if (threadsArray.length > 0) {
        console.log(`First thread: Visitor ${threadsArray[0].visitorId} with ${threadsArray[0].messageCount} messages`);
        console.log('Sample messages from first thread:', threadsArray[0].messages.slice(0, 2));
      }
      
      setVisitorThreads(threadsArray);
      
      // Select the first visitor if none is selected
      if (threadsArray.length > 0 && !selectedVisitor) {
        console.log(`Selecting visitor: ${threadsArray[0].visitorId}`);
        setSelectedVisitor(threadsArray[0].visitorId);
      }
    } else {
      console.log('No chat history to process');
      setVisitorThreads([]);
    }
  }, [chatHistory, selectedVisitor]);

  // Function to fetch chat history
  const fetchChatHistory = async () => {
    try {
      console.log("Fetching chat history...");
      setIsLoading(true);
      setError(null);
      
      // Get all chat history using the chatApi
      const messages = await chatApi.getAllChatHistory();
      console.log(`Retrieved ${messages.length} messages from chat history API`);
      
      if (messages.length > 0) {
        console.log('First few messages:', messages.slice(0, 2));
      } else {
        console.log("No chat history found. Check if messages are being saved properly.");
      }
      
      // Update state with the messages
      setChatHistory(messages);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history. Please check your authentication and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  const getSelectedVisitorThread = () => {
    if (!selectedVisitor) return null;
    return visitorThreads.find(thread => thread.visitorId === selectedVisitor);
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };

  // Function to handle refresh button click
  const handleRefresh = () => {
    console.log("Refresh button clicked");
    fetchChatHistory();
  };

  // Add this function to render messages
  const renderMessage = (message: ChatHistoryItem) => {
    if (!message || (!message.message && !message.response)) {
      console.warn("Received invalid message object:", message);
      return null;
    }

    const messageDate = new Date(message.created_at || message.timestamp || 0);
    
    return (
      <React.Fragment key={message.id}>
        {/* User Message */}
        {message.message && (
          <div className="flex justify-end mb-4">
            <div className="max-w-[70%] bg-blue-500 text-white rounded-lg p-3">
              <div className="text-sm mb-1">Visitor</div>
              <div className="text-base break-words whitespace-pre-wrap">{message.message}</div>
              <div className="text-xs mt-1 opacity-70">
                {messageDate.toLocaleString()}
              </div>
            </div>
          </div>
        )}
        
        {/* AI Response */}
        {message.response && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] bg-gray-100 text-black rounded-lg p-3">
              <div className="text-sm mb-1">AI Response</div>
              <div className="text-base break-words whitespace-pre-wrap">{message.response}</div>
              <div className="text-xs mt-1 opacity-70">
                {messageDate.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="shadow-lg h-[800px] flex flex-col">
        <CardHeader className="border-b shrink-0">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold">Chat History</CardTitle>
              <Button 
                variant="outline" 
                onClick={handleRefresh} 
                disabled={isLoading}
                className="px-6"
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            
            {user && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Your Public Chat Link</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/chat/${user.id}`);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-4"
                  >
                    Copy Link
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly
                    value={`${window.location.origin}/chat/${user.id}`}
                    className="font-mono text-sm bg-background"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Share this link with anyone who wants to chat with your AI assistant.
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-hidden">
          {error && (
            <div className="m-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading chat history...</p>
              </div>
            </div>
          ) : visitorThreads.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium">No chat history available</p>
                <p className="text-sm mt-2 text-muted-foreground">Chat conversations will appear here once visitors start chatting.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 h-full divide-x">
              {/* Visitor List */}
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b bg-muted/10 shrink-0">
                  <h3 className="text-lg font-semibold">Visitors</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {visitorThreads.length} {visitorThreads.length === 1 ? 'visitor' : 'visitors'} total
                  </p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      {visitorThreads.map(thread => (
                        <div
                          key={thread.visitorId}
                          className={`p-4 mb-2 rounded-lg cursor-pointer transition-colors ${
                            selectedVisitor === thread.visitorId 
                              ? 'bg-primary/5 border border-primary/10' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedVisitor(thread.visitorId)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-base">
                                {thread.visitorName || 'Anonymous Visitor'}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                              </div>
                            </div>
                            <Badge variant="secondary" className="ml-2 shrink-0">
                              {formatTimeAgo(thread.lastActive.toISOString())}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="md:col-span-2 flex flex-col h-full overflow-hidden">
                {selectedVisitor && getSelectedVisitorThread() ? (
                  <>
                    <div className="p-4 border-b bg-muted/10 shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {getSelectedVisitorThread()?.visitorName || 'Anonymous Visitor'}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getSelectedVisitorThread()?.messageCount} messages in conversation
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        <div className="p-6 space-y-6">
                          {getSelectedVisitorThread()?.messages.map((message) => (
                            <React.Fragment key={message.id}>
                              {/* User Message */}
                              {message.message && (
                                <div className="flex justify-end mb-4">
                                  <div className="max-w-[70%]">
                                    <div className="bg-primary text-primary-foreground rounded-lg p-4">
                                      <div className="text-sm font-medium mb-1 opacity-80">Visitor</div>
                                      <div className="text-base break-words whitespace-pre-wrap">{message.message}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2 text-right">
                                      {formatDate(message.created_at || message.timestamp || '')}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* AI Response */}
                              {message.response && (
                                <div className="flex justify-start mb-4">
                                  <div className="max-w-[70%]">
                                    <div className="bg-muted rounded-lg p-4">
                                      <div className="text-sm font-medium mb-1 opacity-80">AI Response</div>
                                      <div className="text-base break-words whitespace-pre-wrap">{message.response}</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                      {formatDate(message.created_at || message.timestamp || '')}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <p className="text-lg font-medium text-muted-foreground">Select a visitor to view their chat history</p>
                      <p className="text-sm text-muted-foreground mt-2">Choose from the list on the left to view the conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 