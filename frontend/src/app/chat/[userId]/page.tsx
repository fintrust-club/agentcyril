'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from '@/components/theme-toggle';
import { setVisitorName, getVisitorName } from '@/utils/api';
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

export default function ChatPage() {
  const params = useParams();
  const userId = params.userId as string;
  
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [visitorName, setVisitorNameState] = useState('');
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch the profile data
  useEffect(() => {
    const getProfileData = async () => {
      try {
        setProfileLoading(true);
        const data = await fetchProfileData();
        setProfile(data);
        
        // Add welcome message in first person as if it's the user talking
        setMessages([
          {
            role: 'assistant',
            content: `Hi there! I'm ${data.name || 'the person behind this profile'}${data.location ? ` from ${data.location}` : ''}. 
            ${data.bio ? data.bio.split('.')[0] + '.' : 'Welcome to my AI chatbot!'}
            Feel free to ask me anything about my work, experience, or interests.`
          }
        ]);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessages([
          {
            role: 'assistant',
            content: "Hello! I'm the person represented by this AI assistant. How can I help you today?"
          }
        ]);
      } finally {
        setProfileLoading(false);
      }
    };

    getProfileData();
  }, []);

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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Fixed Header */}
      <header className="border-b w-full fixed top-0 left-0 right-0 bg-background z-10">
        <div className="max-w-3xl mx-auto p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">AIChat</h1>
          <nav className="flex items-center gap-6">
            <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {visitorName ? `Hi, ${visitorName}` : 'Set Your Name'}
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

      {/* Chat container with max-width - with top padding to account for fixed header */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full pt-16">
        {/* Messages with scrolling */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <Card key={index} className={`${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
              <CardContent className="p-3">
                {message.role === 'user' ? (
                  <p>{message.content}</p>
                ) : (
                  <Markdown>{message.content}</Markdown>
                )}
              </CardContent>
            </Card>
          ))}
          {loading && (
            <Card className="mr-12">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </CardContent>
            </Card>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !newMessage.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 