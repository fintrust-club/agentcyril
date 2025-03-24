'use client';

import React, { useState } from 'react';
import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <title>Agent Ciril - Interactive AI Portfolio</title>
        <meta name="description" content="Chat with an AI agent to learn about my skills, experience, and projects" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <main className="min-h-screen flex flex-col">{children}</main>
        </QueryClientProvider>
      </body>
    </html>
  );
} 