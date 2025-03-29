import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/documents - List documents for a user
export async function GET(request: Request) {
  try {
    // Get the query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    // Get the session token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];

    // Create authenticated Supabase client
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required user_id parameter' },
        { status: 400 }
      );
    }

    // Query user_documents table
    const { data, error } = await supabaseAuth
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 401 : 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/:id - Delete a document
export async function DELETE(request: Request) {
  try {
    // Get the document ID from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const documentId = pathParts[pathParts.length - 1];
    
    console.log('Deleting document with ID:', documentId);
    
    // Get the session token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];

    // Create authenticated Supabase client
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing document ID' },
        { status: 400 }
      );
    }

    // Verify ownership of the document
    const { data: document, error: fetchError } = await supabaseAuth
      .from('user_documents')
      .select('id, user_id')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      console.error('Error fetching document:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify document ownership' },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabaseAuth
      .from('user_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document. Please try again.' },
      { status: 500 }
    );
  }
} 