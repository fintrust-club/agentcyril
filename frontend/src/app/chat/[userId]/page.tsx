'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { profileApi, chatbotApi } from '@/utils/api';
import { getOrCreateVisitorId, setVisitorName, getVisitorName } from '@/utils/api';

export default function ChatPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId || '';
  
  const [profileData, setProfileData] = useState<any>(null);
  const [chatbotData, setChatbotData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visitorName, setVisitorNameState] = useState<string | null>(getVisitorName());

  useEffect(() => {
    if (userId) {
      fetchUserData(userId);
    }
  }, [userId]);

  const fetchUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch profile data
      const profile = await profileApi.getProfileData(userId);
      setProfileData(profile);
      
      // Use a direct Supabase query to get the chatbot for this user
      // This avoids authentication issues since we're accessing public data
      try {
        // Create a direct query for the public chatbot using the user ID
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/chat/${userId}/public`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chatbot: ${response.statusText}`);
        }
        
        const chatbotData = await response.json();
        setChatbotData(chatbotData);
        
        // Don't store in localStorage anymore, we pass directly to chat component
        // if (chatbotData?.id) {
        //   localStorage.setItem('current_chatbot_id', chatbotData.id);
        // }
      } catch (chatbotError) {
        console.error('Error fetching chatbot:', chatbotError);
        
        // Fallback: Create a chatbot ID from the user ID (this will work with the backend's get_or_create pattern)
        setChatbotData({
          id: userId, // Use user ID as a fallback - backend will resolve this
          user_id: userId,
          name: `${profile.name || 'AI'} Assistant`,
          description: 'Personal AI chatbot'
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load chatbot data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetVisitorName = (name: string) => {
    setVisitorNameState(name);
    setVisitorName(name);
  };

  const getUserName = () => {
    if (profileData?.name) return profileData.name;
    return chatbotData?.name || 'AI Assistant';
  };

  // Display the page with the chatbot data
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-col flex-1">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center text-red-500 p-4">
            {error}
          </div>
        ) : (
          <ChatInterface
            chatbotId={chatbotData?.id}
            userName={visitorName || undefined}
            onSetName={handleSetVisitorName}
            botName={chatbotData?.name || profileData?.name || 'AI Assistant'}
            userId={userId}
          />
        )}
      </div>
    </div>
  );
} 