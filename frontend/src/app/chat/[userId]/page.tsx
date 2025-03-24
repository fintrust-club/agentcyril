'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from '@/components/theme-toggle';
import { setVisitorName, getVisitorName, chatApi } from '@/utils/api';
import { sendMessage, fetchProfileData } from '@/utils/api';
import { ProfileData } from '@/utils/types';
import Markdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PaperPlaneIcon, Pencil1Icon } from '@radix-ui/react-icons';

export default function ChatPage() {
  const params = useParams();
  const userId = params.userId as string;
  
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [visitorName, setVisitorNameState] = useState('');
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch the profile data
  useEffect(() => {
    const getProfileData = async () => {
      try {
        setProfileLoading(true);
        const data = await fetchProfileData();
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    getProfileData();
  }, []);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setHistoryLoading(true);
        const history = await chatApi.getChatHistory();
        console.log('Loaded chat history:', history);
        
        if (history && history.length > 0) {
          // Convert chat history to messages format
          const chatMessages = history.flatMap(item => [
            { role: 'user', content: item.message },
            { role: 'assistant', content: item.response || '' }
          ]);
          
          setMessages(chatMessages);
        } else {
          // Add welcome message if no history
          setMessages([
            {
              role: 'assistant',
              content: profile ? 
                `Hi there! I'm ${profile.name || 'the person behind this profile'}${profile.location ? ` from ${profile.location}` : ''}. 
                ${profile.bio ? profile.bio.split('.')[0] + '.' : 'Welcome to my AI chatbot!'}
                Feel free to ask me about my work, experience, or interests.` :
                "Hello! I'm the person represented by this AI assistant. How can I help you today?"
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
        // Fall back to welcome message
        setMessages([
          {
            role: 'assistant',
            content: "Hello! I'm the person represented by this AI assistant. How can I help you today?"
          }
        ]);
      } finally {
        setHistoryLoading(false);
      }
    };

    if (!profileLoading) {
      loadChatHistory();
    }
  }, [profileLoading, profile]);

  // Check if visitor name is set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = getVisitorName();
      if (storedName) {
        setVisitorNameState(storedName);
      } else {
        // Show dialog to set name after a short delay
        const timer = setTimeout(() => {
          setIsNameDialogOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when messages change
  useEffect(() => {
    if (!loading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [loading, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    const userMessage = { role: 'user', content: newMessage };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      const response = await sendMessage(
        [...messages, userMessage],
        userId
      );
      
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: response.response }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVisitorName = () => {
    if (visitorName.trim()) {
      setVisitorName(visitorName.trim());
      setIsNameDialogOpen(false);
    }
  };

  // Function to get first letter(s) of name for avatar
  const getNameInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Professional Header */}
      <header className="border-b w-full fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-foreground hover:text-foreground/80 transition-colors">
              <h1 className="text-xl font-semibold">AI Assistant</h1>
            </Link>
            {profile && !profileLoading && (
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                | {profile.name || 'Personal AI'}
              </span>
            )}
          </div>
          <nav className="flex items-center gap-3">
            <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-border">
                  {visitorName ? (
                    <>
                      <span className="hidden md:inline">Hi,</span> {visitorName}
                      <Pencil1Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </>
                  ) : (
                    'Set Your Name'
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Introduce Yourself</DialogTitle>
                  <DialogDescription>
                    Tell us your name so we can personalize your chat experience.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={visitorName}
                      onChange={(e) => setVisitorNameState(e.target.value)}
                      className="col-span-3"
                      placeholder="Your name"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveVisitorName();
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveVisitorName}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Main content area with top padding for fixed header */}
      <main className="flex-1 pt-16 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0"></div>
        
        {/* Messages area with direct scrolling */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role !== 'user' && (
                <Avatar className="h-9 w-9 shrink-0 mt-0.5 border border-border shadow-sm">
                  {profile?.name ? (
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {profile.name.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback>AI</AvatarFallback>
                  )}
                </Avatar>
              )}
              
              <Card 
                className={`
                  max-w-[85%] 
                  ${message.role === 'user' 
                    ? 'bg-primary text-primary-foreground border-0' 
                    : 'bg-card border border-border'}
                `}
              >
                <CardContent className={`p-3 ${message.role === 'user' ? 'text-sm' : ''}`}>
                  {message.role === 'user' ? (
                    <p>{message.content}</p>
                  ) : (
                    <Markdown 
                      className="prose prose-sm dark:prose-invert max-w-none"
                    >
                      {message.content}
                    </Markdown>
                  )}
                </CardContent>
              </Card>
              
              {message.role === 'user' && (
                <Avatar className="h-9 w-9 shrink-0 mt-0.5 border border-border shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getNameInitials(visitorName || 'You')}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar className="h-9 w-9 shrink-0 mt-0.5 border border-border shadow-sm">
                {profile?.name ? (
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {profile.name.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                ) : (
                  <AvatarFallback>AI</AvatarFallback>
                )}
              </Avatar>
              <Card className="border border-border">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-foreground/25 animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-foreground/25 animate-pulse delay-150" />
                    <div className="h-2 w-2 rounded-full bg-foreground/25 animate-pulse delay-300" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
        
        {/* Message input */}
        <form 
          onSubmit={handleSendMessage} 
          className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto relative">
            {/* Floating chat input container with shadow */}
            <div className="absolute -top-14 left-0 right-0 rounded-2xl bg-background border border-border p-3 float-animation">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={loading ? "Waiting for response..." : "Type your message..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={loading}
                  className="flex-1 border-border focus-visible:ring-ring text-base h-12 pl-4 pr-4 py-6 rounded-xl"
                />
                <Button 
                  type="submit" 
                  disabled={loading || !newMessage.trim()} 
                  className="shrink-0 gap-1.5 h-12 px-5 rounded-xl"
                  size="lg"
                >
                  <span className="md:block hidden">Send</span>
                  <PaperPlaneIcon className="h-5 w-5" />
                </Button>
              </div>
              <div className="text-xs text-center mt-2 text-muted-foreground">
                <p>Ask me about my experience, projects, or interests</p>
              </div>
            </div>
            {/* Spacer to account for the floating input */}
            <div className="h-24"></div>
          </div>
        </form>
      </main>
    </div>
  );
} 