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
import { RefreshCw } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const messagesEndRef = React.useRef<HTMLDivElement>(null); // Add ref for scroll target

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
      console.log('Processing chat history for visitor threads');
      
      // First, create a map of messages by visitor
      const visitorMap = new Map<string, ChatHistoryItem[]>();
      
      // Group messages by visitor_id or visitor_id_text
      chatHistory.forEach((message) => {
        // Skip invalid messages
        if (!message) return;
        
        // Determine which visitor ID to use (prefer visitor_id when available)
        const visitorKey = message.visitor_id || message.visitor_id_text || 'unknown';
        
        if (!visitorMap.has(visitorKey)) {
          visitorMap.set(visitorKey, []);
        }
        
        visitorMap.get(visitorKey)?.push(message);
      });
      
      // Convert the map to an array of visitor threads
      const threadsArray: UserThread[] = Array.from(visitorMap.entries()).map(([visitorId, messages]) => {
        // Get the visitor name from any message (assuming they're all the same visitor)
        const firstMessageWithName = messages.find(m => m.visitor_name);
        const visitorName = firstMessageWithName?.visitor_name || visitorId;
        
        // Get the timestamp of the most recent message
        const timestamps = messages.map(m => new Date(m.timestamp || m.created_at || 0));
        const lastActive = new Date(Math.max(...timestamps.map(d => d.getTime())));
        
        // Create a UserThread for this visitor
        return {
          visitorId,
          visitorName,
          messages,
          lastActive,
          messageCount: messages.length
        };
      });
      
      // Sort thread array by last active timestamp (most recent first)
      threadsArray.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
      
      console.log(`Created ${threadsArray.length} visitor threads`);
      if (threadsArray.length > 0) {
        console.log(`First thread: Visitor ${threadsArray[0].visitorId} with ${threadsArray[0].messageCount} messages`);
        
        // Check if we have conversation IDs in the messages
        const hasConversationIds = threadsArray[0].messages.some(m => m.conversation_id);
        console.log(`Messages have conversation_id: ${hasConversationIds}`);
        
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

  // Scroll to bottom when selectedVisitor changes
  React.useEffect(() => {
    if (messagesEndRef.current) {
      // Use 'auto' for instant scroll, 'smooth' for animated scroll
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [selectedVisitor]);

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
        {/* Remove the entire CardHeader element */}
        {/* <CardHeader className="border-b shrink-0">
          {/* Header can be empty or contain other global controls if needed */}
        {/* </CardHeader> */}
        
        {/* Adjust CardContent to handle potential top padding/margin if needed */}
        <CardContent className="p-0 flex-1 overflow-hidden">
          {error && (
            <div className="m-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 h-full divide-x">
              {/* Skeleton for Visitor List */}
              <div className="flex flex-col h-full overflow-hidden p-4 space-y-3">
                <Skeleton className="h-8 w-full mb-2" /> {/* Search bar skeleton */}
                {Array.from({ length: 5 }).map((_, index) => ( // 5 visitor skeletons
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
              {/* Skeleton for Chat Area with Loading Text */}
              <div className="md:col-span-2 flex flex-col h-full overflow-hidden p-4">
                <div className="flex-1 space-y-4">
                    <Skeleton className="h-10 w-1/3 self-end ml-auto" /> {/* Message skeleton (user) - align right */}
                    <Skeleton className="h-16 w-1/2 self-start" /> {/* Message skeleton (AI) - align left */}
                    <Skeleton className="h-10 w-2/5 self-end ml-auto" /> {/* Message skeleton (user) - align right */}
                    <Skeleton className="h-12 w-3/5 self-start" /> {/* Message skeleton (AI) - align left */}
                    <Skeleton className="h-8 w-1/4 self-end ml-auto" /> {/* Message skeleton (user) - align right */}
                </div>
                <div className="pt-4 text-center text-muted-foreground">
                  Fetching and loading your conversations...
                </div>
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
                <div className="p-4 border-b bg-muted/10 shrink-0 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Visitors</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {visitorThreads.length} {visitorThreads.length === 1 ? 'visitor' : 'visitors'} total
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
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
                          {/* Sort messages before mapping */}
                          {getSelectedVisitorThread()?.messages
                            .slice() // Create a shallow copy to avoid mutating state
                            .sort((a, b) => { // Sort ascending (oldest first)
                              const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
                              const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
                              return dateA - dateB; 
                            })
                            .map((message) => (
                            <React.Fragment key={message.id}>
                              {/* User Message */}
                              {message.message && (
                                <div className="flex justify-end mb-4">
                                  <div className="max-w-[70%]">
                                    <div className="bg-primary text-primary-foreground rounded-lg p-4">
                                      <div className="text-sm font-medium mb-1 opacity-80">Visitor</div>
                                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                          {message.message}
                                        </ReactMarkdown>
                                      </div>
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
                                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                          {message.response}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                      {formatDate(message.created_at || message.timestamp || '')}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                          {/* Add div with ref at the end of messages */}
                          <div ref={messagesEndRef} />
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