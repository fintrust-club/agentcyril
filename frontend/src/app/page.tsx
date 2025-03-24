'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

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
    <div className="flex flex-col h-screen bg-gradient-to-b from-primary-50 to-white">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-700">Agent Ciril</h1>
          <nav>
            <Link href="/admin" className="text-gray-600 hover:text-primary-600">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 card p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 dark:bg-gray-700 dark:text-white'
                  }`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl p-4 rounded-lg bg-white border border-gray-200 dark:bg-gray-700 dark:text-white">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input flex-1"
            placeholder="Ask a question..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </form>
      </main>

      <footer className="bg-gray-100 py-4 dark:bg-gray-800 dark:text-white">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Agent Ciril - Interactive AI Portfolio &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
} 