'use client';

import React, { useState, useEffect } from 'react';
import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/useAuth';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>AIChat - Your Personal AI Assistant</title>
        <meta name="description" content="Create your own personal AI chatbot based on your profile" />
      </head>
      <body className={inter.className}>
        {mounted && (
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <div className="flex flex-col min-h-screen">
                  <div className="flex-1">
                    {children}
                  </div>
                </div>
                <Toaster />
              </AuthProvider>
            </QueryClientProvider>
          </ThemeProvider>
        )}
      </body>
    </html>
  );
} 