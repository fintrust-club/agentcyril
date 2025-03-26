# Frontend Implementation Guide for Multi-User Platform

## Overview

This document outlines the necessary changes to transform the current single-user frontend into a multi-user platform where each user can have their own profile and chatbot.

## Key Changes Required

### 1. User Authentication

Implement a complete authentication flow using Supabase Auth:

```typescript
// src/lib/auth.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export function getUser() {
  return supabase.auth.getUser()
}

export function getSession() {
  return supabase.auth.getSession()
}
```

### 2. User Profile Management

Update the profile management components to handle multiple users:

```typescript
// src/components/ProfileEditor.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile, getProfile } from '@/lib/api'

export function ProfileEditor() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({
    name: '',
    location: '',
    bio: '',
    skills: '',
    experience: '',
    interests: ''
  })
  
  useEffect(() => {
    // Only load profile if user is authenticated
    if (user) {
      loadProfile()
    }
  }, [user])
  
  async function loadProfile() {
    try {
      const data = await getProfile()
      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      const updatedProfile = await updateProfile(profile)
      setProfile(updatedProfile)
      alert('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    }
  }
  
  // Render profile editor form
  // ...
}
```

### 3. Chatbot Management

Create components for managing a user's chatbots:

```typescript
// src/components/ChatbotManager.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getChatbots, createChatbot, updateChatbot, deleteChatbot } from '@/lib/api'

export function ChatbotManager() {
  const { user } = useAuth()
  const [chatbots, setChatbots] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (user) {
      loadChatbots()
    }
  }, [user])
  
  async function loadChatbots() {
    try {
      setLoading(true)
      const data = await getChatbots()
      setChatbots(data || [])
    } catch (error) {
      console.error('Error loading chatbots:', error)
    } finally {
      setLoading(false)
    }
  }
  
  async function handleCreateChatbot(chatbotData) {
    try {
      const newChatbot = await createChatbot(chatbotData)
      setChatbots([...chatbots, newChatbot])
    } catch (error) {
      console.error('Error creating chatbot:', error)
    }
  }
  
  // Render UI for managing chatbots
  // ...
}
```

### 4. API Client Updates

Update the API client to support the new multi-user endpoints:

```typescript
// src/lib/api.ts
import { supabase } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data?.session?.access_token || ''}`
  }
}

// Profile API
export async function getProfile(userId?: string) {
  const headers = await getAuthHeaders()
  const url = userId ? `${API_URL}/profile?user_id=${userId}` : `${API_URL}/profile`
  
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error('Failed to fetch profile')
  
  return response.json()
}

export async function updateProfile(profileData) {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profileData)
  })
  
  if (!response.ok) throw new Error('Failed to update profile')
  
  return response.json()
}

// Chatbot API
export async function getChatbots() {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${API_URL}/chatbots`, { headers })
  if (!response.ok) throw new Error('Failed to fetch chatbots')
  
  return response.json()
}

export async function createChatbot(chatbotData) {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${API_URL}/chatbots`, {
    method: 'POST',
    headers,
    body: JSON.stringify(chatbotData)
  })
  
  if (!response.ok) throw new Error('Failed to create chatbot')
  
  return response.json()
}

export async function getChatbotBySlug(slug) {
  const response = await fetch(`${API_URL}/chatbots/public/${slug}`)
  if (!response.ok) throw new Error('Failed to fetch chatbot')
  
  return response.json()
}

export async function sendChatMessage(message, chatbotId, visitorId, visitorName) {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      chatbot_id: chatbotId,
      visitor_id: visitorId,
      visitor_name: visitorName
    })
  })
  
  if (!response.ok) throw new Error('Failed to send message')
  
  return response.json()
}

export async function getChatHistory(chatbotId, visitorId, limit = 50) {
  const headers = await getAuthHeaders()
  
  const response = await fetch(
    `${API_URL}/chat/history?chatbot_id=${chatbotId}&visitor_id=${visitorId}&limit=${limit}`,
    { headers }
  )
  
  if (!response.ok) throw new Error('Failed to fetch chat history')
  
  return response.json()
}
```

### 5. Authentication Context

Create an Auth context to manage user state across components:

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getUser } from '@/lib/auth'

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => ({})
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      setLoading(true)
      
      try {
        const { data } = await getUser()
        setUser(data?.user || null)
      } catch (error) {
        console.error('Error checking user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()
    
    // Listen for auth state changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })
    
    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [])
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        return { data, error }
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        return { data, error }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
      }
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for using auth
export function useAuth() {
  return useContext(AuthContext)
}
```

### 6. Public Chatbot Page

Create a public page for accessing a user's chatbot via a unique slug:

```typescript
// src/pages/chat/[slug].tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getChatbotBySlug, sendChatMessage } from '@/lib/api'
import { v4 as uuidv4 } from 'uuid'
import ChatInterface from '@/components/ChatInterface'

export default function PublicChatPage() {
  const router = useRouter()
  const { slug } = router.query
  
  const [chatbot, setChatbot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visitorId, setVisitorId] = useState('')
  
  useEffect(() => {
    // Generate or get a persistent visitor ID
    const storedVisitorId = localStorage.getItem('visitor_id')
    if (storedVisitorId) {
      setVisitorId(storedVisitorId)
    } else {
      const newVisitorId = uuidv4()
      localStorage.setItem('visitor_id', newVisitorId)
      setVisitorId(newVisitorId)
    }
    
    // Only load if slug is available
    if (slug) {
      loadChatbot()
    }
  }, [slug])
  
  async function loadChatbot() {
    try {
      setLoading(true)
      const data = await getChatbotBySlug(slug)
      setChatbot(data)
    } catch (error) {
      console.error('Error loading chatbot:', error)
      setError('Chatbot not found or unavailable')
    } finally {
      setLoading(false)
    }
  }
  
  async function handleSendMessage(message, visitorName) {
    try {
      return await sendChatMessage(message, chatbot.id, visitorId, visitorName)
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }
  
  if (loading) return <div>Loading chatbot...</div>
  if (error) return <div>Error: {error}</div>
  if (!chatbot) return <div>Chatbot not found</div>
  
  return (
    <div>
      <h1>{chatbot.name}</h1>
      <p>{chatbot.description}</p>
      
      <ChatInterface 
        onSendMessage={handleSendMessage} 
        chatbotId={chatbot.id}
        visitorId={visitorId}
      />
    </div>
  )
}
```

### 7. Dashboard Pages

Create a dashboard for users to manage their profiles and chatbots:

```typescript
// src/pages/dashboard/index.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import ChatbotStats from '@/components/ChatbotStats'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])
  
  if (loading) return <div>Loading...</div>
  if (!user) return null // Will be redirected by useEffect
  
  return (
    <DashboardLayout>
      <h1>Dashboard</h1>
      <p>Welcome back, {user.email}</p>
      
      <ChatbotStats />
      
      {/* Other dashboard widgets */}
    </DashboardLayout>
  )
}
```

## Implementation Steps

1. **Authentication Setup**:
   - Set up Supabase client
   - Implement auth context and hooks
   - Create login, signup, and reset password pages

2. **Dashboard Implementation**:
   - Create dashboard layout with navigation
   - Implement protected routes
   - Add profile management page
   - Add chatbot management page

3. **Public Chatbot Pages**:
   - Create page for accessing chatbots via unique slug
   - Implement visitor tracking functionality
   - Build chat interface component

4. **API Integration**:
   - Update API client for multi-user endpoints
   - Add proper authentication header handling
   - Implement error handling

5. **Testing**:
   - Test authentication flow
   - Test profile management
   - Test chatbot creation and configuration
   - Test public chat functionality
   - Test visitor persistence

6. **Deployment**:
   - Update environment variables
   - Deploy frontend changes
   - Test in production environment 