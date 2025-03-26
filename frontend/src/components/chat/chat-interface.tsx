'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatApi } from '@/utils/api';
import { Card, CardContent } from "@/components/ui/card";

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

interface ChatInterfaceProps {
  chatbotId?: string;
  userName?: string;
  onSetName?: (name: string) => void;
  avatarUrl?: string;
  botName?: string;
  userId?: string;
}

export function ChatInterface({ 
  chatbotId,
  userName,
  onSetName,
  avatarUrl,
  botName = 'AI Assistant',
  userId
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat history when component mounts
  useEffect(() => {
    if (userName && (chatbotId || userId)) {
      fetchChatHistory();
    }
  }, [chatbotId, userName, userId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      if (userName && (chatbotId || userId)) {
        let history = [];
        
        if (userId) {
          // For public chatbots, use the dedicated public history endpoint
          console.log(`Fetching chat history for public chatbot with user ID: ${userId}`);
          history = await chatApi.getPublicChatHistory(userId);
        } else if (chatbotId) {
          // For regular chatbots, use the standard history endpoint
          console.log(`Fetching chat history for chatbot ID: ${chatbotId}`);
          history = await chatApi.getChatHistory(chatbotId);
        }
        
        if (history && history.length > 0) {
          // Convert history items to our Message format
          const formattedMessages = history.map((item: any) => [
            {
              id: `${item.id}-user`,
              content: item.message,
              sender: 'user' as const,
              timestamp: new Date(item.timestamp)
            },
            {
              id: `${item.id}-ai`,
              content: item.response,
              sender: 'ai' as const,
              timestamp: new Date(item.timestamp)
            }
          ]).flat();
          
          setMessages(formattedMessages);
          console.log(`Loaded ${history.length} chat history items`);
        } else {
          console.log("No chat history found or empty history returned");
        }
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setError('Failed to load chat history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    // If we need a name first
    if (!userName && onSetName) {
      handleSetName(e);
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      content: input,
      sender: 'user' as const,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Log details based on what we're using
      if (userId) {
        console.log(`Sending message to public chatbot for user ID: ${userId}`);
      } else {
        console.log(`Sending message to chatbot ID: ${chatbotId}`);
      }
      console.log(`Visitor name: ${userName}`);
      console.log(`Message: ${input}`);
      
      // Use the appropriate API method based on whether we have a userId (public)
      // or a chatbotId (regular)
      let response;
      if (userId) {
        response = await chatApi.sendPublicMessage(input, userId);
      } else {
        response = await chatApi.sendMessage(input, chatbotId);
      }
      
      console.log('Chat API response:', response);
      
      // Add AI response to messages
      if (response && response.response) {
        const aiMessage = {
          id: `${Date.now()}-ai`,
          content: response.response,
          sender: 'ai' as const,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from the API');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Create a more detailed error message
      let errorMessage = 'Failed to send message. Please try again.';
      if (err instanceof Error) {
        errorMessage += ` (${err.message})`;
      }
      setError(errorMessage);
      
      // Add error message as AI response
      const errorAiMessage = {
        id: `${Date.now()}-error`,
        content: 'Sorry, there was an error processing your message. Please try again.',
        sender: 'ai' as const,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() === '') return;
    
    if (onSetName) {
      onSetName(nameInput);
    }
  };

  // If name is required but not provided
  if (!userName && onSetName) {
    return (
      <div className="flex flex-col h-full justify-center items-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold text-center mb-6">Welcome to the Chat</h2>
            <p className="text-center mb-6 text-muted-foreground">
              Please enter your name to start chatting
            </p>
            
            <form onSubmit={handleSetName} className="space-y-4">
              <Input
                type="text"
                placeholder="Your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full"
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={nameInput.trim() === ''}
              >
                Start Chatting
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`flex max-w-[80%] ${
                    message.sender === 'user' 
                      ? 'flex-row-reverse' 
                      : 'flex-row'
                  }`}
                >
                  <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'ml-2' : 'mr-2'}`}>
                    {message.sender === 'ai' ? (
                      <>
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback>{botName[0]}</AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback>{userName?.[0].toUpperCase() || 'U'}</AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div 
                    className={`rounded-lg p-3 ${
                      message.sender === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{botName[0]}</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '600ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Error display */}
      {error && (
        <div className="p-2 m-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      
      {/* Message Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || input.trim() === ''}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
} 