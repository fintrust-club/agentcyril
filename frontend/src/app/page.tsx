'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    try {
      // This would be replaced with a real API call
      const response = await simulateBotResponse(input);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
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

  // This function simulates a bot response - would be replaced with a real API call
  const simulateBotResponse = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (query.toLowerCase().includes('project')) {
          resolve("I've worked on several projects including an AI-powered portfolio system, a real-time analytics dashboard, and a natural language processing application. Would you like to know more about any of these?");
        } else if (query.toLowerCase().includes('skill') || query.toLowerCase().includes('tech')) {
          resolve("I'm proficient in JavaScript/TypeScript, React, Node.js, Python, and FastAPI. I also have experience with databases like PostgreSQL and vector databases like ChromaDB.");
        } else if (query.toLowerCase().includes('experience') || query.toLowerCase().includes('work')) {
          resolve("I have 5+ years of experience in full-stack development, with a focus on building AI-powered applications and responsive web interfaces.");
        } else {
          resolve("I'm a software engineer with a passion for building AI and web applications. I specialize in full-stack development and have experience across the entire development lifecycle. Is there something specific you'd like to know about me?");
        }
      }, 1000);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-muted/50 to-background">
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Agent Ciril</h1>
          <nav>
            <Button variant="ghost" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <Card className="flex-1 overflow-y-auto mb-4 p-0">
          <CardContent className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'bot' && (
                  <Avatar className="mr-2 h-8 w-8">
                    <AvatarImage src="/bot-avatar.png" alt="Bot" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-3xl p-4 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/70'
                  }`}
                >
                  <ReactMarkdown className="prose prose-sm">{message.content}</ReactMarkdown>
                </div>
                {message.sender === 'user' && (
                  <Avatar className="ml-2 h-8 w-8">
                    <AvatarImage src="/user-avatar.png" alt="User" />
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Avatar className="mr-2 h-8 w-8">
                  <AvatarImage src="/bot-avatar.png" alt="Bot" />
                  <AvatarFallback>AI</AvatarFallback>
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
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        <form onSubmit={handleSendMessage} className="flex space-x-2">
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
          >
            Send
          </Button>
        </form>
      </main>

      <footer className="bg-muted py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Agent Ciril - Interactive AI Portfolio &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 