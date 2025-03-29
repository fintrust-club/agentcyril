import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

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

    // Create authenticated Supabase client
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const body = await request.json();
    const { user_id, title, description, technologies, image_url, project_url, is_featured } = body;

    if (!user_id || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, title, and description are required' },
        { status: 400 }
      );
    }

    // Ensure technologies is a string to prevent trigger errors
    const sanitizedTechnologies = technologies || '';

    const { data, error } = await supabaseAuth.from('projects').insert([
      {
        user_id,
        title,
        description,
        technologies: sanitizedTechnologies,
        image_url,
        project_url,
        is_featured,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        database_config: {}, // Add empty default
      },
    ]).select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 401 : 500 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create project. Please try again.' },
      { status: 500 }
    );
  }
} 