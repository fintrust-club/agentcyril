import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// DELETE /api/documents/[id] - Delete a specific document
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    console.log('Deleting document with ID from route handler:', documentId);
    
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
      console.error('Missing document ID in delete request');
      return NextResponse.json(
        { error: 'Missing document ID' },
        { status: 400 }
      );
    }

    // Verify ownership of the document
    const { data: document, error: fetchError } = await supabaseAuth
      .from('user_documents')
      .select('id, user_id, storage_path')
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
      console.error('Document not found:', documentId);
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
      console.error('Error deleting document from database:', deleteError);
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