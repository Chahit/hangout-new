import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  // Auth routes that should be accessible without session
  const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
  const isPublicRoute = req.nextUrl.pathname === "/";
  const isOnboardingRoute = req.nextUrl.pathname === "/onboarding";

  // Always allow these routes to proceed without any checks
  if (isAuthRoute || isPublicRoute || isOnboardingRoute) {
    return res;
  }

  // If user is not signed in and trying to access protected route
  if (!session) {
    const redirectUrl = new URL("/auth", req.url);
    redirectUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If signed in but no profile, redirect to onboarding
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, batch, branch, username')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.batch || !profile.branch || !profile.username) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 