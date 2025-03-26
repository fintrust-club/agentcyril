import { NextRequest, NextResponse } from 'next/server';

/**
 * API route that proxies signup requests to the backend
 */
export async function POST(request: NextRequest) {
  try {
    // Get environment variables
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    // Parse the request body
    const body = await request.json();
    
    // Forward the request to our backend endpoint
    const response = await fetch(`${backendUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Get the response data
    const data = await response.json();
    
    // If the response is not ok, return the error
    if (!response.ok) {
      console.error('Error from backend signup:', data);
      return NextResponse.json({ detail: data.detail || 'Error creating user' }, { status: response.status });
    }
    
    // Return the successful response
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in signup API route:', error);
    return NextResponse.json(
      { detail: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 