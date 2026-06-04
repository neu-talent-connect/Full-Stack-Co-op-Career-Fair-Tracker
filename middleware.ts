import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — race against a 3 s timeout so a paused/unreachable
  // Supabase instance causes a graceful degradation (no auth) instead of a
  // 504 MIDDLEWARE_INVOCATION_TIMEOUT on Vercel.
  let user = null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
  try {
    const result = await Promise.race([supabase.auth.getUser(), timeout]);
    user = result?.data?.user ?? null;
  } catch {
    // Supabase unreachable — treat as signed out.
  }

  // Gate the app behind login: anyone who is not authenticated is sent to
  // /login. Auth pages and the email-confirmation callback stay public, and
  // API routes are left alone so they can return their own 401s.
  const { pathname } = request.nextUrl;
  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth');
  const isApiPath = pathname.startsWith('/api');

  if (!user && !isPublicPath && !isApiPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If an authenticated user lands on an auth page, send them to the app.
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
