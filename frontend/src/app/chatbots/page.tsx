'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from '@/utils/supabase';
import { profileApi } from '@/utils/api';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ChatbotsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{[key: string]: any}>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users that have profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .not('bio', 'is', null);
      
      if (profileError) throw profileError;
      
      // Fetch all user details
      const userIds = profileData.map(p => p.user_id);
      
      // Fetch user profiles 
      const userProfiles = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const profile = await profileApi.getProfileData(userId);
            return {
              userId,
              profile
            };
          } catch (err) {
            console.error(`Error fetching profile for user ${userId}:`, err);
            return null;
          }
        })
      );
      
      // Filter out null profiles and set the state
      const validProfiles = userProfiles.filter(p => p !== null);
      setUsers(validProfiles);
      
      // Create a map of profiles by userId for quick access
      const profileMap = validProfiles.reduce((acc, curr) => {
        if (curr) {
          acc[curr.userId] = curr.profile;
        }
        return acc;
      }, {});
      setProfiles(profileMap);
      
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract name from bio
  const extractName = (bio: string) => {
    if (!bio) return 'User';
    
    if (bio.includes('I am ')) {
      try {
        const namePart = bio.split('I am ')[1].split(' ')[0];
        if (namePart.length > 2) {
          return namePart;
        }
      } catch (e) {
        // If anything goes wrong with the extraction, return default
      }
    }
    
    return 'User';
  };

  // Get initials for avatar
  const getInitials = (bio: string) => {
    const name = extractName(bio);
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">AI Assistants</h1>
          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-sm font-medium">
              Dashboard
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <h2 className="text-3xl font-bold mb-2">Discover AI Assistants</h2>
        <p className="text-lg text-muted-foreground mb-8">Connect with AI assistants created by our community members</p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="shadow-md">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full my-2" />
                  <Skeleton className="h-4 w-full my-2" />
                  <Skeleton className="h-4 w-3/4 my-2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))
          ) : users.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No chatbots are available yet.</p>
            </div>
          ) : (
            users.map((user) => {
              if (!user) return null;
              
              const { userId, profile } = user;
              const bio = profile?.bio || 'No bio available';
              const skills = profile?.skills || 'No skills listed';
              const name = profile?.name || extractName(bio);
              const location = profile?.location || null;
              
              return (
                <Card key={userId} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage src={`https://avatar.vercel.sh/${userId}`} alt={name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {name ? name[0].toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{name}'s Chatbot</CardTitle>
                      <CardDescription className="text-xs truncate max-w-[200px]">
                        {location && <span className="font-medium">{location}</span>}
                        {location && " • "}
                        {bio.split('.')[0]}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Skills:</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {skills}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/chat/${userId}`} className="w-full">
                      <Button className="w-full" variant="default">
                        Chat Now
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
} 