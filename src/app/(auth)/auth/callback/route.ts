import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (!code) {
    console.error('No code provided in callback');
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(
        'No code provided in callback'
      )}`
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    if (!session?.user?.email?.endsWith('@snu.edu.in')) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=${encodeURIComponent(
          'Only @snu.edu.in email addresses are allowed'
        )}`
      );
    }

    // Check if user exists in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      // Create profile if it doesn't exist
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.full_name || session.user.email.split('@')[0]
        });

      if (insertError) {
        console.error('Error creating profile:', insertError);
      }
    }

    return NextResponse.redirect(requestUrl.origin + next);
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(
        'An error occurred during sign in'
      )}`
    );
  }
}