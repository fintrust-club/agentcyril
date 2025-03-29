'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { chatApi } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil1Icon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  chatbotId?: string;
  visitorName?: string;
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
  const [isEditingName, setIsEditingName] = useState(false);
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
          // Convert history items to our Message format, only including messages that exist
          const formattedMessages = history.flatMap((item: any) => {
            const messages: Message[] = [];
            
            // Add user message if it exists
            if (item.message) {
              messages.push({
                id: `${item.id}-user`,
                content: item.message,
                sender: 'user',
                timestamp: new Date(item.timestamp || item.created_at),
                chatbotId: item.chatbot_id,
                visitorName: item.visitor_name
              });
            }
            
            // Add AI response only if it exists
            if (item.response) {
              messages.push({
                id: `${item.id}-ai`,
                content: item.response,
                sender: 'ai',
                timestamp: new Date(item.timestamp || item.created_at),
                chatbotId: item.chatbot_id
              });
            }
            
            return messages;
          });
          
          // Sort messages by timestamp
          formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          setMessages(formattedMessages);
          console.log(`Loaded ${formattedMessages.length} messages from ${history.length} chat history items`);
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
      timestamp: new Date(),
      chatbotId: chatbotId || undefined,
      visitorName: userName
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
      
      // Handle the response
      if (response && response.response) {
        const aiMessage = {
          id: `${Date.now()}-ai`,
          content: response.response,
          sender: 'ai' as const,
          timestamp: new Date(),
          chatbotId: response.chatbot_id || chatbotId
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else if (response && response.error) {
        // Handle error response
        const errorMessage = {
          id: `${Date.now()}-error`,
          content: `Error: ${response.error}`,
          sender: 'ai' as const,
          timestamp: new Date(),
          chatbotId: chatbotId
        };
        setMessages(prev => [...prev, errorMessage]);
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
        timestamp: new Date(),
        chatbotId: chatbotId
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
      setIsEditingName(false);
    }
  };

  return (
    <>
      {!userName && onSetName ? (
        <div className="flex flex-col h-full justify-center items-center p-6 bg-background">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Welcome to {botName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Please enter your name to start chatting
              </p>
              
              <form onSubmit={handleSetName} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full"
                  autoFocus
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
      ) : (
        <div className="relative min-h-screen pb-24">
          {/* Header with visitor name */}
          <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-3xl mx-auto px-4 py-2 text-center">
              <p className="text-sm text-muted-foreground inline-flex items-center justify-center gap-1">
                {isEditingName ? (
                  <form onSubmit={handleSetName} className="inline-flex items-center gap-2">
                    <Input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="h-7 text-sm py-1 px-2 w-[150px]"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-7 px-2 py-0">
                      Save
                    </Button>
                  </form>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    Chatting as: <span className="font-medium">{userName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setNameInput(userName || '');
                        setIsEditingName(true);
                      }}
                    >
                      <Pencil1Icon className="h-3 w-3" />
                    </Button>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Messages container */}
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col space-y-4 p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg font-medium mb-2">Welcome to your conversation!</p>
                  <p className="text-sm">Start chatting by sending a message below.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        {message.sender === 'user' ? (
                          <>
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback>{userName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src="/bot-avatar.png" />
                            <AvatarFallback>AI</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start px-4">
                <div className="flex items-start">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback>AI</AvatarFallback>
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

            {/* Error display */}
            {error && (
              <div className="px-4 py-2">
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Floating input at bottom */}
          <div className="fixed bottom-6 left-0 right-0 z-10">
            <div className="max-w-2xl mx-auto px-4">
              <div className="bg-background/95 p-4 rounded-2xl shadow-lg border">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 h-12 text-base bg-muted/50"
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || input.trim() === ''} 
                    className="h-12 px-8 text-base"
                  >
                    Send
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 