import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Don't parse the files, we'll use formData directly
  },
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // Get the session token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const filePath = formData.get('filePath') as string;
    const userId = formData.get('userId') as string;

    // Validate inputs
    if (!file || !title || !filePath || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the maximum limit of 10MB' },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    // Forward the PDF to the backend for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a form to send to the backend
    const backendFormData = new FormData();
    const backendFile = new File([buffer], file.name, { type: file.type });
    backendFormData.append('file', backendFile);
    backendFormData.append('title', title);
    backendFormData.append('description', description);
    backendFormData.append('filePath', filePath);
    backendFormData.append('userId', userId);

    // Call the backend API
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend processing error:', errorText);
      
      // Try to clean up the uploaded file if processing failed
      try {
        await supabaseAuth.storage.from('documents').remove([filePath]);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file after processing error:', cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Failed to process document on the backend' },
        { status: backendResponse.status }
      );
    }

    const processingResult = await backendResponse.json();

    // If the backend processing was successful, store the document info in Supabase
    const { data: documentData, error: documentError } = await supabaseAuth.from('user_documents').insert([
      {
        user_id: userId,
        title: title,
        description: description || null,
        file_name: file.name,
        file_size: file.size,
        storage_path: filePath,
        mime_type: file.type,
        extracted_text: processingResult.extracted_text,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]).select();

    if (documentError) {
      console.error('Error saving document data:', documentError);
      
      // Try to clean up the stored file if we failed to save the metadata
      try {
        await supabaseAuth.storage.from('documents').remove([filePath]);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
      
      return NextResponse.json(
        { error: documentError.message },
        { status: 500 }
      );
    }

    // Now update the vector database with the permanent document ID
    if (processingResult.vector_db_indexed && documentData && documentData.length > 0) {
      try {
        console.log(`Updating vector DB with permanent ID: ${documentData[0].id} (temp: ${processingResult.temp_id})`);
        
        // Call the backend to update the document ID in the vector database
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/documents/update-vector-db`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            temp_id: processingResult.temp_id,
            permanent_id: documentData[0].id,
            user_id: userId
          }),
        });

        if (!updateResponse.ok) {
          console.warn('Failed to update document ID in vector database, but document was saved');
        } else {
          const updateResult = await updateResponse.json();
          console.log(`Vector DB update successful, updated ${updateResult.updated} document chunks`);
        }
      } catch (updateError) {
        console.error('Error updating document ID in vector database:', updateError);
        // We can continue even if this fails, as the document is still saved in Supabase
      }
    }

    return NextResponse.json(documentData[0]);
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document. Please try again.' },
      { status: 500 }
    );
  }
} 