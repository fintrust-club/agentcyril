'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatApi, type ChatHistoryItem } from '@/utils/api';
import { formatDistanceToNow, format } from 'date-fns';

// Group chats by visitor/user
type UserThread = {
  visitorId: string;
  visitorName: string | undefined;
  messages: ChatHistoryItem[];
  lastActive: Date;
  messageCount: number;
};

export function AdminChatHistory() {
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [visitorThreads, setVisitorThreads] = useState<UserThread[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!item) return;
        
        const visitorId = item.visitor_id || 'unknown';
        
        if (!threads[visitorId]) {
          console.log(`Creating new thread for visitor: ${visitorId}, name: ${item.visitor_name || 'unnamed'}`);
          threads[visitorId] = {
            visitorId,
            visitorName: item.visitor_name,
            messages: [],
            lastActive: new Date(item.timestamp || Date.now()),
            messageCount: 0,
          };
        }
        
        threads[visitorId].messages.push(item);
        threads[visitorId].messageCount += 1;
        
        // Update last active timestamp if more recent
        const messageDate = new Date(item.timestamp || Date.now());
        if (messageDate > threads[visitorId].lastActive) {
          threads[visitorId].lastActive = messageDate;
        }
      });
      
      // Sort messages by timestamp within each thread
      Object.values(threads).forEach(thread => {
        thread.messages.sort((a, b) => {
          const dateA = new Date(a.timestamp || 0).getTime();
          const dateB = new Date(b.timestamp || 0).getTime();
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
      
      // Use the chatApi service instead of direct fetch
      const messagesArray = await chatApi.getAllChatHistory(1000);
      console.log(`Retrieved ${messagesArray.length} messages from chat history API`);
      
      if (messagesArray.length > 0) {
        console.log('First few messages:', messagesArray.slice(0, 2));
      } else {
        console.log("No chat history found. Check if messages are being saved properly.");
      }
      
      // Update state with the messages
      setChatHistory(messagesArray);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history.');
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

  return (
    <Card className="shadow-md max-w-6xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Chat History</CardTitle>
          <CardDescription>
            View conversations with your AI chatbot
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="py-8 text-center">Loading chat history...</div>
        ) : visitorThreads.length === 0 ? (
          <div className="py-8 space-y-4">
            <div className="text-center text-muted-foreground">
              No chat history available. Try sending a message in the chat first.
            </div>
            {/* Debug information - only shown when there are no threads */}
            <div className="p-4 border rounded-md bg-muted/20 text-xs overflow-auto max-h-60">
              <p className="font-medium mb-2">Debug Information:</p>
              <p>Raw messages count: {chatHistory ? chatHistory.length : 0}</p>
              {chatHistory && chatHistory.length > 0 ? (
                <div>
                  <p>First message sample:</p>
                  <pre className="mt-2 p-2 bg-slate-800 text-slate-200 rounded overflow-auto">
                    {JSON.stringify(chatHistory[0], null, 2)}
                  </pre>
                </div>
              ) : (
                <p>No messages received from API.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px] md:h-[600px]">
            {/* Visitors List */}
            <div className="border rounded-lg overflow-hidden md:col-span-1">
              <div className="bg-muted/50 p-3 border-b">
                <h3 className="font-medium">Visitors ({visitorThreads.length})</h3>
              </div>
              <ScrollArea className="h-[200px] md:h-[550px]">
                <div className="p-2">
                  {visitorThreads.map((thread) => (
                    <div 
                      key={thread.visitorId}
                      onClick={() => setSelectedVisitor(thread.visitorId)}
                      className={`p-3 rounded-lg mb-2 cursor-pointer hover:bg-muted/50 ${
                        selectedVisitor === thread.visitorId ? 'bg-muted/50 border-primary' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(thread.visitorName?.[0] || 'V').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {thread.visitorName || `Visitor ${thread.visitorId.substring(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(thread.lastActive.toISOString())}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {thread.messageCount}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Chat Thread */}
            <div className="border rounded-lg overflow-hidden md:col-span-2">
              <div className="bg-muted/50 p-3 border-b">
                <h3 className="font-medium">
                  {getSelectedVisitorThread()?.visitorName || 
                   `Visitor ${getSelectedVisitorThread()?.visitorId.substring(0, 8) || ''}`}
                </h3>
              </div>
              <ScrollArea className="h-[280px] md:h-[550px]">
                <div className="p-4 space-y-4">
                  {getSelectedVisitorThread()?.messages.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="bg-muted/40 rounded-lg p-3 mr-12">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">Visitor</p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.timestamp)}</p>
                        </div>
                        <p className="text-sm">{item.message}</p>
                      </div>
                      
                      <div className="bg-primary/5 rounded-lg p-3 ml-12">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">AI Response</p>
                        </div>
                        <p className="text-sm">{item.response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 