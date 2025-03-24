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
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [userThreads, setUserThreads] = useState<UserThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      setIsLoading(true);
      const response = await chatApi.getAllChatHistory(1000);
      
      // Sort all messages by timestamp
      const sortedHistory = response.history.sort((a: ChatHistoryItem, b: ChatHistoryItem) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setChatHistory(sortedHistory);
      
      // Process the data to create threads by visitor
      const threads = processThreads(sortedHistory);
      setUserThreads(threads);
      
      // Set active tab to the most recent conversation if none is selected
      if (!activeTab && threads.length > 0) {
        setActiveTab(threads[0].visitorId);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setError('Failed to load chat history.');
    } finally {
      setIsLoading(false);
    }
  };

  const processThreads = (messages: ChatHistoryItem[]): UserThread[] => {
    // Group messages by visitor
    const threadMap = new Map<string, ChatHistoryItem[]>();
    const visitorNames = new Map<string, string | undefined>();
    const lastActiveTimes = new Map<string, Date>();
    const messageCounts = new Map<string, number>();
    
    messages.forEach(message => {
      const visitorId = message.visitor_id;
      
      // Track visitor names
      if (message.visitor_name && !visitorNames.has(visitorId)) {
        visitorNames.set(visitorId, message.visitor_name);
      }
      
      // Add message to appropriate thread
      if (!threadMap.has(visitorId)) {
        threadMap.set(visitorId, []);
        messageCounts.set(visitorId, 0);
      }
      
      threadMap.get(visitorId)?.push(message);
      
      // Count user messages
      if (message.sender === 'user' && message.message && message.message.trim() !== '') {
        messageCounts.set(visitorId, (messageCounts.get(visitorId) || 0) + 1);
      }
      
      // Track most recent activity
      const messageTime = new Date(message.timestamp);
      if (!lastActiveTimes.has(visitorId) || messageTime > lastActiveTimes.get(visitorId)!) {
        lastActiveTimes.set(visitorId, messageTime);
      }
    });
    
    // Convert map to array of UserThread objects
    const threads: UserThread[] = Array.from(threadMap.entries()).map(([visitorId, messages]) => ({
      visitorId,
      visitorName: visitorNames.get(visitorId),
      messages: messages,
      lastActive: lastActiveTimes.get(visitorId) || new Date(0),
      messageCount: messageCounts.get(visitorId) || 0
    }));
    
    // Sort threads by most recently active
    threads.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    
    return threads;
  };

  const handleRefresh = () => {
    fetchChatHistory();
  };

  const getDisplayName = (thread: UserThread): string => {
    return thread.visitorName || `Visitor (${thread.visitorId.substring(0, 8)})`;
  };

  const formatRelativeTime = (timestamp: string): string => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };
  
  const formatDateTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Unknown date';
    }
  };

  const getThreadSummary = (thread: UserThread): string => {
    const userMessages = thread.messages.filter(m => m.sender === 'user' && m.message && m.message.trim() !== '');
    if (userMessages.length === 0) return "No messages";
    
    const lastMessage = userMessages[userMessages.length - 1];
    const truncated = lastMessage.message.length > 30 
      ? `${lastMessage.message.substring(0, 30)}...` 
      : lastMessage.message;
    
    return truncated;
  };

  const getMessageContent = (message: ChatHistoryItem): string => {
    if (message.sender === 'user') {
      return message.message;
    } else {
      return message.response || '';
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Chat Interactions</CardTitle>
          <CardDescription>View complete conversation threads with visitors</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-8">Loading chat threads...</div>
        ) : userThreads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No chat conversations found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left sidebar: List of conversations */}
            <div className="col-span-1 border rounded-md">
              <div className="p-3 border-b">
                <h3 className="font-medium">Conversations</h3>
              </div>
              
              <ScrollArea className="h-[500px]">
                <div className="px-1">
                  {userThreads.map(thread => (
                    <div 
                      key={thread.visitorId}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 rounded-sm transition-colors ${
                        activeTab === thread.visitorId ? 'bg-muted' : ''
                      }`}
                      onClick={() => setActiveTab(thread.visitorId)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {thread.visitorName ? thread.visitorName[0].toUpperCase() : 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getDisplayName(thread)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTime(thread.lastActive.toISOString())}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {thread.messageCount}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {getThreadSummary(thread)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Right side: Conversation thread */}
            <div className="col-span-1 md:col-span-2 border rounded-md">
              {activeTab ? (
                <>
                  {userThreads.filter(t => t.visitorId === activeTab).map(thread => (
                    <div key={thread.visitorId} className="flex flex-col h-[500px]">
                      <div className="p-3 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {thread.visitorName ? thread.visitorName[0].toUpperCase() : 'V'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{getDisplayName(thread)}</div>
                            <div className="text-xs text-muted-foreground">
                              {thread.messageCount} messages • Active {formatRelativeTime(thread.lastActive.toISOString())}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <ScrollArea className="flex-1 p-4 bg-muted/10">
                        <div className="space-y-6">
                          {thread.messages.map((message, index) => {
                            const isUser = message.sender === 'user';
                            const content = getMessageContent(message);
                            
                            // Skip empty messages
                            if (!content || content.trim() === '') return null;
                            
                            return (
                              <div key={message.id} className={index !== 0 ? 'pt-2' : ''}>
                                <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                                  <span className="font-medium">
                                    {isUser ? getDisplayName(thread) : 'AI Assistant'}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDateTime(message.timestamp)}</span>
                                </div>
                                
                                <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                                  <div 
                                    className={`max-w-[85%] rounded-lg p-3 ${
                                      isUser 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-secondary/30 text-secondary-foreground'
                                    }`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap">
                                      {content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                  Select a conversation to view
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 