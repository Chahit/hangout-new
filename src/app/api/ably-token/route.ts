import Ably from "ably";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
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
    );

    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const client = new Ably.Realtime(process.env.ABLY_API_KEY!);
    const tokenRequestData = await new Promise((resolve, reject) => {
      client.auth.createTokenRequest({
        clientId: session.user.id,
        capability: {
          [`group-*`]: ['publish', 'subscribe', 'presence']
        }
      }).then((tokenRequest) => {
        resolve(tokenRequest);
      }).catch((err) => {
        reject(err);
      });
    });

    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error getting Ably token:', error);
    return new NextResponse('Error getting token', { status: 500 });
  }
}