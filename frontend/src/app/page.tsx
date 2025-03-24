'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from '@/components/theme-toggle';
import { chatApi, setVisitorName } from '@/utils/api';
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

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi, I'm Ciril! I can help answer questions about my skills, experience, projects, and more. What would you like to know?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitorName, setVisitorNameState] = useState('');
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if visitor name is set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('visitor_name');
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Call the actual chat API
      const response = await chatApi.sendMessage(input);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      setError('Sorry, I could not process your request. Please try again.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I couldn't process your request. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Agent Ciril</h1>
          <nav className="flex items-center space-x-4">
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

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
        <Card className="flex-1 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle>Interactive AI Portfolio</CardTitle>
            <CardDescription>Ask me anything about my skills, experience, and projects.</CardDescription>
          </CardHeader>
          
          <ScrollArea className="flex-1 h-[60vh]">
            <CardContent className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender === 'bot' && (
                    <Avatar className="mr-2 h-10 w-10 border-2 border-primary/10">
                      <AvatarImage src="/bot-avatar.png" alt="Bot" />
                      <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-3xl p-4 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/70'
                    }`}
                  >
                    <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">{message.content}</ReactMarkdown>
                  </div>
                  {message.sender === 'user' && (
                    <Avatar className="ml-2 h-10 w-10 border-2 border-primary/10">
                      <AvatarImage src="/user-avatar.png" alt="User" />
                      <AvatarFallback className="bg-secondary/10 text-secondary">
                        {visitorName ? visitorName[0].toUpperCase() : 'You'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Avatar className="mr-2 h-10 w-10 border-2 border-primary/10">
                    <AvatarImage src="/bot-avatar.png" alt="Bot" />
                    <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                  </Avatar>
                  <div className="max-w-3xl p-4 rounded-lg bg-muted/70">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="p-4 my-2 rounded-md bg-red-50 border border-red-200 text-red-700">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          </ScrollArea>
          
          <CardFooter className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
                placeholder="Ask a question..."
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                variant="default"
              >
                Send
              </Button>
            </form>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-muted py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Agent Ciril - Interactive AI Portfolio &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 